const PolicyService = require('../services/PolicyService');
const logger = require('../utils/logger');

class PolicyController {
  async createPolicy(req, res) {
    try {
      const policyData = {
        ...req.validatedData,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId
      };

      const result = await PolicyService.createPolicy(policyData, req.user);

      res.status(201).json(result);
    } catch (error) {
      logger.error('Create policy controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getPolicyById(req, res) {
    try {
      const { policyId } = req.validatedParams;
      
      const result = await PolicyService.getPolicyById(
        policyId,
        req.user.tenantId,
        req.user.branchId
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Get policy controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getPatientPolicies(req, res) {
    try {
      const { patientId } = req.validatedParams;
      
      const result = await PolicyService.getPatientPolicies(
        patientId,
        req.user.tenantId,
        req.user.branchId
      );

      res.json(result);
    } catch (error) {
      logger.error('Get patient policies controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async updatePolicy(req, res) {
    try {
      const { policyId } = req.validatedParams;
      
      const result = await PolicyService.updatePolicy(
        policyId,
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
      logger.error('Update policy controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async verifyPolicy(req, res) {
    try {
      const { policyId } = req.validatedParams;
      
      const result = await PolicyService.verifyPolicy(
        policyId,
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
      logger.error('Verify policy controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async checkPolicyEligibility(req, res) {
    try {
      const { policyId } = req.validatedParams;
      const { serviceType, amount } = req.validatedQuery;
      
      const result = await PolicyService.checkPolicyEligibility(
        policyId,
        serviceType,
        parseFloat(amount)
      );

      res.json(result);
    } catch (error) {
      logger.error('Check policy eligibility controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getPoliciesByStatus(req, res) {
    try {
      const { status = 'active' } = req.validatedQuery;
      
      // This would be implemented in PolicyService
      // For now, return a placeholder response
      res.json({
        success: true,
        data: [],
        message: 'Feature coming soon'
      });
    } catch (error) {
      logger.error('Get policies by status controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getExpiringPolicies(req, res) {
    try {
      const { days = 30 } = req.validatedQuery;
      
      // This would be implemented in PolicyService
      // For now, return a placeholder response
      res.json({
        success: true,
        data: [],
        message: 'Feature coming soon'
      });
    } catch (error) {
      logger.error('Get expiring policies controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new PolicyController();