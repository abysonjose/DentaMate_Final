const InsurancePolicy = require('../models/InsurancePolicy');
const CacheService = require('./CacheService');
const AuditService = require('./AuditService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class PolicyService {
  async createPolicy(policyData, createdBy) {
    try {
      const policyId = uuidv4();
      
      const policy = new InsurancePolicy({
        ...policyData,
        policyId,
        createdBy,
        verificationStatus: 'pending'
      });

      await policy.save();
      
      // Cache the policy
      await CacheService.setPolicy(policyId, policy.toObject());
      
      // Clear patient policies cache
      await CacheService.deletePatientPolicies(policyData.patientId);
      
      // Log audit
      await AuditService.logPolicyAction(
        policyId,
        'POLICY_CREATED',
        createdBy,
        policyData.tenantId,
        policyData.branchId
      );

      logger.info('Insurance policy created:', { policyId, patientId: policyData.patientId });
      
      return {
        success: true,
        data: policy.toObject(),
        message: 'Insurance policy created successfully'
      };
    } catch (error) {
      logger.error('Create policy error:', error);
      throw error;
    }
  }

  async getPolicyById(policyId, tenantId, branchId) {
    try {
      // Try cache first
      let policy = await CacheService.getPolicy(policyId);
      
      if (!policy) {
        policy = await InsurancePolicy.findOne({
          policyId,
          tenantId,
          branchId
        }).lean();
        
        if (policy) {
          await CacheService.setPolicy(policyId, policy);
        }
      }

      if (!policy) {
        return {
          success: false,
          message: 'Insurance policy not found'
        };
      }

      return {
        success: true,
        data: policy
      };
    } catch (error) {
      logger.error('Get policy error:', error);
      throw error;
    }
  }

  async getPatientPolicies(patientId, tenantId, branchId) {
    try {
      // Try cache first
      let policies = await CacheService.getPatientPolicies(patientId);
      
      if (!policies) {
        policies = await InsurancePolicy.find({
          patientId,
          tenantId,
          branchId
        }).sort({ createdAt: -1 }).lean();
        
        await CacheService.setPatientPolicies(patientId, policies);
      }

      return {
        success: true,
        data: policies,
        count: policies.length
      };
    } catch (error) {
      logger.error('Get patient policies error:', error);
      throw error;
    }
  }

  async updatePolicy(policyId, updateData, updatedBy, tenantId, branchId) {
    try {
      const policy = await InsurancePolicy.findOneAndUpdate(
        { policyId, tenantId, branchId },
        { ...updateData, updatedBy },
        { new: true, runValidators: true }
      );

      if (!policy) {
        return {
          success: false,
          message: 'Insurance policy not found'
        };
      }

      // Update cache
      await CacheService.setPolicy(policyId, policy.toObject());
      
      // Clear patient policies cache
      await CacheService.deletePatientPolicies(policy.patientId);
      
      // Log audit
      await AuditService.logPolicyAction(
        policyId,
        'POLICY_UPDATED',
        updatedBy,
        tenantId,
        branchId,
        { changes: updateData }
      );

      logger.info('Insurance policy updated:', { policyId });
      
      return {
        success: true,
        data: policy.toObject(),
        message: 'Insurance policy updated successfully'
      };
    } catch (error) {
      logger.error('Update policy error:', error);
      throw error;
    }
  }

  async verifyPolicy(policyId, verificationData, verifiedBy, tenantId, branchId) {
    try {
      const { status, notes } = verificationData;
      
      const policy = await InsurancePolicy.findOneAndUpdate(
        { policyId, tenantId, branchId },
        {
          verificationStatus: status,
          verificationNotes: notes,
          lastVerificationDate: new Date(),
          updatedBy: verifiedBy
        },
        { new: true, runValidators: true }
      );

      if (!policy) {
        return {
          success: false,
          message: 'Insurance policy not found'
        };
      }

      // Update cache
      await CacheService.setPolicy(policyId, policy.toObject());
      
      // Clear patient policies cache
      await CacheService.deletePatientPolicies(policy.patientId);
      
      // Log audit
      await AuditService.logPolicyAction(
        policyId,
        'POLICY_VERIFIED',
        verifiedBy,
        tenantId,
        branchId,
        { verificationStatus: status, notes }
      );

      logger.info('Insurance policy verified:', { policyId, status });
      
      return {
        success: true,
        data: policy.toObject(),
        message: 'Insurance policy verification updated successfully'
      };
    } catch (error) {
      logger.error('Verify policy error:', error);
      throw error;
    }
  }

  async checkPolicyEligibility(policyId, serviceType, amount) {
    try {
      const policyResult = await this.getPolicyById(policyId);
      
      if (!policyResult.success) {
        return policyResult;
      }

      const policy = policyResult.data;
      
      // Check if policy is valid
      if (!this.isPolicyValid(policy)) {
        return {
          success: false,
          message: 'Insurance policy is not valid or has expired',
          eligibility: {
            eligible: false,
            reason: 'Policy expired or inactive'
          }
        };
      }

      // Check coverage for service type
      const coverage = this.getCoverageForService(policy, serviceType);
      
      if (!coverage.covered) {
        return {
          success: true,
          eligibility: {
            eligible: false,
            reason: 'Service not covered by policy',
            coverage: coverage
          }
        };
      }

      // Calculate coverage amounts
      const remainingBenefit = this.calculateRemainingBenefit(policy);
      const coverageAmount = Math.min(
        amount * (coverage.percentage / 100),
        coverage.annualLimit || amount,
        remainingBenefit
      );

      const patientPayable = amount - coverageAmount;
      const deductible = policy.coverageDetails.deductible || 0;
      const coPayment = amount * (policy.coverageDetails.coPaymentPercentage / 100);

      return {
        success: true,
        eligibility: {
          eligible: true,
          coverage: coverage,
          amounts: {
            totalAmount: amount,
            coverageAmount,
            patientPayable: patientPayable + deductible + coPayment,
            deductible,
            coPayment,
            remainingBenefit
          }
        }
      };
    } catch (error) {
      logger.error('Check policy eligibility error:', error);
      throw error;
    }
  }

  isPolicyValid(policy) {
    const now = new Date();
    return policy.status === 'active' && 
           new Date(policy.validityPeriod.startDate) <= now && 
           new Date(policy.validityPeriod.endDate) >= now;
  }

  getCoverageForService(policy, serviceType) {
    const coverage = policy.coverageDetails.coveredServices.find(
      service => service.serviceType === serviceType
    );
    
    if (!coverage) {
      return {
        covered: false,
        percentage: 0,
        annualLimit: 0
      };
    }
    
    return {
      covered: true,
      percentage: coverage.coveragePercentage,
      annualLimit: coverage.annualLimit
    };
  }

  calculateRemainingBenefit(policy) {
    const totalLimit = policy.coverageDetails.annualLimit;
    const used = policy.utilizationSummary.currentYearUsed || 0;
    return Math.max(0, totalLimit - used);
  }

  async updateUtilization(policyId, amount, tenantId, branchId) {
    try {
      const policy = await InsurancePolicy.findOneAndUpdate(
        { policyId, tenantId, branchId },
        {
          $inc: { 'utilizationSummary.currentYearUsed': amount },
          'utilizationSummary.lastUpdated': new Date()
        },
        { new: true }
      );

      if (policy) {
        // Update cache
        await CacheService.setPolicy(policyId, policy.toObject());
        
        // Clear patient policies cache
        await CacheService.deletePatientPolicies(policy.patientId);
      }

      return policy;
    } catch (error) {
      logger.error('Update utilization error:', error);
      throw error;
    }
  }
}

module.exports = new PolicyService();