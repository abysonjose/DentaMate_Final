const ClaimAuditLog = require('../models/ClaimAuditLog');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AuditService {
  async logClaimAction(claimId, action, performedBy, tenantId, branchId, metadata = {}) {
    try {
      const auditLog = new ClaimAuditLog({
        auditId: uuidv4(),
        claimId,
        tenantId,
        branchId,
        action,
        performedBy: {
          userId: performedBy.userId || performedBy,
          userRole: performedBy.role,
          userName: performedBy.userName
        },
        metadata: {
          ...metadata,
          timestamp: new Date()
        },
        description: this.generateActionDescription(action, metadata),
        severity: this.determineSeverity(action)
      });

      await auditLog.save();
      
      logger.info('Claim audit logged:', {
        claimId,
        action,
        userId: performedBy.userId || performedBy
      });

      return auditLog;
    } catch (error) {
      logger.error('Audit logging error:', error);
      // Don't throw error to avoid breaking main operations
      return null;
    }
  }

  async logPolicyAction(policyId, action, performedBy, tenantId, branchId, metadata = {}) {
    try {
      // For policy actions, we'll use a similar structure but with policyId as claimId
      // This allows us to track policy-related actions in the same audit system
      const auditLog = new ClaimAuditLog({
        auditId: uuidv4(),
        claimId: policyId, // Using policyId in claimId field for policy actions
        tenantId,
        branchId,
        action,
        performedBy: {
          userId: performedBy.userId || performedBy,
          userRole: performedBy.role,
          userName: performedBy.userName
        },
        metadata: {
          ...metadata,
          entityType: 'policy',
          timestamp: new Date()
        },
        description: this.generateActionDescription(action, metadata),
        severity: this.determineSeverity(action)
      });

      await auditLog.save();
      
      logger.info('Policy audit logged:', {
        policyId,
        action,
        userId: performedBy.userId || performedBy
      });

      return auditLog;
    } catch (error) {
      logger.error('Policy audit logging error:', error);
      return null;
    }
  }

  async getClaimAuditHistory(claimId, tenantId, branchId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        action,
        startDate,
        endDate
      } = options;

      const query = {
        claimId,
        tenantId,
        branchId
      };

      if (action) {
        query.action = action;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [auditLogs, total] = await Promise.all([
        ClaimAuditLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ClaimAuditLog.countDocuments(query)
      ]);

      return {
        success: true,
        data: auditLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Get audit history error:', error);
      throw error;
    }
  }

  async getTenantAuditSummary(tenantId, branchId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date()
      } = options;

      const pipeline = [
        {
          $match: {
            tenantId,
            branchId,
            timestamp: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            lastOccurrence: { $max: '$timestamp' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const summary = await ClaimAuditLog.aggregate(pipeline);

      return {
        success: true,
        data: summary,
        period: {
          startDate,
          endDate
        }
      };
    } catch (error) {
      logger.error('Get audit summary error:', error);
      throw error;
    }
  }

  generateActionDescription(action, metadata = {}) {
    const descriptions = {
      'CLAIM_CREATED': 'Insurance claim created',
      'CLAIM_UPDATED': 'Insurance claim updated',
      'STATUS_CHANGED': `Claim status changed to ${metadata.newStatus || 'unknown'}`,
      'DOCUMENT_UPLOADED': `Document uploaded: ${metadata.documentType || 'unknown type'}`,
      'DOCUMENT_REMOVED': `Document removed: ${metadata.documentType || 'unknown type'}`,
      'CLAIM_SUBMITTED': 'Claim submitted to insurer',
      'CLAIM_RESUBMITTED': 'Claim resubmitted to insurer',
      'APPROVAL_RECEIVED': 'Approval received from insurer',
      'REJECTION_RECEIVED': 'Rejection received from insurer',
      'SETTLEMENT_RECORDED': 'Settlement amount recorded',
      'CLAIM_CANCELLED': 'Claim cancelled',
      'FOLLOW_UP_ADDED': 'Follow-up reminder added',
      'NOTES_UPDATED': 'Internal notes updated',
      'POLICY_CREATED': 'Insurance policy created',
      'POLICY_UPDATED': 'Insurance policy updated',
      'POLICY_VERIFIED': 'Insurance policy verification updated'
    };

    return descriptions[action] || `Action performed: ${action}`;
  }

  determineSeverity(action) {
    const severityMap = {
      'CLAIM_CREATED': 'medium',
      'CLAIM_UPDATED': 'low',
      'STATUS_CHANGED': 'medium',
      'DOCUMENT_UPLOADED': 'low',
      'DOCUMENT_REMOVED': 'medium',
      'CLAIM_SUBMITTED': 'high',
      'CLAIM_RESUBMITTED': 'high',
      'APPROVAL_RECEIVED': 'high',
      'REJECTION_RECEIVED': 'high',
      'SETTLEMENT_RECORDED': 'high',
      'CLAIM_CANCELLED': 'medium',
      'FOLLOW_UP_ADDED': 'low',
      'NOTES_UPDATED': 'low',
      'POLICY_CREATED': 'medium',
      'POLICY_UPDATED': 'low',
      'POLICY_VERIFIED': 'medium'
    };

    return severityMap[action] || 'medium';
  }

  async cleanupOldAuditLogs(retentionDays = 365) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const result = await ClaimAuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info('Audit logs cleanup completed:', {
        deletedCount: result.deletedCount,
        cutoffDate
      });

      return result;
    } catch (error) {
      logger.error('Audit logs cleanup error:', error);
      throw error;
    }
  }
}

module.exports = new AuditService();