const StaffService = require('../services/StaffService');
const StaffAuditLog = require('../models/StaffAuditLog');
const logger = require('../utils/logger');

class StaffController {
  constructor() {
    this.staffService = new StaffService();
  }

  // Create new staff member
  async createStaff(req, res) {
    try {
      const staffData = req.body;
      const createdBy = req.user.userId;

      logger.info('Creating staff member', { 
        email: staffData.personalInfo.email,
        tenantId: staffData.tenantId,
        createdBy 
      });

      const staff = await this.staffService.createStaff(staffData, createdBy);

      res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        data: staff
      });

    } catch (error) {
      logger.error('Error in createStaff controller:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Invalid tenant') || error.message.includes('Invalid branch')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create staff member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get staff member by ID
  async getStaff(req, res) {
    try {
      const { staffId } = req.params;
      const requestingUser = req.user;

      const staff = await this.staffService.getStaff(staffId, requestingUser);

      res.json({
        success: true,
        data: staff
      });

    } catch (error) {
      logger.error('Error in getStaff controller:', error);
      
      if (error.message === 'Staff member not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get staff member by auth user ID (for JWT building)
  async getStaffByAuthId(req, res) {
    try {
      const { userAuthId } = req.params;

      const staff = await this.staffService.getStaffByAuthId(userAuthId);

      res.json({
        success: true,
        staff: staff
      });

    } catch (error) {
      logger.error('Error in getStaffByAuthId controller:', error);
      
      if (error.message === 'Staff member not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff member by auth ID',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update staff member
  async updateStaff(req, res) {
    try {
      const { staffId } = req.params;
      const updateData = req.body;
      const updatedBy = req.user.userId;

      const staff = await this.staffService.updateStaff(staffId, updateData, updatedBy);

      res.json({
        success: true,
        message: 'Staff member updated successfully',
        data: staff
      });

    } catch (error) {
      logger.error('Error in updateStaff controller:', error);
      
      if (error.message === 'Staff member not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update staff member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Deactivate staff member
  async deactivateStaff(req, res) {
    try {
      const { staffId } = req.params;
      const { reason } = req.body;
      const deactivatedBy = req.user.userId;

      const staff = await this.staffService.deactivateStaff(staffId, reason, deactivatedBy);

      res.json({
        success: true,
        message: 'Staff member deactivated successfully',
        data: staff
      });

    } catch (error) {
      logger.error('Error in deactivateStaff controller:', error);
      
      if (error.message === 'Staff member not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('not currently active')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to deactivate staff member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Activate staff member
  async activateStaff(req, res) {
    try {
      const { staffId } = req.params;
      const activatedBy = req.user.userId;

      const staff = await this.staffService.activateStaff(staffId, activatedBy);

      res.json({
        success: true,
        message: 'Staff member activated successfully',
        data: staff
      });

    } catch (error) {
      logger.error('Error in activateStaff controller:', error);
      
      if (error.message === 'Staff member not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('already active')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to activate staff member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Assign role to staff member
  async assignRole(req, res) {
    try {
      const { staffId } = req.params;
      const { roleId } = req.body;
      const assignedBy = req.user.userId;

      const staff = await this.staffService.assignRole(staffId, roleId, assignedBy);

      res.json({
        success: true,
        message: 'Role assigned successfully',
        data: staff
      });

    } catch (error) {
      logger.error('Error in assignRole controller:', error);
      
      if (error.message === 'Staff member not found' || error.message === 'Role not found or inactive') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('already assigned') || error.message.includes('Maximum')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to assign role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Remove role from staff member
  async removeRole(req, res) {
    try {
      const { staffId, roleId } = req.params;
      const removedBy = req.user.userId;

      const staff = await this.staffService.removeRole(staffId, roleId, removedBy);

      res.json({
        success: true,
        message: 'Role removed successfully',
        data: staff
      });

    } catch (error) {
      logger.error('Error in removeRole controller:', error);
      
      if (error.message === 'Staff member not found' || error.message.includes('Role not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to remove role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get staff by tenant
  async getStaffByTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const options = {
        branchId: req.query.branchId,
        status: req.query.status,
        role: req.query.role,
        limit: parseInt(req.query.limit) || 20,
        skip: parseInt(req.query.skip) || 0
      };

      const staff = await this.staffService.getStaffByTenant(tenantId, options);

      res.json({
        success: true,
        data: staff,
        pagination: {
          limit: options.limit,
          skip: options.skip,
          count: staff.length
        }
      });

    } catch (error) {
      logger.error('Error in getStaffByTenant controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff members',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get staff by role
  async getStaffByRole(req, res) {
    try {
      const { roleName } = req.params;
      const { tenantId, branchId } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'tenantId is required'
        });
      }

      const staff = await this.staffService.getStaffByRole(roleName, tenantId, branchId);

      res.json({
        success: true,
        data: staff
      });

    } catch (error) {
      logger.error('Error in getStaffByRole controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff members by role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Transfer staff to different branch
  async transferStaff(req, res) {
    try {
      const { staffId } = req.params;
      const { newBranchId, reason } = req.body;
      const transferredBy = req.user.userId;

      const staff = await this.staffService.transferStaff(staffId, newBranchId, transferredBy, reason);

      res.json({
        success: true,
        message: 'Staff member transferred successfully',
        data: staff
      });

    } catch (error) {
      logger.error('Error in transferStaff controller:', error);
      
      if (error.message === 'Staff member not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Invalid tenant') || error.message.includes('Invalid branch')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to transfer staff member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get staff audit trail
  async getStaffAuditTrail(req, res) {
    try {
      const { staffId } = req.params;
      const options = {
        tenantId: req.user.tenantId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        action: req.query.action,
        limit: parseInt(req.query.limit) || 50
      };

      const auditTrail = await StaffAuditLog.getAuditTrail(staffId, options);

      res.json({
        success: true,
        data: auditTrail
      });

    } catch (error) {
      logger.error('Error in getStaffAuditTrail controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit trail',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Bulk operations
  async bulkUpdateStaff(req, res) {
    try {
      const { staffIds, updateData } = req.body;
      const updatedBy = req.user.userId;

      if (!Array.isArray(staffIds) || staffIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'staffIds array is required and cannot be empty'
        });
      }

      const results = [];
      const errors = [];

      for (const staffId of staffIds) {
        try {
          const staff = await this.staffService.updateStaff(staffId, updateData, updatedBy);
          results.push({ staffId, success: true, data: staff });
        } catch (error) {
          errors.push({ staffId, success: false, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `Bulk update completed. ${results.length} successful, ${errors.length} failed.`,
        results,
        errors
      });

    } catch (error) {
      logger.error('Error in bulkUpdateStaff controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Bulk update failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get staff statistics
  async getStaffStatistics(req, res) {
    try {
      const { tenantId } = req.params;
      const { branchId } = req.query;

      // This would typically call a dedicated analytics service
      // For now, we'll provide basic statistics
      const Staff = require('../models/Staff');
      
      const pipeline = [
        {
          $match: {
            tenantId,
            ...(branchId && { branchId })
          }
        },
        {
          $group: {
            _id: '$employmentInfo.employmentStatus',
            count: { $sum: 1 }
          }
        }
      ];

      const statusStats = await Staff.aggregate(pipeline);

      const rolesPipeline = [
        {
          $match: {
            tenantId,
            'employmentInfo.employmentStatus': 'ACTIVE',
            ...(branchId && { branchId })
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
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const roleStats = await Staff.aggregate(rolesPipeline);

      res.json({
        success: true,
        data: {
          statusDistribution: statusStats,
          roleDistribution: roleStats,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in getStaffStatistics controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Search staff members
  async searchStaff(req, res) {
    try {
      const { tenantId } = req.params;
      const { q, branchId, role, status, limit = 20, skip = 0 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const Staff = require('../models/Staff');
      
      const searchRegex = new RegExp(q.trim(), 'i');
      const matchStage = {
        tenantId,
        $or: [
          { 'personalInfo.firstName': searchRegex },
          { 'personalInfo.lastName': searchRegex },
          { 'personalInfo.email': searchRegex },
          { staffCode: searchRegex },
          { 'employmentInfo.employeeId': searchRegex }
        ],
        ...(branchId && { branchId }),
        ...(status && { 'employmentInfo.employmentStatus': status })
      };

      if (role) {
        matchStage['roles.roleName'] = role.toUpperCase();
        matchStage['roles.isActive'] = true;
      }

      const staff = await Staff.find(matchStage)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .sort({ 'personalInfo.firstName': 1 });

      const results = staff.map(s => s.toMinimalJSON());

      res.json({
        success: true,
        data: results,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          count: results.length
        }
      });

    } catch (error) {
      logger.error('Error in searchStaff controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = StaffController;