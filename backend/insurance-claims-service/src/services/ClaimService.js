const InsuranceClaim = require('../models/InsuranceClaim');
const PolicyService = require('./PolicyService');
const CacheService = require('./CacheService');
const AuditService = require('./AuditService');
const NotificationService = require('./NotificationService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ClaimService {
  async createClaim(claimData, createdBy) {
    try {
      const claimId = uuidv4();
      
      // Verify policy exists and is valid
      const policyResult = await PolicyService.getPolicyById(
        claimData.policyId,
        claimData.tenantId,
        claimData.branchId
      );

      if (!policyResult.success) {
        return {
          success: false,
          message: 'Invalid insurance policy'
        };
      }

      const policy = policyResult.data;
      
      // Check policy eligibility
      const eligibilityResult = await PolicyService.checkPolicyEligibility(
        claimData.policyId,
        claimData.treatmentDetails.treatmentType,
        claimData.financialDetails.totalAmount
      );

      if (!eligibilityResult.success || !eligibilityResult.eligibility.eligible) {
        return {
          success: false,
          message: 'Treatment not eligible for insurance coverage',
          eligibility: eligibilityResult.eligibility
        };
      }

      // Create claim with calculated amounts
      const claim = new InsuranceClaim({
        ...claimData,
        claimId,
        insurer: {
          name: policy.provider.name,
          code: policy.provider.code,
          contactInfo: policy.provider.contactInfo
        },
        financialDetails: {
          ...claimData.financialDetails,
          ...eligibilityResult.eligibility.amounts
        },
        createdBy: createdBy.userId || createdBy,
        status: 'DRAFT'
      });

      // Add initial status history
      claim.addStatusHistory('DRAFT', createdBy.userId || createdBy, 'Claim created');

      await claim.save();
      
      // Cache the claim
      await CacheService.setClaim(claimId, claim.toObject());
      
      // Invalidate related caches
      await CacheService.invalidateClaimsByStatus(claimData.tenantId, claimData.branchId);
      
      // Log audit
      await AuditService.logClaimAction(
        claimId,
        'CLAIM_CREATED',
        createdBy,
        claimData.tenantId,
        claimData.branchId,
        { claimAmount: claimData.financialDetails.claimAmount }
      );

      logger.info('Insurance claim created:', { claimId, patientId: claimData.patientId });
      
      return {
        success: true,
        data: claim.toObject(),
        message: 'Insurance claim created successfully'
      };
    } catch (error) {
      logger.error('Create claim error:', error);
      throw error;
    }
  }

  async getClaimById(claimId, tenantId, branchId) {
    try {
      // Try cache first
      let claim = await CacheService.getClaim(claimId);
      
      if (!claim) {
        claim = await InsuranceClaim.findOne({
          claimId,
          tenantId,
          branchId
        }).lean();
        
        if (claim) {
          await CacheService.setClaim(claimId, claim);
        }
      }

      if (!claim) {
        return {
          success: false,
          message: 'Insurance claim not found'
        };
      }

      return {
        success: true,
        data: claim
      };
    } catch (error) {
      logger.error('Get claim error:', error);
      throw error;
    }
  }

  async updateClaim(claimId, updateData, updatedBy, tenantId, branchId) {
    try {
      // Check if claim can be updated
      const claimResult = await this.getClaimById(claimId, tenantId, branchId);
      
      if (!claimResult.success) {
        return claimResult;
      }

      const currentClaim = claimResult.data;
      
      if (!this.canUpdateClaim(currentClaim.status)) {
        return {
          success: false,
          message: 'Claim cannot be updated in current status'
        };
      }

      const claim = await InsuranceClaim.findOneAndUpdate(
        { claimId, tenantId, branchId },
        { ...updateData, updatedBy: updatedBy.userId || updatedBy },
        { new: true, runValidators: true }
      );

      if (!claim) {
        return {
          success: false,
          message: 'Insurance claim not found'
        };
      }

      // Update cache
      await CacheService.setClaim(claimId, claim.toObject());
      
      // Invalidate related caches
      await CacheService.invalidateClaimsByStatus(tenantId, branchId);
      
      // Log audit
      await AuditService.logClaimAction(
        claimId,
        'CLAIM_UPDATED',
        updatedBy,
        tenantId,
        branchId,
        { changes: updateData }
      );

      logger.info('Insurance claim updated:', { claimId });
      
      return {
        success: true,
        data: claim.toObject(),
        message: 'Insurance claim updated successfully'
      };
    } catch (error) {
      logger.error('Update claim error:', error);
      throw error;
    }
  }

  async updateClaimStatus(claimId, newStatus, updatedBy, tenantId, branchId, statusData = {}) {
    try {
      const claim = await InsuranceClaim.findOne({
        claimId,
        tenantId,
        branchId
      });

      if (!claim) {
        return {
          success: false,
          message: 'Insurance claim not found'
        };
      }

      if (!this.isValidStatusTransition(claim.status, newStatus)) {
        return {
          success: false,
          message: `Invalid status transition from ${claim.status} to ${newStatus}`
        };
      }

      // Update status-specific fields
      this.updateStatusSpecificFields(claim, newStatus, statusData, updatedBy);
      
      // Add status history
      claim.addStatusHistory(
        newStatus,
        updatedBy.userId || updatedBy,
        statusData.notes || '',
        statusData.insurerRemarks || ''
      );

      await claim.save();
      
      // Update cache
      await CacheService.setClaim(claimId, claim.toObject());
      
      // Invalidate related caches
      await CacheService.invalidateClaimsByStatus(tenantId, branchId);
      
      // Log audit
      await AuditService.logClaimAction(
        claimId,
        'STATUS_CHANGED',
        updatedBy,
        tenantId,
        branchId,
        { oldStatus: claim.status, newStatus, ...statusData }
      );

      // Send notifications
      await NotificationService.sendClaimStatusNotification(claim, newStatus);

      logger.info('Claim status updated:', { claimId, oldStatus: claim.status, newStatus });
      
      return {
        success: true,
        data: claim.toObject(),
        message: 'Claim status updated successfully'
      };
    } catch (error) {
      logger.error('Update claim status error:', error);
      throw error;
    }
  }

  async submitClaim(claimId, submissionData, submittedBy, tenantId, branchId) {
    try {
      const claimResult = await this.getClaimById(claimId, tenantId, branchId);
      
      if (!claimResult.success) {
        return claimResult;
      }

      const claim = claimResult.data;
      
      if (claim.status !== 'DRAFT') {
        return {
          success: false,
          message: 'Only draft claims can be submitted'
        };
      }

      // Validate required documents
      const validationResult = this.validateClaimForSubmission(claim);
      if (!validationResult.valid) {
        return {
          success: false,
          message: 'Claim validation failed',
          errors: validationResult.errors
        };
      }

      const updateData = {
        status: 'SUBMITTED',
        submissionDetails: {
          submittedAt: new Date(),
          submittedBy: submittedBy.userId || submittedBy,
          submissionMethod: submissionData.method || 'manual',
          submissionReference: submissionData.reference,
          acknowledgmentNumber: submissionData.acknowledgmentNumber
        }
      };

      return await this.updateClaimStatus(
        claimId,
        'SUBMITTED',
        submittedBy,
        tenantId,
        branchId,
        { notes: 'Claim submitted to insurer', ...submissionData }
      );
    } catch (error) {
      logger.error('Submit claim error:', error);
      throw error;
    }
  }

  async resubmitClaim(claimId, resubmissionData, resubmittedBy, tenantId, branchId) {
    try {
      const claimResult = await this.getClaimById(claimId, tenantId, branchId);
      
      if (!claimResult.success) {
        return claimResult;
      }

      const claim = claimResult.data;
      
      if (claim.status !== 'REJECTED' || !claim.rejectionDetails?.canResubmit) {
        return {
          success: false,
          message: 'Claim cannot be resubmitted'
        };
      }

      // Add resubmission history
      const resubmissionEntry = {
        resubmittedAt: new Date(),
        resubmittedBy: resubmittedBy.userId || resubmittedBy,
        resubmissionReason: resubmissionData.reason,
        previousStatus: claim.status,
        changesMode: resubmissionData.changes || 'Updated documents and information'
      };

      const updatedClaim = await InsuranceClaim.findOneAndUpdate(
        { claimId, tenantId, branchId },
        {
          $push: { resubmissionHistory: resubmissionEntry },
          status: 'SUBMITTED',
          submissionDetails: {
            submittedAt: new Date(),
            submittedBy: resubmittedBy.userId || resubmittedBy,
            submissionMethod: resubmissionData.method || 'manual',
            submissionReference: resubmissionData.reference
          }
        },
        { new: true }
      );

      // Add status history
      updatedClaim.addStatusHistory(
        'SUBMITTED',
        resubmittedBy.userId || resubmittedBy,
        'Claim resubmitted after rejection'
      );

      await updatedClaim.save();
      
      // Update cache
      await CacheService.setClaim(claimId, updatedClaim.toObject());
      
      // Log audit
      await AuditService.logClaimAction(
        claimId,
        'CLAIM_RESUBMITTED',
        resubmittedBy,
        tenantId,
        branchId,
        resubmissionData
      );

      logger.info('Claim resubmitted:', { claimId });
      
      return {
        success: true,
        data: updatedClaim.toObject(),
        message: 'Claim resubmitted successfully'
      };
    } catch (error) {
      logger.error('Resubmit claim error:', error);
      throw error;
    }
  }

  canUpdateClaim(status) {
    return ['DRAFT', 'REJECTED'].includes(status);
  }

  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'DRAFT': ['SUBMITTED', 'CANCELLED'],
      'SUBMITTED': ['UNDER_REVIEW', 'REJECTED', 'CANCELLED'],
      'UNDER_REVIEW': ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'],
      'APPROVED': ['SETTLED'],
      'PARTIALLY_APPROVED': ['SETTLED'],
      'REJECTED': ['SUBMITTED'], // For resubmission
      'SETTLED': [], // Final status
      'CANCELLED': [] // Final status
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  updateStatusSpecificFields(claim, newStatus, statusData, updatedBy) {
    const now = new Date();
    const userId = updatedBy.userId || updatedBy;

    switch (newStatus) {
      case 'UNDER_REVIEW':
        claim.reviewDetails = {
          reviewStartDate: now,
          reviewerName: statusData.reviewerName,
          reviewNotes: statusData.notes
        };
        break;

      case 'APPROVED':
      case 'PARTIALLY_APPROVED':
        claim.approvalDetails = {
          approvedAt: now,
          approvedBy: statusData.approvedBy,
          approvalReference: statusData.reference,
          approvalNotes: statusData.notes,
          partialApprovalReason: newStatus === 'PARTIALLY_APPROVED' ? statusData.partialReason : undefined
        };
        claim.financialDetails.approvedAmount = statusData.approvedAmount || claim.financialDetails.claimAmount;
        break;

      case 'REJECTED':
        claim.rejectionDetails = {
          rejectedAt: now,
          rejectionReason: statusData.reason,
          rejectionCode: statusData.code,
          rejectionNotes: statusData.notes,
          appealDeadline: statusData.appealDeadline,
          canResubmit: statusData.canResubmit !== false
        };
        break;

      case 'SETTLED':
        claim.settlementDetails = {
          settledAt: now,
          settlementReference: statusData.reference,
          settlementMethod: statusData.method,
          settlementNotes: statusData.notes
        };
        claim.financialDetails.settledAmount = statusData.settledAmount || claim.financialDetails.approvedAmount;
        break;
    }

    claim.updatedBy = userId;
  }

  validateClaimForSubmission(claim) {
    const errors = [];

    // Check required fields
    if (!claim.treatmentDetails.treatmentDate) {
      errors.push('Treatment date is required');
    }

    if (!claim.treatmentDetails.treatmentType) {
      errors.push('Treatment type is required');
    }

    if (!claim.financialDetails.totalAmount || claim.financialDetails.totalAmount <= 0) {
      errors.push('Valid total amount is required');
    }

    // Check required documents
    const requiredDocTypes = ['invoice', 'treatment_summary'];
    const uploadedDocTypes = claim.documents.map(doc => doc.documentType);
    
    for (const requiredType of requiredDocTypes) {
      if (!uploadedDocTypes.includes(requiredType)) {
        errors.push(`Required document missing: ${requiredType}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new ClaimService();