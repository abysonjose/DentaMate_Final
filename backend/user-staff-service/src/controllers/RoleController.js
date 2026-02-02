const RoleService = require('../services/RoleService');
const logger = require('../utils/logger');

class RoleController {
  constructor() {
    this.roleService = new RoleService();
  }

  // Create new role
  async createRole(req, res) {
    try {
      const roleData = req.body;
      const createdBy = req.user.userId;

      logger.info('Creating role', { 
        roleName: roleData.roleName,
        scope: roleData.scope,
        createdBy 
      });

      const role = await this.roleService.createRole(roleData, createdBy);

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role
      });

    } catch (error) {
      logger.error('Error in createRole controller:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get role by ID
  async getRole(req, res) {
    try {
      const { roleId } = req.params;

      const role = await this.roleService.getRole(roleId);

      res.json({
        success: true,
        data: role
      });

    } catch (error) {
      logger.error('Error in getRole controller:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get role by name
  async getRoleByName(req, res) {
    try {
      const { roleName } = req.params;

      const role = await this.roleService.getRoleByName(roleName);

      res.json({
        success: true,
        data: role
      });

    } catch (error) {
      logger.error('Error in getRoleByName controller:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all roles
  async getAllRoles(req, res) {
    try {
      const { scope } = req.query;

      const roles = await this.roleService.getAllRoles(scope);

      res.json({
        success: true,
        data: roles
      });

    } catch (error) {
      logger.error('Error in getAllRoles controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve roles',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update role
  async updateRole(req, res) {
    try {
      const { roleId } = req.params;
      const updateData = req.body;
      const updatedBy = req.user.userId;

      const role = await this.roleService.updateRole(roleId, updateData, updatedBy);

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: role
      });

    } catch (error) {
      logger.error('Error in updateRole controller:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('System roles cannot be modified')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete role
  async deleteRole(req, res) {
    try {
      const { roleId } = req.params;
      const deletedBy = req.user.userId;

      const result = await this.roleService.deleteRole(roleId, deletedBy);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      logger.error('Error in deleteRole controller:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('System roles cannot be deleted') || 
          error.message.includes('Cannot delete role')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Add permission to role
  async addPermission(req, res) {
    try {
      const { roleId } = req.params;
      const permission = req.body;
      const addedBy = req.user.userId;

      const role = await this.roleService.addPermission(roleId, permission, addedBy);

      res.json({
        success: true,
        message: 'Permission added successfully',
        data: role
      });

    } catch (error) {
      logger.error('Error in addPermission controller:', error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('System role permissions cannot be modified') ||
          error.message.includes('Permission already exists')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add permission',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Remove permission from role
  async removePermission(req, res) {
    try {
      const { roleId } = req.params;
      const { resource, actions } = req.body;
      const removedBy = req.user.userId;

      const role = await this.roleService.removePermission(roleId, resource, actions, removedBy);

      res.json({
        success: true,
        message: 'Permission removed successfully',
        data: role
      });

    } catch (error) {
      logger.error('Error in removePermission controller:', error);
      
      if (error.message === 'Role not found' || error.message === 'Permission not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('System role permissions cannot be modified')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to remove permission',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get role hierarchy
  async getRoleHierarchy(req, res) {
    try {
      const hierarchy = await this.roleService.getRoleHierarchy();

      res.json({
        success: true,
        data: hierarchy
      });

    } catch (error) {
      logger.error('Error in getRoleHierarchy controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve role hierarchy',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get assignable roles for a user
  async getAssignableRoles(req, res) {
    try {
      const { assignerRoleId } = req.params;

      const roles = await this.roleService.getAssignableRoles(assignerRoleId);

      res.json({
        success: true,
        data: roles
      });

    } catch (error) {
      logger.error('Error in getAssignableRoles controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve assignable roles',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Validate role assignment
  async validateRoleAssignment(req, res) {
    try {
      const { assignerRoleId, targetRoleId } = req.body;

      const isValid = await this.roleService.validateRoleAssignment(assignerRoleId, targetRoleId);

      res.json({
        success: true,
        data: {
          isValid,
          message: 'Role assignment is valid'
        }
      });

    } catch (error) {
      logger.error('Error in validateRoleAssignment controller:', error);
      
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get role statistics
  async getRoleStatistics(req, res) {
    try {
      const { tenantId } = req.query;

      const statistics = await this.roleService.getRoleStatistics(tenantId);

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      logger.error('Error in getRoleStatistics controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve role statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get role distribution
  async getRoleDistribution(req, res) {
    try {
      const { tenantId, branchId } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'tenantId is required'
        });
      }

      const distribution = await this.roleService.getRoleDistribution(tenantId, branchId);

      res.json({
        success: true,
        data: distribution
      });

    } catch (error) {
      logger.error('Error in getRoleDistribution controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve role distribution',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Initialize system roles (admin only)
  async initializeSystemRoles(req, res) {
    try {
      // Only allow SAAS_ADMIN to initialize system roles
      if (!req.user.roles || !req.user.roles.includes('SAAS_ADMIN')) {
        return res.status(403).json({
          success: false,
          message: 'Only SAAS_ADMIN can initialize system roles'
        });
      }

      const result = await this.roleService.initializeSystemRoles();

      res.json({
        success: true,
        message: 'System roles initialized successfully',
        data: { initialized: result }
      });

    } catch (error) {
      logger.error('Error in initializeSystemRoles controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to initialize system roles',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get roles by scope
  async getRolesByScope(req, res) {
    try {
      const { scope } = req.params;

      const validScopes = ['GLOBAL', 'TENANT', 'BRANCH', 'DEPARTMENT'];
      if (!validScopes.includes(scope.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid scope. Valid scopes: ${validScopes.join(', ')}`
        });
      }

      const roles = await this.roleService.getAllRoles(scope.toUpperCase());

      res.json({
        success: true,
        data: roles
      });

    } catch (error) {
      logger.error('Error in getRolesByScope controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve roles by scope',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Check if user has specific permission
  async checkPermission(req, res) {
    try {
      const { staffId, resource, action } = req.body;

      if (!staffId || !resource || !action) {
        return res.status(400).json({
          success: false,
          message: 'staffId, resource, and action are required'
        });
      }

      const AuthMiddleware = require('../middleware/auth');
      const hasPermission = await AuthMiddleware.checkPermission(staffId, resource, action);

      res.json({
        success: true,
        data: {
          hasPermission,
          staffId,
          resource,
          action
        }
      });

    } catch (error) {
      logger.error('Error in checkPermission controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to check permission',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = RoleController;