const axios = require('axios');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3010';
    this.enabled = process.env.NOTIFICATIONS_ENABLED !== 'false';
  }

  /**
   * Notify about new diagnostic order
   */
  async notifyNewOrder(order) {
    if (!this.enabled) return;

    try {
      const notification = {
        type: 'DIAGNOSTIC_ORDER_CREATED',
        tenantId: order.tenantId,
        branchId: order.branchId,
        recipients: [
          {
            type: 'ROLE',
            value: 'LAB_STAFF',
            branchId: order.branchId
          }
        ],
        data: {
          orderId: order.orderId,
          testType: order.testType,
          priority: order.priority,
          patientId: order.patientId,
          doctorId: order.doctorId,
          doctorNotes: order.doctorNotes
        },
        title: `New ${order.testType} Order`,
        message: `New ${order.priority.toLowerCase()} priority ${order.testType} order created`,
        actionUrl: `/lab/orders/${order.orderId}`,
        metadata: {
          orderId: order.orderId,
          priority: order.priority
        }
      };

      await this.sendNotification(notification);
      
      logger.info('New order notification sent', {
        orderId: order.orderId,
        tenantId: order.tenantId
      });
    } catch (error) {
      logger.error('Failed to send new order notification:', error);
    }
  }

  /**
   * Notify about status change
   */
  async notifyStatusChange(order, newStatus) {
    if (!this.enabled) return;

    try {
      const recipients = [];
      
      // Always notify the ordering doctor
      recipients.push({
        type: 'USER',
        value: order.doctorId
      });

      // Notify patient when completed
      if (newStatus === 'COMPLETED') {
        recipients.push({
          type: 'USER',
          value: order.patientId
        });
      }

      // Notify lab staff when assigned
      if (newStatus === 'ASSIGNED' && order.assignedLabStaffId) {
        recipients.push({
          type: 'USER',
          value: order.assignedLabStaffId
        });
      }

      const notification = {
        type: 'DIAGNOSTIC_ORDER_STATUS_CHANGED',
        tenantId: order.tenantId,
        branchId: order.branchId,
        recipients,
        data: {
          orderId: order.orderId,
          oldStatus: order.status,
          newStatus,
          testType: order.testType,
          patientId: order.patientId,
          doctorId: order.doctorId
        },
        title: `Diagnostic Order ${newStatus}`,
        message: `${order.testType} order is now ${newStatus.toLowerCase()}`,
        actionUrl: `/orders/${order.orderId}`,
        metadata: {
          orderId: order.orderId,
          status: newStatus
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Status change notification sent', {
        orderId: order.orderId,
        newStatus
      });
    } catch (error) {
      logger.error('Failed to send status change notification:', error);
    }
  }

  /**
   * Notify about order assignment
   */
  async notifyOrderAssignment(order, labStaffId) {
    if (!this.enabled) return;

    try {
      const notification = {
        type: 'DIAGNOSTIC_ORDER_ASSIGNED',
        tenantId: order.tenantId,
        branchId: order.branchId,
        recipients: [
          {
            type: 'USER',
            value: labStaffId
          }
        ],
        data: {
          orderId: order.orderId,
          testType: order.testType,
          priority: order.priority,
          patientId: order.patientId,
          doctorId: order.doctorId,
          doctorNotes: order.doctorNotes
        },
        title: 'Diagnostic Order Assigned',
        message: `${order.testType} order has been assigned to you`,
        actionUrl: `/lab/orders/${order.orderId}`,
        metadata: {
          orderId: order.orderId,
          priority: order.priority
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Assignment notification sent', {
        orderId: order.orderId,
        labStaffId
      });
    } catch (error) {
      logger.error('Failed to send assignment notification:', error);
    }
  }

  /**
   * Notify about AI analysis completion
   */
  async notifyAIAnalysisComplete(aiResult) {
    if (!this.enabled) return;

    try {
      const notification = {
        type: 'AI_ANALYSIS_COMPLETED',
        tenantId: aiResult.tenantId,
        branchId: aiResult.branchId,
        recipients: [
          {
            type: 'ROLE',
            value: 'DOCTOR',
            branchId: aiResult.branchId
          },
          {
            type: 'ROLE',
            value: 'LAB_STAFF',
            branchId: aiResult.branchId
          }
        ],
        data: {
          resultId: aiResult.resultId,
          orderId: aiResult.orderId,
          analysisType: aiResult.analysisType,
          confidence: aiResult.confidence,
          findingsCount: aiResult.findings.length,
          status: aiResult.status
        },
        title: 'AI Analysis Complete',
        message: `AI analysis for ${aiResult.analysisType} is complete with ${aiResult.findings.length} findings`,
        actionUrl: `/lab/results/${aiResult.resultId}`,
        metadata: {
          resultId: aiResult.resultId,
          orderId: aiResult.orderId
        }
      };

      await this.sendNotification(notification);
      
      logger.info('AI analysis completion notification sent', {
        resultId: aiResult.resultId,
        orderId: aiResult.orderId
      });
    } catch (error) {
      logger.error('Failed to send AI analysis notification:', error);
    }
  }

  /**
   * Notify about urgent findings
   */
  async notifyUrgentFindings(aiResult, urgentFindings) {
    if (!this.enabled) return;

    try {
      const notification = {
        type: 'URGENT_FINDINGS_DETECTED',
        tenantId: aiResult.tenantId,
        branchId: aiResult.branchId,
        priority: 'HIGH',
        recipients: [
          {
            type: 'ROLE',
            value: 'DOCTOR',
            branchId: aiResult.branchId
          },
          {
            type: 'ROLE',
            value: 'HEAD_NURSE',
            branchId: aiResult.branchId
          },
          {
            type: 'ROLE',
            value: 'BRANCH_ADMIN',
            branchId: aiResult.branchId
          }
        ],
        data: {
          resultId: aiResult.resultId,
          orderId: aiResult.orderId,
          analysisType: aiResult.analysisType,
          urgentFindingsCount: urgentFindings.length,
          findings: urgentFindings.map(f => ({
            type: f.type,
            severity: f.severity,
            location: f.location,
            confidence: f.confidence
          }))
        },
        title: '🚨 URGENT: Critical Findings Detected',
        message: `${urgentFindings.length} critical findings detected in diagnostic analysis`,
        actionUrl: `/lab/results/${aiResult.resultId}`,
        metadata: {
          resultId: aiResult.resultId,
          orderId: aiResult.orderId,
          urgentCount: urgentFindings.length
        }
      };

      await this.sendNotification(notification);
      
      logger.warn('Urgent findings notification sent', {
        resultId: aiResult.resultId,
        urgentFindingsCount: urgentFindings.length
      });
    } catch (error) {
      logger.error('Failed to send urgent findings notification:', error);
    }
  }

  /**
   * Send notification to notification service
   */
  async sendNotification(notification) {
    try {
      const response = await axios.post(
        `${this.notificationServiceUrl}/api/notifications`,
        notification,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Name': 'lab-diagnostics-service'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logger.warn('Notification service unavailable');
      } else {
        logger.error('Failed to send notification:', error.message);
      }
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(emailData) {
    if (!this.enabled) return;

    try {
      const response = await axios.post(
        `${this.notificationServiceUrl}/api/notifications/email`,
        emailData,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Name': 'lab-diagnostics-service'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(smsData) {
    if (!this.enabled) return;

    try {
      const response = await axios.post(
        `${this.notificationServiceUrl}/api/notifications/sms`,
        smsData,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Name': 'lab-diagnostics-service'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;