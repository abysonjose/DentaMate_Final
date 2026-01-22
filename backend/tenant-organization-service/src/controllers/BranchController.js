const BranchService = require('../services/BranchService');
const { validateBranchCreation, validateBranchUpdate } = require('../validators/branchValidator');
const logger = require('../utils/logger');

class BranchController {
  constructor() {
    this.branchService = new BranchService();
  }

  async createBranch(req, res) {
    try {
      const { tenantId } = req.params;
      const { error, value } = validateBranchCreation(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const createdBy = req.user?.userId || 'system';
      const branch = await this.branchService.createBranch(tenantId, value, createdBy);

      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: branch
      });

    } catch (error) {
      logger.error('Create branch error:', error);
      
      if (error.message.includes('not found') || error.message.includes('inactive')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('limit exceeded') || error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create branch',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getBranch(req, res) {
    try {
      const { branchId } = req.params;
      
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required'
        });
      }

      const branch = await this.branchService.getBranch(branchId);

      res.json({
        success: true,
        data: branch
      });

    } catch (error) {
      logger.error('Get branch error:', error);
      
      if (error.message === 'Branch not found') {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get branch',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getTenantBranches(req, res) {
    try {
      const { tenantId } = req.params;
      const { includeInactive = false } = req.query;

      const branches = await this.branchService.getTenantBranches(
        tenantId, 
        includeInactive === 'true'
      );

      res.json({
        success: true,
        data: branches,
        count: branches.length
      });

    } catch (error) {
      logger.error('Get tenant branches error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tenant branches',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async updateBranch(req, res) {
    try {
      const { branchId } = req.params;
      const { error, value } = validateBranchUpdate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const updatedBy = req.user?.userId || 'system';
      const branch = await this.branchService.updateBranch(branchId, value, updatedBy);

      res.json({
        success: true,
        message: 'Branch updated successfully',
        data: branch
      });

    } catch (error) {
      logger.error('Update branch error:', error);
      
      if (error.message === 'Branch not found') {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update branch',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async activateBranch(req, res) {
    try {
      const { branchId } = req.params;
      const activatedBy = req.user?.userId || 'system';
      
      const branch = await this.branchService.activateBranch(branchId, activatedBy);

      res.json({
        success: true,
        message: 'Branch activated successfully',
        data: branch
      });

    } catch (error) {
      logger.error('Activate branch error:', error);
      
      if (error.message === 'Branch not found') {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to activate branch',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async suspendBranch(req, res) {
    try {
      const { branchId } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Suspension reason is required'
        });
      }

      const suspendedBy = req.user?.userId || 'system';
      const branch = await this.branchService.suspendBranch(branchId, suspendedBy, reason);

      res.json({
        success: true,
        message: 'Branch suspended successfully',
        data: branch
      });

    } catch (error) {
      logger.error('Suspend branch error:', error);
      
      if (error.message === 'Branch not found') {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to suspend branch',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async validateBranch(req, res) {
    try {
      const { branchId } = req.params;
      const { tenantId } = req.query;
      
      const validation = await this.branchService.validateBranch(branchId, tenantId);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Validate branch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate branch',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async assignBranchAdmin(req, res) {
    try {
      const { branchId } = req.params;
      const { userId, name, email, phone } = req.body;
      
      if (!userId || !name || !email) {
        return res.status(400).json({
          success: false,
          message: 'User ID, name, and email are required'
        });
      }

      const assignedBy = req.user?.userId || 'system';
      const adminData = { userId, name, email, phone };
      
      const branch = await this.branchService.assignBranchAdmin(branchId, adminData, assignedBy);

      res.json({
        success: true,
        message: 'Branch admin assigned successfully',
        data: branch
      });

    } catch (error) {
      logger.error('Assign branch admin error:', error);
      
      if (error.message === 'Branch not found') {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to assign branch admin',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async addDepartment(req, res) {
    try {
      const { branchId } = req.params;
      const { name, code, description } = req.body;
      
      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Department name and code are required'
        });
      }

      const addedBy = req.user?.userId || 'system';
      const departmentData = { name, code, description };
      
      const branch = await this.branchService.addDepartment(branchId, departmentData, addedBy);

      res.json({
        success: true,
        message: 'Department added successfully',
        data: branch
      });

    } catch (error) {
      logger.error('Add department error:', error);
      
      if (error.message === 'Branch not found') {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add department',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async addRoom(req, res) {
    try {
      const { branchId, departmentId } = req.params;
      const { roomNumber, roomName, roomType, capacity, equipment } = req.body;
      
      if (!roomNumber) {
        return res.status(400).json({
          success: false,
          message: 'Room number is required'
        });
      }

      const addedBy = req.user?.userId || 'system';
      const roomData = { 
        roomNumber, 
        roomName, 
        roomType, 
        capacity: capacity || 1, 
        equipment: equipment || [] 
      };
      
      const branch = await this.branchService.addRoom(branchId, departmentId, roomData, addedBy);

      res.json({
        success: true,
        message: 'Room added successfully',
        data: branch
      });

    } catch (error) {
      logger.error('Add room error:', error);
      
      if (error.message === 'Branch not found' || error.message === 'Department not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add room',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getBranchWorkingHours(req, res) {
    try {
      const { branchId } = req.params;
      const workingHours = await this.branchService.getBranchWorkingHours(branchId);

      res.json({
        success: true,
        data: workingHours
      });

    } catch (error) {
      logger.error('Get branch working hours error:', error);
      
      if (error.message === 'Branch not found') {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get branch working hours',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async searchBranches(req, res) {
    try {
      const { tenantId } = req.params;
      const { q: searchQuery } = req.query;
      const { limit = 50, skip = 0 } = req.query;

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const branches = await this.branchService.searchBranches(
        tenantId,
        searchQuery, 
        parseInt(limit), 
        parseInt(skip)
      );

      res.json({
        success: true,
        data: branches,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          count: branches.length
        }
      });

    } catch (error) {
      logger.error('Search branches error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search branches',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = BranchController;