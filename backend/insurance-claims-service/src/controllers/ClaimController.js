const ClaimService = require('../services/ClaimService');
const CacheService = require('../services/CacheService');
const logger = require('../utils/logger');

class ClaimController {
  async createClaim(req, res) {
    try {
      const claimData = {
        ...req.validatedData,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId
      };

      const result = await ClaimService.createClaim(claimData, req.user);

      res.status(201).json(result);
    } catch (error) {
      logger.error('Create claim controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getClaimById(req, res) {
    try {
      const { claimId } = req.validatedParams;
      
      const result = await ClaimService.getClaimById(
        claimId,
        req.user.tenantId,
        req.user.branchId
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Get claim controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateClaim(req, res) {
    try {
      const { claimId } = req.validatedParams;
      
      const result = await ClaimService.updateClaim(
        claimId,
        req.validatedData,
        req.user,
        req.user.tenantId,
        req.user.branchId
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Update claim controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updateClaimStatus(req, res) {
    try {
      const { claimId } = req.validatedParams;
      const { status, ...statusData } = req.validatedData;
      
      const result = await ClaimService.updateClaimStatus(
        claimId,
        status,
        req.user,
        req.user.tenantId,
        req.user.branchId,
        statusData
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Update claim status controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async submitClaim(req, res) {
    try {
      const { claimId } = req.validatedParams;
      
      const result = await ClaimService.submitClaim(
        claimId,
        req.validatedData,
        req.user,
        req.user.tenantId,
        req.user.branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Submit claim controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async resubmitClaim(req, res) {
    try {
      const { claimId } = req.validatedParams;
      
      const result = await ClaimService.resubmitClaim(
        claimId,
        req.validatedData,
        req.user,
        req.user.tenantId,
        req.user.branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Resubmit claim controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getClaimsByStatus(req, res) {
    try {
      const { status } = req.validatedQuery;
      
      // Try cache first
      let claims = await CacheService.getClaimsByStatus(
        req.user.tenantId,
        req.user.branchId,
        status
      );

      if (!claims) {
        // This would be implemented in ClaimService
        // For now, return a placeholder response
        claims = [];
        
        // Cache the result
        await CacheService.setClaimsByStatus(
          req.user.tenantId,
          req.user.branchId,
          status,
          claims
        );
      }

      res.json({
        success: true,
        data: claims,
        count: claims.length
      });
    } catch (error) {
      logger.error('Get claims by status controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getClaimsByPatient(req, res) {
    try {
      const { patientId } = req.validatedParams;
      const { status, page = 1, limit = 20 } = req.validatedQuery;
      
      // This would be implemented in ClaimService
      // For now, return a placeholder response
      res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    } catch (error) {
      logger.error('Get claims by patient controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getClaimsByInvoice(req, res) {
    try {
      const { invoiceId } = req.validatedParams;
      
      // This would be implemented in ClaimService
      // For now, return a placeholder response
      res.json({
        success: true,
        data: [],
        message: 'Feature coming soon'
      });
    } catch (error) {
      logger.error('Get claims by invoice controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getClaimHistory(req, res) {
    try {
      const { claimId } = req.validatedParams;
      
      // This would return the status history from the claim
      const claimResult = await ClaimService.getClaimById(
        claimId,
        req.user.tenantId,
        req.user.branchId
      );

      if (!claimResult.success) {
        return res.status(404).json(claimResult);
      }

      res.json({
        success: true,
        data: claimResult.data.statusHistory || [],
        count: claimResult.data.statusHistory?.length || 0
      });
    } catch (error) {
      logger.error('Get claim history controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getClaimsRequiringFollowUp(req, res) {
    try {
      // This would be implemented in ClaimService
      // For now, return a placeholder response
      res.json({
        success: true,
        data: [],
        message: 'Feature coming soon'
      });
    } catch (error) {
      logger.error('Get claims requiring follow-up controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new ClaimController();