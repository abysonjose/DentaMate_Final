const BranchService = require('../services/BranchService');
const CacheService = require('../services/CacheService');
const logger = require('../utils/logger');

class BranchController {
  // Create a new branch
  async createBranch(req, res) {
    try {
      const branch = await BranchService.createBranch(req.body, req.user.tenantId);

      // Clear cache
      await CacheService.invalidateBranch(branch.branchId);

      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: branch
      });
    } catch (error) {
      logger.error('Error in createBranch controller:', error);
      
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create branch',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get branch by ID
  async getBranchById(req, res) {
    try {
      const { id } = req.params;
      
      // Try cache first
      const cachedBranch = await CacheService.getCachedBranch(id);
      if (cachedBranch) {
        return res.json({
          success: true,
          data: cachedBranch
        });
      }

      const branch = await BranchService.getBranchById(id, req.user.tenantId, req.user.role, req.user.branchId);

      // Cache the result
      await CacheService.cacheBranch(id, branch);

      res.json({
        success: true,
        data: branch
      });
    } catch (error) {
      logger.error('Error in getBranchById controller:', error);
      
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve branch'
      });
    }
  }

  // List branches
  async listBranches(req, res) {
    try {
      const result = await BranchService.listBranches(req.query, req.user.tenantId, req.user.role, req.user.branchId);

      res.json({
        success: true,
        data: result.branches,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in listBranches controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve branches'
      });
    }
  }

  // Update branch
  async updateBranch(req, res) {
    try {
      const { id } = req.params;
      
      const branch = await BranchService.updateBranch(id, req.body, req.user.tenantId, req.user.role, req.user.branchId);

      // Clear cache
      await CacheService.invalidateBranch(id);

      res.json({
        success: true,
        message: 'Branch updated successfully',
        data: branch
      });
    } catch (error) {
      logger.error('Error in updateBranch controller:', error);
      
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update branch'
      });
    }
  }

  // Delete branch (soft delete)
  async deleteBranch(req, res) {
    try {
      const { id } = req.params;
      
      const branch = await BranchService.deleteBranch(id, req.user.tenantId, req.user.role);

      // Clear cache
      await CacheService.invalidateBranch(id);

      res.json({
        success: true,
        message: 'Branch deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteBranch controller:', error);
      
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete branch'
      });
    }
  }
}

module.exports = new BranchController();