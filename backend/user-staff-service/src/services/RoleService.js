const StaffRole = require('../models/StaffRole');
const Staff = require('../models/Staff');
const StaffAuditLog = require('../models/StaffAuditLog');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class RoleService {
  constructor() {
    this.cacheService = new CacheService();
  }

  // Role CRUD Operations
  async createRole(roleData, createdBy) {
    try {
      logger.info('Creating new role', { 
        roleName: roleData.roleName,
        scope: roleData.scope,
        createdBy 
      });

      // Check if role already exists
      const existingRole = await StaffRole.findOne({ 
        roleName: roleData.roleName.toUpperCase() 
      });

      if (existingRole) {
        throw new Error(`Role ${roleData.roleName} already exists`);
      }

      // Create role
      const role = new StaffRole({
        ...roleData,
        roleName: roleData.roleName.toUpperCase(),
        auditInfo: {
          createdBy,
          createdAt: new Date()
        }
      });

      await role.save();

      // Cache the role
      await this.cacheService.setRole(role.roleId, role.toPublicJSON());

      // Invalidate role list cache
      await this.cacheService.delPattern('role_list:*');

      // Log audit
      await StaffAuditLog.logAction({
        tenantId: 'SYSTEM',
        entityType: 'ROLE',
        entityId: role.roleId,
        action: 'ROLE_CREATED',
        performedBy: {
          userId: createdBy,
          userEmail: 'system',
          userName: 'System',
          userRole: 'SYSTEM'
        },
        changes: {
          after: role.toPublicJSON()
        },
        metadata: {
          severity: 'MEDIUM',
          category: 'ADMINISTRATIVE'
        }
      });

      logger.logRoleOperation('CREATE', null, [role.roleName], createdBy);

      return role.toPublicJSON();

    } catch (error) {
      logger.error('Error creating role:', error, { roleName: roleData.roleName });
      throw error;
    }
  }

  async getRole(roleId) {
    try {
      // Check cache first
      let role = await this.cacheService.getRole(roleId);
      
      if (!role) {
        const roleDoc = await StaffRole.findOne({ roleId, isActive: true });
        if (!roleDoc) {
          throw new Error('Role not found');
        }

        role = roleDoc.toPublicJSON();
        await this.cacheService.setRole(roleId, role);
      }

      return role;

    } catch (error) {
      logger.error('Error retrieving role:', error, { roleId });
      throw error;
    }
  }

  async getRoleByName(roleName) {
    try {
      const role = await StaffRole.getByName(roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      return role.toPublicJSON();

    } catch (error) {
      logger.error('Error retrieving role by name:', error, { roleName });
      throw error;
    }
  }

  async getAllRoles(scope = null) {
    try {
      // Check cache first
      let roles = await this.cacheService.getRoleList(scope);
      
      if (!roles) {
        let query = { isActive: true };
        if (scope) {
          query.scope = scope;
        }

        const rolesDocs = await StaffRole.find(query).sort({ level: -1, roleName: 1 });
        roles = rolesDocs.map(role => role.toPublicJSON());

        await this.cacheService.setRoleList(scope, roles);
      }

      return roles;

    } catch (error) {
      logger.error('Error retrieving roles:', error, { scope });
      throw error;
    }
  }

  async updateRole(roleId, updateData, updatedBy) {
    try {
      const role = await StaffRole.findOne({ roleId });
      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystemRole) {
        throw new Error('System roles cannot be modified');
      }

      const oldData = role.toObject();

      // Update role data
      Object.keys(updateData).forEach(key => {
        if (key !== 'roleId' && key !== 'roleName' && key !== 'isSystemRole' && key !== 'auditInfo') {
          role[key] = updateData[key];
        }
      });

      role.auditInfo.updatedBy = updatedBy;
      role.auditInfo.updatedAt = new Date();

      await role.save();

      // Update cache
      await this.cacheService.setRole(roleId, role.toPublicJSON());
      await this.cacheService.invalidateRoleCache(roleId);

      // Log audit
      await StaffAuditLog.logAction({
        tenantId: 'SYSTEM',
        entityType: 'ROLE',
        entityId: roleId,
        action: 'ROLE_UPDATED',
        performedBy: {
          userId: updatedBy,
          userEmail: 'system',
          userName: 'System',
          userRole: 'SYSTEM'
        },
        changes: {
          before: oldData,
          after: role.toObject()
        },
        metadata: {
          severity: 'MEDIUM',
          category: 'ADMINISTRATIVE'
        }
      });

      logger.logRoleOperation('UPDATE', null, [role.roleName], updatedBy);

      return role.toPublicJSON();

    } catch (error) {
      logger.error('Error updating role:', error, { roleId });
      throw error;
    }
  }

  async deleteRole(roleId, deletedBy) {
    try {
      const role = await StaffRole.findOne({ roleId });
      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystemRole) {
        throw new Error('System roles cannot be deleted');
      }

      // Check if role is assigned to any staff
      const staffCount = await Staff.countDocuments({
        'roles.roleId': roleId,
        'roles.isActive': true
      });

      if (staffCount > 0) {
        throw new Error(`Cannot delete role. It is assigned to ${staffCount} staff members.`);
      }

      // Soft delete
      role.isActive = false;
      role.auditInfo.updatedBy = deletedBy;
      role.auditInfo.updatedAt = new Date();

      await role.save();

      // Update cache
      await this.cacheService.invalidateRoleCache(roleId);

      // Log audit
      await StaffAuditLog.logAction({
        tenantId: 'SYSTEM',
        entityType: 'ROLE',
        entityId: roleId,
        action: 'ROLE_DELETED',
        performedBy: {
          userId: deletedBy,
          userEmail: 'system',
          userName: 'System',
          userRole: 'SYSTEM'
        },
        changes: {
          before: { isActive: true },
          after: { isActive: false }
        },
        metadata: {
          severity: 'HIGH',
          category: 'ADMINISTRATIVE'
        }
      });

      logger.logRoleOperation('DELETE', null, [role.roleName], deletedBy);

      return { success: true, message: 'Role deleted successfully' };

    } catch (error) {
      logger.error('Error deleting role:', error, { roleId });
      throw error;
    }
  }

  // Permission Management
  async addPermission(roleId, permission, addedBy) {
    try {
      const role = await StaffRole.findOne({ roleId });
      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystemRole) {
        throw new Error('System role permissions cannot be modified');
      }

      // Check if permission already exists
      const existingPermission = role.permissions.find(p => 
        p.resource === permission.resource && 
        JSON.stringify(p.actions.sort()) === JSON.stringify(permission.actions.sort())
      );

      if (existingPermission) {
        throw new Error('Permission already exists for this role');
      }

      role.permissions.push(permission);
      role.auditInfo.updatedBy = addedBy;
      role.auditInfo.updatedAt = new Date();

      await role.save();

      // Update cache
      await this.cacheService.invalidateRoleCache(roleId);

      // Log audit
      await StaffAuditLog.logAction({
        tenantId: 'SYSTEM',
        entityType: 'PERMISSION',
        entityId: roleId,
        action: 'PERMISSION_GRANTED',
        performedBy: {
          userId: addedBy,
          userEmail: 'system',
          userName: 'System',
          userRole: 'SYSTEM'
        },
        changes: {
          after: permission
        },
        metadata: {
          severity: 'MEDIUM',
          category: 'SECURITY'
        }
      });

      logger.info('Permission added to role', { roleId, permission, addedBy });

      return role.toPublicJSON();

    } catch (error) {
      logger.error('Error adding permission:', error, { roleId, permission });
      throw error;
    }
  }

  async removePermission(roleId, resource, actions, removedBy) {
    try {
      const role = await StaffRole.findOne({ roleId });
      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystemRole) {
        throw new Error('System role permissions cannot be modified');
      }

      // Find and remove permission
      const permissionIndex = role.permissions.findIndex(p => 
        p.resource === resource && 
        JSON.stringify(p.actions.sort()) === JSON.stringify(actions.sort())
      );

      if (permissionIndex === -1) {
        throw new Error('Permission not found');
      }

      const removedPermission = role.permissions[permissionIndex];
      role.permissions.splice(permissionIndex, 1);

      role.auditInfo.updatedBy = removedBy;
      role.auditInfo.updatedAt = new Date();

      await role.save();

      // Update cache
      await this.cacheService.invalidateRoleCache(roleId);

      // Log audit
      await StaffAuditLog.logAction({
        tenantId: 'SYSTEM',
        entityType: 'PERMISSION',
        entityId: roleId,
        action: 'PERMISSION_REVOKED',
        performedBy: {
          userId: removedBy,
          userEmail: 'system',
          userName: 'System',
          userRole: 'SYSTEM'
        },
        changes: {
          before: removedPermission
        },
        metadata: {
          severity: 'MEDIUM',
          category: 'SECURITY'
        }
      });

      logger.info('Permission removed from role', { roleId, resource, actions, removedBy });

      return role.toPublicJSON();

    } catch (error) {
      logger.error('Error removing permission:', error, { roleId, resource, actions });
      throw error;
    }
  }

  // Role Hierarchy and Constraints
  async getRoleHierarchy() {
    try {
      const roles = await StaffRole.getHierarchy();
      return roles.map(role => ({
        roleId: role.roleId,
        roleName: role.roleName,
        displayName: role.displayName,
        level: role.level,
        scope: role.scope
      }));

    } catch (error) {
      logger.error('Error retrieving role hierarchy:', error);
      throw error;
    }
  }

  async getAssignableRoles(assignerRoleId) {
    try {
      const roles = await StaffRole.getAssignableRoles(assignerRoleId);
      return roles.map(role => role.toPublicJSON());

    } catch (error) {
      logger.error('Error retrieving assignable roles:', error, { assignerRoleId });
      throw error;
    }
  }

  async validateRoleAssignment(assignerRoleId, targetRoleId) {
    try {
      const assignerRole = await StaffRole.findOne({ roleId: assignerRoleId });
      const targetRole = await StaffRole.findOne({ roleId: targetRoleId });

      if (!assignerRole || !targetRole) {
        throw new Error('One or both roles not found');
      }

      // Check if assigner can assign this role
      if (!assignerRole.canAssignRole(targetRoleId)) {
        throw new Error(`Role ${assignerRole.roleName} cannot assign role ${targetRole.roleName}`);
      }

      // Check role hierarchy
      if (targetRole.level >= assignerRole.level) {
        throw new Error('Cannot assign a role of equal or higher level');
      }

      return true;

    } catch (error) {
      logger.error('Role assignment validation failed:', error, { assignerRoleId, targetRoleId });
      throw error;
    }
  }

  // Role Statistics and Analytics
  async getRoleStatistics(tenantId = null) {
    try {
      const pipeline = [
        {
          $match: {
            'employmentInfo.employmentStatus': 'ACTIVE',
            ...(tenantId && { tenantId })
          }
        },
        {
          $unwind: '$roles'
        },
        {
          $match: {
            'roles.isActive': true
          }
        },
        {
          $group: {
            _id: '$roles.roleName',
            count: { $sum: 1 },
            staff: {
              $push: {
                staffId: '$staffId',
                name: { $concat: ['$personalInfo.firstName', ' ', '$personalInfo.lastName'] },
                branchId: '$branchId'
              }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const stats = await Staff.aggregate(pipeline);

      return stats.map(stat => ({
        roleName: stat._id,
        count: stat.count,
        staff: stat.staff
      }));

    } catch (error) {
      logger.error('Error retrieving role statistics:', error, { tenantId });
      throw error;
    }
  }

  async getRoleDistribution(tenantId, branchId = null) {
    try {
      const matchStage = {
        tenantId,
        'employmentInfo.employmentStatus': 'ACTIVE',
        ...(branchId && { branchId })
      };

      const pipeline = [
        { $match: matchStage },
        { $unwind: '$roles' },
        { $match: { 'roles.isActive': true } },
        {
          $group: {
            _id: {
              roleName: '$roles.roleName',
              branchId: '$branchId'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.roleName',
            totalCount: { $sum: '$count' },
            branches: {
              $push: {
                branchId: '$_id.branchId',
                count: '$count'
              }
            }
          }
        },
        { $sort: { totalCount: -1 } }
      ];

      const distribution = await Staff.aggregate(pipeline);

      return distribution.map(item => ({
        roleName: item._id,
        totalCount: item.totalCount,
        branchDistribution: item.branches
      }));

    } catch (error) {
      logger.error('Error retrieving role distribution:', error, { tenantId, branchId });
      throw error;
    }
  }

  // System Role Initialization
  async initializeSystemRoles() {
    try {
      logger.info('Initializing system roles...');

      const systemRoles = [
        {
          roleName: 'SAAS_ADMIN',
          displayName: 'SaaS Administrator',
          description: 'Full system access across all tenants',
          scope: 'GLOBAL',
          level: 10,
          permissions: [
            { resource: 'SYSTEM', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
            { resource: 'STAFF', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
            { resource: 'AUDIT', actions: ['READ', 'EXPORT'] }
          ],
          constraints: {
            maxPerTenant: 2,
            canManageTenants: true,
            canManageBranches: true,
            canAssignRoles: ['CENTRAL_ADMIN', 'BRANCH_ADMIN']
          },
          isSystemRole: true
        },
        {
          roleName: 'CENTRAL_ADMIN',
          displayName: 'Central Administrator',
          description: 'Full access within tenant organization',
          scope: 'TENANT',
          level: 9,
          permissions: [
            { resource: 'STAFF', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
            { resource: 'SETTINGS', actions: ['CREATE', 'READ', 'UPDATE'] },
            { resource: 'REPORTS', actions: ['READ', 'EXPORT'] }
          ],
          constraints: {
            maxPerTenant: 3,
            canManageBranches: true,
            canAssignRoles: ['BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'HEAD_NURSE']
          },
          isSystemRole: true
        },
        {
          roleName: 'BRANCH_ADMIN',
          displayName: 'Branch Administrator',
          description: 'Full access within branch',
          scope: 'BRANCH',
          level: 8,
          permissions: [
            { resource: 'STAFF', actions: ['CREATE', 'READ', 'UPDATE'] },
            { resource: 'PATIENTS', actions: ['CREATE', 'READ', 'UPDATE'] },
            { resource: 'APPOINTMENTS', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] }
          ],
          constraints: {
            maxPerBranch: 2,
            canAssignRoles: ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'CASHIER']
          },
          isSystemRole: true
        },
        {
          roleName: 'DOCTOR',
          displayName: 'Doctor',
          description: 'Medical professional with patient care access',
          scope: 'BRANCH',
          level: 7,
          permissions: [
            { resource: 'PATIENTS', actions: ['CREATE', 'READ', 'UPDATE'] },
            { resource: 'APPOINTMENTS', actions: ['READ', 'UPDATE'] }
          ],
          constraints: {},
          isSystemRole: true
        }
        // Add more system roles as needed
      ];

      for (const roleData of systemRoles) {
        const existingRole = await StaffRole.findOne({ roleName: roleData.roleName });
        
        if (!existingRole) {
          const role = new StaffRole({
            ...roleData,
            auditInfo: {
              createdBy: 'SYSTEM',
              createdAt: new Date()
            }
          });

          await role.save();
          logger.info(`System role created: ${roleData.roleName}`);
        } else {
          logger.info(`System role already exists: ${roleData.roleName}`);
        }
      }

      logger.info('System roles initialization completed');
      return true;

    } catch (error) {
      logger.error('Error initializing system roles:', error);
      throw error;
    }
  }
}

module.exports = RoleService;