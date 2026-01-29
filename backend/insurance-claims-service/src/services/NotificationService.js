const axios = require('axios');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL;
    this.timeout = 5000; // 5 seconds
  }

  async sendClaimStatusNotification(claim, newStatus) {
    try {
      if (!this.notificationServiceUrl) {
        logger.warn('Notification service URL not configured');
        return false;
      }

      const notificationData = {
        type: 'insurance_claim_status_update',
        recipients: [
          {
            type: 'patient',
            id: claim.patientId
          },
          {
            type: 'staff',
            role: 'insurance_staff',
            tenantId: claim.tenantId,
            branchId: claim.branchId
          }
        ],
        data: {
          claimId: claim.claimId,
          claimNumber: claim.claimNumber,
          patientId: claim.patientId,
          status: newStatus,
          previousStatus: claim.status,
          insurer: claim.insurer.name,
          claimAmount: claim.financialDetails.claimAmount,
          approvedAmount: claim.financialDetails.approvedAmount,
          treatmentType: claim.treatmentDetails.treatmentType,
          treatmentDate: claim.treatmentDetails.treatmentDate
        },
        templates: {
          email: this.getEmailTemplate(newStatus),
          sms: this.getSmsTemplate(newStatus),
          push: this.getPushTemplate(newStatus)
        },
        priority: this.getNotificationPriority(newStatus),
        tenantId: claim.tenantId,
        branchId: claim.branchId
      };

      const response = await axios.post(
        `${this.notificationServiceUrl}/notifications/send`,
        notificationData,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Claim status notification sent:', {
        claimId: claim.claimId,
        status: newStatus,
        notificationId: response.data?.notificationId
      });

      return true;
    } catch (error) {
      logger.error('Send claim notification error:', {
        claimId: claim.claimId,
        status: newStatus,
        error: error.message
      });
      return false;
    }
  }

  async sendClaimReminderNotification(claim, reminderType) {
    try {
      if (!this.notificationServiceUrl) {
        logger.warn('Notification service URL not configured');
        return false;
      }

      const notificationData = {
        type: 'insurance_claim_reminder',
        recipients: [
          {
            type: 'staff',
            role: 'insurance_staff',
            tenantId: claim.tenantId,
            branchId: claim.branchId
          }
        ],
        data: {
          claimId: claim.claimId,
          claimNumber: claim.claimNumber,
          patientId: claim.patientId,
          status: claim.status,
          reminderType,
          daysSinceSubmission: claim.daysSinceSubmission(),
          insurer: claim.insurer.name,
          claimAmount: claim.financialDetails.claimAmount
        },
        templates: {
          email: this.getReminderEmailTemplate(reminderType),
          push: this.getReminderPushTemplate(reminderType)
        },
        priority: 'normal',
        tenantId: claim.tenantId,
        branchId: claim.branchId
      };

      const response = await axios.post(
        `${this.notificationServiceUrl}/notifications/send`,
        notificationData,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Claim reminder notification sent:', {
        claimId: claim.claimId,
        reminderType,
        notificationId: response.data?.notificationId
      });

      return true;
    } catch (error) {
      logger.error('Send claim reminder error:', {
        claimId: claim.claimId,
        reminderType,
        error: error.message
      });
      return false;
    }
  }

  async sendPolicyExpirationNotification(policy, daysUntilExpiry) {
    try {
      if (!this.notificationServiceUrl) {
        logger.warn('Notification service URL not configured');
        return false;
      }

      const notificationData = {
        type: 'insurance_policy_expiration',
        recipients: [
          {
            type: 'patient',
            id: policy.patientId
          },
          {
            type: 'staff',
            role: 'insurance_staff',
            tenantId: policy.tenantId,
            branchId: policy.branchId
          }
        ],
        data: {
          policyId: policy.policyId,
          policyNumber: policy.policyNumber,
          patientId: policy.patientId,
          provider: policy.provider.name,
          expirationDate: policy.validityPeriod.endDate,
          daysUntilExpiry
        },
        templates: {
          email: 'insurance_policy_expiration_email',
          sms: 'insurance_policy_expiration_sms',
          push: 'insurance_policy_expiration_push'
        },
        priority: daysUntilExpiry <= 7 ? 'high' : 'normal',
        tenantId: policy.tenantId,
        branchId: policy.branchId
      };

      const response = await axios.post(
        `${this.notificationServiceUrl}/notifications/send`,
        notificationData,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Policy expiration notification sent:', {
        policyId: policy.policyId,
        daysUntilExpiry,
        notificationId: response.data?.notificationId
      });

      return true;
    } catch (error) {
      logger.error('Send policy expiration notification error:', {
        policyId: policy.policyId,
        error: error.message
      });
      return false;
    }
  }

  getEmailTemplate(status) {
    const templates = {
      'SUBMITTED': 'claim_submitted_email',
      'UNDER_REVIEW': 'claim_under_review_email',
      'APPROVED': 'claim_approved_email',
      'PARTIALLY_APPROVED': 'claim_partially_approved_email',
      'REJECTED': 'claim_rejected_email',
      'SETTLED': 'claim_settled_email'
    };
    return templates[status] || 'claim_status_update_email';
  }

  getSmsTemplate(status) {
    const templates = {
      'SUBMITTED': 'claim_submitted_sms',
      'APPROVED': 'claim_approved_sms',
      'REJECTED': 'claim_rejected_sms',
      'SETTLED': 'claim_settled_sms'
    };
    return templates[status] || 'claim_status_update_sms';
  }

  getPushTemplate(status) {
    const templates = {
      'SUBMITTED': 'claim_submitted_push',
      'UNDER_REVIEW': 'claim_under_review_push',
      'APPROVED': 'claim_approved_push',
      'PARTIALLY_APPROVED': 'claim_partially_approved_push',
      'REJECTED': 'claim_rejected_push',
      'SETTLED': 'claim_settled_push'
    };
    return templates[status] || 'claim_status_update_push';
  }

  getReminderEmailTemplate(reminderType) {
    const templates = {
      'status_check': 'claim_status_check_reminder_email',
      'document_request': 'claim_document_request_reminder_email',
      'settlement_follow_up': 'claim_settlement_follow_up_email'
    };
    return templates[reminderType] || 'claim_reminder_email';
  }

  getReminderPushTemplate(reminderType) {
    const templates = {
      'status_check': 'claim_status_check_reminder_push',
      'document_request': 'claim_document_request_reminder_push',
      'settlement_follow_up': 'claim_settlement_follow_up_push'
    };
    return templates[reminderType] || 'claim_reminder_push';
  }

  getNotificationPriority(status) {
    const highPriorityStatuses = ['APPROVED', 'REJECTED', 'SETTLED'];
    return highPriorityStatuses.includes(status) ? 'high' : 'normal';
  }
}

module.exports = new NotificationService();