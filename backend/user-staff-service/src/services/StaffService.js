const Staff = require('../models/Staff');
const StaffRole = require('../models/StaffRole');
const StaffAuditLog = require('../models/StaffAuditLog');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');
const axios = require('axios');

class StaffService {
  constructor() {
    this.cacheService = new CacheService();
    this.authServiceUrl = process.env.AUTH_IDENTITY_SERVICE_URL;
    this.tenantServiceUrl = process.env.TENANT_ORGANIZATION_SERVICE_URL;
  }

  // Staff CRUD Operations
  async createStaff(staffData, createdBy) {
    try {
      logger.info('Creating new staff member', { 
        email: staffData.personalInfo.email,
        tenantId: staffData.tenantId,
        createdBy 
      });

      // Validate tenant and branch exist
      await this.validateTenantAndBranch(staffData.tenantId, staffData.branchId);

      // Check if staff with same email already exists in tenant
      const existingStaff = await Staff.findOne({
        tenantId: staffData.tenantId,
        'personalInfo.email': staffData.personalInfo.email
      });

      if (existingStaff) {
        throw new Error('Staff member with this email already exists in the organization');
      }

      // Generate employee ID
      const staffCount = await Staff.countDocuments({ tenantId: staffData.tenantId });
      const employeeId = Staff.generateEmployeeId(staffData.tenantId, staffCount + 1);

      // Create auth identity first
      const authUser = await this.createAuthIdentity({
        email: staffData.personalInfo.email,
        firstName: staffData.personalInfo.firstName,
        lastName: staffData.personalInfo.lastName,
        tenantId: staffData.tenantId,
        roles: staffData.roles || []
      });

      // Create staff profile
      const staff = new Staff({
        ...staffData,
        userAuthId: authUser.userId,
        employmentInfo: {
          ...staffData.employmentInfo,
          employeeId
        },
        auditInfo: {
          createdBy,
          createdAt: new Date()
        }
      });

      await staff.save();

      // Assign roles if provided
      if (staffData.roles && staffData.roles.length > 0) {
        for (const roleData of staffData.roles) {
          await this.assignRole(staff.staffId, roleData.roleId, createdBy);
        }
      }

      // Cache the staff data
      await this.cacheService.setStaff(staff.staffId, staff.toPublicJSON());

      // Invalidate related caches
      await this.cacheService.invalidateTenantCache(staffData.tenantId);
      await this.cacheService.invalidateBranchCache(staffData.tenantId, staffData.branchId);

      // Log audit
      await StaffAuditLog.logStaffCreation(staff, {
        userId: createdBy,
        userEmail: 'system',
        userName: 'System',
        userRole: 'SYSTEM'
      });

      logger.logStaffOperation('CREATE', staff.staffId, createdBy, {
        tenantId: staffData.tenantId,
        branchId: staffData.branchId,
        email: staffData.personalInfo.email
      });

      return staff.toPublicJSON();

    } catch (error) {
      logger.error('Error creating staff member:', error, { 
        email: staffData.personalInfo?.email,
        tenantId: staffData.tenantId 
      });
      throw error;
    }
  }

  async getStaff(staffId, requestingUser) {
    try {
      // Check cache first
      let staff = await this.cacheService.getStaff(staffId);
      
      if (!staff) {
        const staffDoc = await Staff.findOne({ staffId });
        if (!staffDoc) {
          throw new Error('Staff member not found');
        }

        // Validate access permissions
        await this.validateStaffAccess(staffDoc, requestingUser);

        staff = staffDoc.toPublicJSON();
        await this.cacheService.setStaff(staffId, staff);
      }

      return staff;

    } catch (error) {
      logger.error('Error retrieving staff member:', error, { staffId });
      throw error;
    }
  }

  async getStaffByAuthId(userAuthId) {
    try {
      const staffDoc = await Staff.findOne({ userAuthId });
      if (!staffDoc) {
        throw new Error('Staff member not found');
      }

      // Check if staff is active
      if (staffDoc.employmentInfo.employmentStatus !== 'ACTIVE') {
        throw new Error('Staff member is not active');
      }

      return staffDoc.toPublicJSON();

    } catch (error) {
      logger.error('Error retrieving staff member by auth ID:', error, { userAuthId });
      throw error;
    }
  }

  async updateStaff(staffId, updateData, updatedBy) {
    try {
      const staff = await Staff.findOne({ staffId });
      if (!staff) {
        throw new Error('Staff member not found');
      }

      const oldData = staff.toObject();

      // Update staff data
      Object.keys(updateData).forEach(key => {
        if (key !== 'staffId' && key !== 'userAuthId' && key !== 'auditInfo') {
          staff[key] = updateData[key];
        }
      });

      staff.auditInfo.updatedBy = updatedBy;
      staff.auditInfo.updatedAt = new Date();

      await staff.save();

      // Update cache
      await this.cacheService.setStaff(staffId, staff.toPublicJSON());
      await this.cacheService.invalidateStaffCache(staffId);

      // Log audit
      await StaffAuditLog.logStaffUpdate(staffId, oldData, staff.toObject(), {
        userId: updatedBy,
        userEmail: 'system',
        userName: 'System',
        userRole: 'SYSTEM'
      });

      logger.logStaffOperation('UPDATE', staffId, updatedBy);

      return staff.toPublicJSON();

    } catch (error) {
      logger.error('Error updating staff member:', error, { staffId });
      throw error;
    }
  }

  async deactivateStaff(staffId, reason, deactivatedBy) {
    try {
      const staff = await Staff.findOne({ staffId });
      if (!staff) {
        throw new Error('Staff member not found');
      }

      if (staff.employmentInfo.employmentStatus !== 'ACTIVE') {
        throw new Error('Staff member is not currently active');
      }

      staff.deactivate(reason, deactivatedBy);
      await staff.save();

      // Deactivate auth identity
      await this.deactivateAuthIdentity(staff.userAuthId);

      // Update cache
      await this.cacheService.invalidateStaffCache(staffId);

      // Log audit
      await StaffAuditLog.logStaffDeactivation(staff, reason, {
        userId: deactivatedBy,
        userEmail: 'system',
        userName: 'System',
        userRole: 'SYSTEM'
      });

      logger.logStaffOperation('DEACTIVATE', staffId, deactivatedBy, { reason });

      return staff.toPublicJSON();

    } catch (error) {
      logger.error('Error deactivating staff member:', error, { staffId });
      throw error;
    }
  }

  async activateStaff(staffId, activatedBy) {
    try {
      const staff = await Staff.findOne({ staffId });
      if (!staff) {
        throw new Error('Staff member not found');
      }

      if (staff.employmentInfo.employmentStatus === 'ACTIVE') {
        throw new Error('Staff member is already active');
      }

      staff.activate();
      await staff.save();

      // Activate auth identity
      await this.activateAuthIdentity(staff.userAuthId);

      // Update cache
      await this.cacheService.invalidateStaffCache(staffId);

      // Log audit
      await StaffAuditLog.logAction({
        tenantId: staff.tenantId,
        branchId: staff.branchId,
        entityType: 'STAFF',
        entityId: staffId,
        action: 'STAFF_ACTIVATED',
        performedBy: {
          userId: activatedBy,
          userEmail: 'system',
          userName: 'System',
          userRole: 'SYSTEM'
        },
        targetStaff: {
          staffId: staff.staffId,
          staffName: staff.fullName,
          staffEmail: staff.personalInfo.email
        }
      });

      logger.logStaffOperation('ACTIVATE', staffId, activatedBy);

      return staff.toPublicJSON();

    } catch (error) {
      logger.error('Error activating staff member:', error, { staffId });
      throw error;
    }
  }

  // Role Management
  async assignRole(staffId, roleId, assignedBy) {
    try {
      const staff = await Staff.findOne({ staffId });
      if (!staff) {
        throw new Error('Staff member not found');
      }

      const role = await StaffRole.findOne({ roleId, isActive: true });
      if (!role) {
        throw new Error('Role not found or inactive');
      }

      // Check if role is already assigned
      if (staff.hasRole(role.roleName)) {
        throw new Error(`Role ${role.roleName} is already assigned to this staff member`);
      }

      // Validate role constraints
      await this.validateRoleConstraints(role, staff.tenantId, staff.branchId);

      // Assign role
      staff.assignRole(roleId, role.roleName, assignedBy);
      await staff.save();

      // Invalidate tokens in auth service (critical for security)
      await this.invalidateAuthTokens(staff.userAuthId);

      // Update cache
      await this.cacheService.invalidateStaffCache(staffId);
      await this.cacheService.delStaffPermissions(staffId);

      // Log audit
      await StaffAuditLog.logRoleAssignment(staff, role, {
        userId: assignedBy,
        userEmail: 'system',
        userName: 'System',
        userRole: 'SYSTEM'
      });

      logger.logRoleOperation('ASSIGN', staffId, [role.roleName], assignedBy);

      return staff.toPublicJSON();

    } catch (error) {
      logger.error('Error assigning role:', error, { staffId, roleId });
      throw error;
    }
  }

  async removeRole(staffId, roleId, removedBy) {
    try {
      const staff = await Staff.findOne({ staffId });
      if (!staff) {
        throw new Error('Staff member not found');
      }

      const role = staff.roles.find(r => r.roleId === roleId);
      if (!role || !role.isActive) {
        throw new Error('Role not found or not assigned to this staff member');
      }

      // Remove role
      staff.removeRole(roleId);
      await staff.save();

      // Invalidate tokens in auth service (critical for security)
      await this.invalidateAuthTokens(staff.userAuthId);

      // Update cache
      await this.cacheService.invalidateStaffCache(staffId);
      await this.cacheService.delStaffPermissions(staffId);

      // Log audit
      await StaffAuditLog.logAction({
        tenantId: staff.tenantId,
        branchId: staff.branchId,
        entityType: 'ROLE',
        entityId: roleId,
        action: 'ROLE_REMOVED',
        performedBy: {
          userId: removedBy,
          userEmail: 'system',
          userName: 'System',
          userRole: 'SYSTEM'
        },
        targetStaff: {
          staffId: staff.staffId,
          staffName: staff.fullName,
          staffEmail: staff.personalInfo.email
        }
      });

      logger.logRoleOperation('REMOVE', staffId, [role.roleName], removedBy);

      return staff.toPublicJSON();

    } catch (error) {
      logger.error('Error removing role:', error, { staffId, roleId });
      throw error;
    }
  }

  // Query Methods
  async getStaffByTenant(tenantId, options = {}) {
    try {
      // Check cache first
      const cached = await this.cacheService.getStaffList(tenantId, options.branchId, options);
      if (cached) {
        return cached;
      }

      const staff = await Staff.findByTenant(tenantId, options);
      const result = staff.map(s => s.toMinimalJSON());

      // Cache result
      await this.cacheService.setStaffList(tenantId, options.branchId, options, result);

      return result;

    } catch (error) {
      logger.error('Error retrieving staff by tenant:', error, { tenantId, options });
      throw error;
    }
  }

  async getStaffByRole(roleName, tenantId, branchId = null) {
    try {
      // Check cache first
      const cached = await this.cacheService.getStaffByRole(roleName, tenantId, branchId);
      if (cached) {
        return cached;
      }

      const staff = await Staff.findByRole(roleName, tenantId, branchId);
      const result = staff.map(s => s.toMinimalJSON());

      // Cache result
      await this.cacheService.setStaffByRole(roleName, tenantId, branchId, result);

      return result;

    } catch (error) {
      logger.error('Error retrieving staff by role:', error, { roleName, tenantId, branchId });
      throw error;
    }
  }

  async transferStaff(staffId, newBranchId, transferredBy, reason = '') {
    try {
      const staff = await Staff.findOne({ staffId });
      if (!staff) {
        throw new Error('Staff member not found');
      }

      const oldBranchId = staff.branchId;

      // Validate new branch exists and belongs to same tenant
      await this.validateTenantAndBranch(staff.tenantId, newBranchId);

      // Update branch
      staff.branchId = newBranchId;
      staff.auditInfo.updatedBy = transferredBy;
      staff.auditInfo.updatedAt = new Date();

      await staff.save();

      // Update cache
      await this.cacheService.invalidateStaffCache(staffId);
      await this.cacheService.invalidateBranchCache(staff.tenantId, oldBranchId);
      await this.cacheService.invalidateBranchCache(staff.tenantId, newBranchId);

      // Log audit
      await StaffAuditLog.logAction({
        tenantId: staff.tenantId,
        branchId: newBranchId,
        entityType: 'STAFF',
        entityId: staffId,
        action: 'STAFF_TRANSFERRED',
        performedBy: {
          userId: transferredBy,
          userEmail: 'system',
          userName: 'System',
          userRole: 'SYSTEM'
        },
        targetStaff: {
          staffId: staff.staffId,
          staffName: staff.fullName,
          staffEmail: staff.personalInfo.email
        },
        changes: {
          before: { branchId: oldBranchId },
          after: { branchId: newBranchId }
        },
        metadata: { reason }
      });

      logger.logStaffOperation('TRANSFER', staffId, transferredBy, {
        oldBranchId,
        newBranchId,
        reason
      });

      return staff.toPublicJSON();

    } catch (error) {
      logger.error('Error transferring staff:', error, { staffId, newBranchId });
      throw error;
    }
  }

  // External Service Integration
  async createAuthIdentity(userData) {
    try {
      const response = await axios.post(`${this.authServiceUrl}/auth/register`, {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        tenantId: userData.tenantId,
        roles: userData.roles.map(r => r.roleName || r),
        isStaff: true
      });

      return response.data.user;
    } catch (error) {
      logger.error('Failed to create auth identity:', error);
      throw new Error('Failed to create authentication account');
    }
  }

  async updateAuthRoles(userAuthId, roles) {
    try {
      await axios.patch(`${this.authServiceUrl}/auth/users/${userAuthId}/roles`, {
        roles
      });
    } catch (error) {
      logger.error('Failed to update auth roles:', error);
      // Don't throw error as this is not critical
    }
  }

  async invalidateAuthTokens(userAuthId) {
    try {
      const response = await axios.patch(`${this.authServiceUrl}/auth/users/${userAuthId}/invalidate-tokens`);
      return response.data;
    } catch (error) {
      logger.error('Failed to invalidate auth tokens:', error);
      throw new Error('Critical: Failed to invalidate authentication tokens');
    }
  }

  async deactivateAuthIdentity(userAuthId) {
    try {
      const response = await axios.patch(`${this.authServiceUrl}/auth/users/${userAuthId}/deactivate`);
      return response.data;
    } catch (error) {
      logger.error('Failed to deactivate auth identity:', error);
      throw new Error('Critical: Failed to deactivate authentication account');
    }
  }

  async activateAuthIdentity(userAuthId) {
    try {
      const response = await axios.patch(`${this.authServiceUrl}/auth/users/${userAuthId}/activate`);
      return response.data;
    } catch (error) {
      logger.error('Failed to activate auth identity:', error);
      throw new Error('Critical: Failed to activate authentication account');
    }
  }

  // Validation Methods
  async validateTenantAndBranch(tenantId, branchId) {
    try {
      const response = await axios.get(`${this.tenantServiceUrl}/branches/${branchId}`, {
        params: { tenantId }
      });

      if (response.data.tenantId !== tenantId) {
        throw new Error('Branch does not belong to the specified tenant');
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to validate tenant and branch:', error);
      throw new Error('Invalid tenant or branch');
    }
  }

  async validateStaffAccess(staff, requestingUser) {
    // Implement access control logic based on requesting user's role and tenant
    if (requestingUser.tenantId !== staff.tenantId) {
      if (!requestingUser.roles.includes('SAAS_ADMIN')) {
        throw new Error('Access denied: Different tenant');
      }
    }

    if (requestingUser.branchId !== staff.branchId) {
      if (!requestingUser.roles.some(role => ['CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(role))) {
        throw new Error('Access denied: Different branch');
      }
    }
  }

  async validateRoleConstraints(role, tenantId, branchId) {
    if (role.constraints.maxPerBranch) {
      const count = await Staff.countDocuments({
        tenantId,
        branchId,
        'roles.roleId': role.roleId,
        'roles.isActive': true,
        'employmentInfo.employmentStatus': 'ACTIVE'
      });

      if (count >= role.constraints.maxPerBranch) {
        throw new Error(`Maximum ${role.constraints.maxPerBranch} ${role.roleName} allowed per branch`);
      }
    }

    if (role.constraints.maxPerTenant) {
      const count = await Staff.countDocuments({
        tenantId,
        'roles.roleId': role.roleId,
        'roles.isActive': true,
        'employmentInfo.employmentStatus': 'ACTIVE'
      });

      if (count >= role.constraints.maxPerTenant) {
        throw new Error(`Maximum ${role.constraints.maxPerTenant} ${role.roleName} allowed per tenant`);
      }
    }
  }
}

module.exports = StaffService;