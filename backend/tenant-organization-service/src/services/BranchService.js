const Branch = require('../models/Branch');
const Tenant = require('../models/Tenant');
const TenantAuditLog = require('../models/TenantAuditLog');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class BranchService {
  constructor() {
    this.cacheService = new CacheService();
  }

  async createBranch(tenantId, branchData, createdBy) {
    try {
      // Validate tenant exists and is active
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      if (!tenant.isActive) {
        throw new Error('Cannot create branch for inactive tenant');
      }

      // Check branch limits
      const existingBranches = await Branch.countDocuments({ tenantId });
      if (existingBranches >= tenant.limits.maxBranches) {
        throw new Error(`Branch limit exceeded. Maximum allowed: ${tenant.limits.maxBranches}`);
      }

      // Check if branch code already exists for this tenant
      const existingBranch = await Branch.findOne({ 
        tenantId, 
        branchCode: branchData.branchCode 
      });
      if (existingBranch) {
        throw new Error('Branch code already exists for this tenant');
      }

      // Create branch
      const branch = new Branch({
        ...branchData,
        tenantId,
        auditInfo: {
          createdBy,
          createdAt: new Date()
        }
      });

      await branch.save();

      // Log audit
      await TenantAuditLog.logAction({
        tenantId,
        branchId: branch.branchId,
        action: 'BRANCH_CREATED',
        entityType: 'BRANCH',
        entityId: branch.branchId,
        performedBy: {
          userId: createdBy
        },
        changes: {
          after: branch.toPublicJSON()
        },
        severity: 'MEDIUM'
      });

      logger.info(`Branch created successfully: ${branch.branchId} for tenant: ${tenantId}`);
      return branch.toPublicJSON();

    } catch (error) {
      logger.error('Error creating branch:', error);
      throw error;
    }
  }

  async getBranch(branchId) {
    try {
      // Try cache first
      const cached = await this.cacheService.get(`branch:${branchId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const branch = await Branch.findOne({ branchId });
      if (!branch) {
        throw new Error('Branch not found');
      }

      const branchData = branch.toPublicJSON();
      
      // Cache for 1 hour
      await this.cacheService.set(`branch:${branchId}`, branchData, 3600);
      
      return branchData;

    } catch (error) {
      logger.error('Error getting branch:', error);
      throw error;
    }
  }

  async getTenantBranches(tenantId, includeInactive = false) {
    try {
      // Try cache first
      const cacheKey = `tenant_branches:${tenantId}:${includeInactive}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const query = { tenantId };
      if (!includeInactive) {
        query.status = 'ACTIVE';
      }

      const branches = await Branch.find(query)
        .sort({ branchType: 1, branchName: 1 })
        .lean();

      const branchData = branches.map(branch => {
        delete branch._id;
        delete branch.__v;
        return branch;
      });

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, branchData, 1800);
      
      return branchData;

    } catch (error) {
      logger.error('Error getting tenant branches:', error);
      throw error;
    }
  }

  async updateBranch(branchId, updateData, updatedBy) {
    try {
      const branch = await Branch.findOne({ branchId });
      if (!branch) {
        throw new Error('Branch not found');
      }

      const beforeData = branch.toPublicJSON();
      
      // Update branch
      Object.assign(branch, updateData);
      branch.auditInfo.updatedBy = updatedBy;
      branch.auditInfo.updatedAt = new Date();

      await branch.save();

      // Clear cache
      await this.cacheService.del(`branch:${branchId}`);
      await this.cacheService.del(`tenant_branches:${branch.tenantId}:true`);
      await this.cacheService.del(`tenant_branches:${branch.tenantId}:false`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId: branch.tenantId,
        branchId,
        action: 'BRANCH_UPDATED',
        entityType: 'BRANCH',
        entityId: branchId,
        performedBy: {
          userId: updatedBy
        },
        changes: {
          before: beforeData,
          after: branch.toPublicJSON(),
          fields: Object.keys(updateData)
        },
        severity: 'MEDIUM'
      });

      logger.info(`Branch updated successfully: ${branchId}`);
      return branch.toPublicJSON();

    } catch (error) {
      logger.error('Error updating branch:', error);
      throw error;
    }
  }

  async activateBranch(branchId, activatedBy) {
    try {
      const branch = await Branch.findOne({ branchId });
      if (!branch) {
        throw new Error('Branch not found');
      }

      await branch.activate(activatedBy);
      
      // Clear cache
      await this.cacheService.del(`branch:${branchId}`);
      await this.cacheService.del(`tenant_branches:${branch.tenantId}:true`);
      await this.cacheService.del(`tenant_branches:${branch.tenantId}:false`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId: branch.tenantId,
        branchId,
        action: 'BRANCH_ACTIVATED',
        entityType: 'BRANCH',
        entityId: branchId,
        performedBy: {
          userId: activatedBy
        },
        severity: 'HIGH'
      });

      logger.info(`Branch activated successfully: ${branchId}`);
      return branch.toPublicJSON();

    } catch (error) {
      logger.error('Error activating branch:', error);
      throw error;
    }
  }

  async suspendBranch(branchId, suspendedBy, reason) {
    try {
      const branch = await Branch.findOne({ branchId });
      if (!branch) {
        throw new Error('Branch not found');
      }

      await branch.suspend(suspendedBy, reason);
      
      // Clear cache
      await this.cacheService.del(`branch:${branchId}`);
      await this.cacheService.del(`tenant_branches:${branch.tenantId}:true`);
      await this.cacheService.del(`tenant_branches:${branch.tenantId}:false`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId: branch.tenantId,
        branchId,
        action: 'BRANCH_SUSPENDED',
        entityType: 'BRANCH',
        entityId: branchId,
        performedBy: {
          userId: suspendedBy
        },
        changes: {
          after: { reason }
        },
        severity: 'CRITICAL'
      });

      logger.warn(`Branch suspended: ${branchId}, Reason: ${reason}`);
      return branch.toPublicJSON();

    } catch (error) {
      logger.error('Error suspending branch:', error);
      throw error;
    }
  }

  async validateBranch(branchId, tenantId = null) {
    try {
      const branch = await this.getBranch(branchId);
      
      // If tenantId provided, validate it matches
      if (tenantId && branch.tenantId !== tenantId) {
        return {
          isValid: false,
          status: 'TENANT_MISMATCH',
          branchId,
          error: 'Branch does not belong to specified tenant'
        };
      }
      
      return {
        isValid: branch.isActive,
        status: branch.status,
        branchId: branch.branchId,
        tenantId: branch.tenantId,
        branchName: branch.branchName
      };

    } catch (error) {
      return {
        isValid: false,
        status: 'NOT_FOUND',
        branchId,
        error: error.message
      };
    }
  }

  async assignBranchAdmin(branchId, adminData, assignedBy) {
    try {
      const branch = await Branch.findOne({ branchId });
      if (!branch) {
        throw new Error('Branch not found');
      }

      const beforeAdmin = branch.branchAdmin;
      
      branch.branchAdmin = {
        ...adminData,
        assignedAt: new Date()
      };
      branch.auditInfo.updatedBy = assignedBy;
      branch.auditInfo.updatedAt = new Date();

      await branch.save();

      // Clear cache
      await this.cacheService.del(`branch:${branchId}`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId: branch.tenantId,
        branchId,
        action: 'ADMIN_ASSIGNED',
        entityType: 'BRANCH',
        entityId: branchId,
        performedBy: {
          userId: assignedBy
        },
        changes: {
          before: beforeAdmin,
          after: branch.branchAdmin
        },
        severity: 'HIGH'
      });

      logger.info(`Branch admin assigned: ${branchId} -> ${adminData.userId}`);
      return branch.toPublicJSON();

    } catch (error) {
      logger.error('Error assigning branch admin:', error);
      throw error;
    }
  }

  async addDepartment(branchId, departmentData, addedBy) {
    try {
      const branch = await Branch.findOne({ branchId });
      if (!branch) {
        throw new Error('Branch not found');
      }

      // Check if department code already exists
      const existingDept = branch.departments.find(
        dept => dept.code === departmentData.code
      );
      if (existingDept) {
        throw new Error('Department code already exists in this branch');
      }

      await branch.addDepartment(departmentData);

      // Clear cache
      await this.cacheService.del(`branch:${branchId}`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId: branch.tenantId,
        branchId,
        action: 'BRANCH_UPDATED',
        entityType: 'BRANCH',
        entityId: branchId,
        performedBy: {
          userId: addedBy
        },
        changes: {
          after: { department: departmentData }
        },
        severity: 'MEDIUM'
      });

      logger.info(`Department added to branch: ${branchId}`);
      return branch.toPublicJSON();

    } catch (error) {
      logger.error('Error adding department:', error);
      throw error;
    }
  }

  async addRoom(branchId, departmentId, roomData, addedBy) {
    try {
      const branch = await Branch.findOne({ branchId });
      if (!branch) {
        throw new Error('Branch not found');
      }

      await branch.addRoom(departmentId, roomData);

      // Clear cache
      await this.cacheService.del(`branch:${branchId}`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId: branch.tenantId,
        branchId,
        action: 'BRANCH_UPDATED',
        entityType: 'BRANCH',
        entityId: branchId,
        performedBy: {
          userId: addedBy
        },
        changes: {
          after: { room: roomData, departmentId }
        },
        severity: 'MEDIUM'
      });

      logger.info(`Room added to branch: ${branchId}, department: ${departmentId}`);
      return branch.toPublicJSON();

    } catch (error) {
      logger.error('Error adding room:', error);
      throw error;
    }
  }

  async getBranchWorkingHours(branchId) {
    try {
      const branch = await this.getBranch(branchId);
      return {
        branchId: branch.branchId,
        timezone: branch.operationalInfo.timezone,
        workingHours: branch.operationalInfo.workingHours,
        holidays: branch.operationalInfo.holidays
      };
    } catch (error) {
      logger.error('Error getting branch working hours:', error);
      throw error;
    }
  }

  async searchBranches(tenantId, searchQuery, limit = 50, skip = 0) {
    try {
      const query = {
        tenantId,
        $or: [
          { branchName: { $regex: searchQuery, $options: 'i' } },
          { branchCode: { $regex: searchQuery, $options: 'i' } },
          { 'address.city': { $regex: searchQuery, $options: 'i' } },
          { 'address.state': { $regex: searchQuery, $options: 'i' } }
        ]
      };

      const branches = await Branch.find(query)
        .sort({ branchName: 1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return branches.map(branch => {
        delete branch._id;
        delete branch.__v;
        return branch;
      });

    } catch (error) {
      logger.error('Error searching branches:', error);
      throw error;
    }
  }
}

module.exports = BranchService;