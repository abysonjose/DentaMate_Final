const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL;
  }

  async notifyCaseCreated(orthodonticCase) {
    try {
      const notification = {
        type: 'ORTHODONTIC_CASE_CREATED',
        recipients: [
          {
            userId: orthodonticCase.doctorId,
            role: 'DOCTOR',
            channel: 'IN_APP'
          }
        ],
        data: {
          caseId: orthodonticCase.caseId,
          patientId: orthodonticCase.patientId,
          caseType: orthodonticCase.caseType,
          priority: orthodonticCase.priority,
          tenantId: orthodonticCase.tenantId,
          branchId: orthodonticCase.branchId
        },
        template: {
          title: 'New Orthodontic Case Created',
          message: `A new ${orthodonticCase.caseType.toLowerCase()} case has been created for patient ${orthodonticCase.patientId}`,
          priority: orthodonticCase.priority
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Case creation notification sent', {
        caseId: orthodonticCase.caseId,
        doctorId: orthodonticCase.doctorId
      });
    } catch (error) {
      logger.error('Error sending case creation notification:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  async notifyStatusChange(orthodonticCase, newStatus) {
    try {
      const recipients = [];

      // Notify doctor
      recipients.push({
        userId: orthodonticCase.doctorId,
        role: 'DOCTOR',
        channel: 'IN_APP'
      });

      // Notify orthotist if assigned
      if (orthodonticCase.orthotistId) {
        recipients.push({
          userId: orthodonticCase.orthotistId,
          role: 'ORTHOTIST',
          channel: 'IN_APP'
        });
      }

      // Notify patient for certain status changes
      if (['READY', 'DELIVERED'].includes(newStatus)) {
        recipients.push({
          userId: orthodonticCase.patientId,
          role: 'PATIENT',
          channel: 'IN_APP'
        });
      }

      const notification = {
        type: 'ORTHODONTIC_STATUS_CHANGE',
        recipients,
        data: {
          caseId: orthodonticCase.caseId,
          patientId: orthodonticCase.patientId,
          oldStatus: orthodonticCase.status,
          newStatus,
          caseType: orthodonticCase.caseType,
          tenantId: orthodonticCase.tenantId,
          branchId: orthodonticCase.branchId
        },
        template: {
          title: 'Orthodontic Case Status Updated',
          message: `Case ${orthodonticCase.caseId} status changed to ${newStatus.replace('_', ' ').toLowerCase()}`,
          priority: orthodonticCase.priority
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Status change notification sent', {
        caseId: orthodonticCase.caseId,
        newStatus,
        recipientCount: recipients.length
      });
    } catch (error) {
      logger.error('Error sending status change notification:', error);
    }
  }

  async notifyDeliveryDateUpdate(orthodonticCase) {
    try {
      const recipients = [
        {
          userId: orthodonticCase.doctorId,
          role: 'DOCTOR',
          channel: 'IN_APP'
        },
        {
          userId: orthodonticCase.patientId,
          role: 'PATIENT',
          channel: 'IN_APP'
        }
      ];

      const notification = {
        type: 'ORTHODONTIC_DELIVERY_DATE_UPDATE',
        recipients,
        data: {
          caseId: orthodonticCase.caseId,
          patientId: orthodonticCase.patientId,
          estimatedDeliveryDate: orthodonticCase.estimatedDeliveryDate,
          caseType: orthodonticCase.caseType,
          tenantId: orthodonticCase.tenantId,
          branchId: orthodonticCase.branchId
        },
        template: {
          title: 'Delivery Date Updated',
          message: `Estimated delivery date for your ${orthodonticCase.caseType.toLowerCase()} has been updated`,
          priority: 'NORMAL'
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Delivery date update notification sent', {
        caseId: orthodonticCase.caseId,
        estimatedDeliveryDate: orthodonticCase.estimatedDeliveryDate
      });
    } catch (error) {
      logger.error('Error sending delivery date update notification:', error);
    }
  }

  async notifyOrthotistAssignment(orthodonticCase) {
    try {
      const notification = {
        type: 'ORTHODONTIC_CASE_ASSIGNED',
        recipients: [
          {
            userId: orthodonticCase.orthotistId,
            role: 'ORTHOTIST',
            channel: 'IN_APP'
          }
        ],
        data: {
          caseId: orthodonticCase.caseId,
          patientId: orthodonticCase.patientId,
          caseType: orthodonticCase.caseType,
          priority: orthodonticCase.priority,
          doctorId: orthodonticCase.doctorId,
          tenantId: orthodonticCase.tenantId,
          branchId: orthodonticCase.branchId
        },
        template: {
          title: 'New Case Assigned',
          message: `A new ${orthodonticCase.caseType.toLowerCase()} case has been assigned to you`,
          priority: orthodonticCase.priority
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Orthotist assignment notification sent', {
        caseId: orthodonticCase.caseId,
        orthotistId: orthodonticCase.orthotistId
      });
    } catch (error) {
      logger.error('Error sending orthotist assignment notification:', error);
    }
  }

  async notifyMeasurementUploaded(measurement) {
    try {
      // Get case details to determine recipients
      const OrthodonticCase = require('../models/OrthodonticCase');
      const orthodonticCase = await OrthodonticCase.findOne({
        caseId: measurement.caseId,
        tenantId: measurement.tenantId
      });

      if (!orthodonticCase) {
        logger.warn('Case not found for measurement notification', {
          caseId: measurement.caseId
        });
        return;
      }

      const recipients = [
        {
          userId: orthodonticCase.doctorId,
          role: 'DOCTOR',
          channel: 'IN_APP'
        }
      ];

      // Notify orthotist if assigned
      if (orthodonticCase.orthotistId) {
        recipients.push({
          userId: orthodonticCase.orthotistId,
          role: 'ORTHOTIST',
          channel: 'IN_APP'
        });
      }

      const notification = {
        type: 'ORTHODONTIC_MEASUREMENT_UPLOADED',
        recipients,
        data: {
          measurementId: measurement.measurementId,
          caseId: measurement.caseId,
          type: measurement.type,
          uploadedBy: measurement.uploadedBy,
          tenantId: measurement.tenantId,
          branchId: measurement.branchId
        },
        template: {
          title: 'New Measurement Uploaded',
          message: `A new ${measurement.type.replace('_', ' ').toLowerCase()} has been uploaded for case ${measurement.caseId}`,
          priority: 'NORMAL'
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Measurement upload notification sent', {
        measurementId: measurement.measurementId,
        caseId: measurement.caseId
      });
    } catch (error) {
      logger.error('Error sending measurement upload notification:', error);
    }
  }

  async notifyMeasurementStatusUpdate(measurement) {
    try {
      const OrthodonticCase = require('../models/OrthodonticCase');
      const orthodonticCase = await OrthodonticCase.findOne({
        caseId: measurement.caseId,
        tenantId: measurement.tenantId
      });

      if (!orthodonticCase) {
        return;
      }

      const recipients = [
        {
          userId: measurement.uploadedBy,
          role: 'DOCTOR', // Assuming uploader is doctor
          channel: 'IN_APP'
        }
      ];

      const notification = {
        type: 'ORTHODONTIC_MEASUREMENT_STATUS_UPDATE',
        recipients,
        data: {
          measurementId: measurement.measurementId,
          caseId: measurement.caseId,
          status: measurement.status,
          reviewedBy: measurement.reviewedBy,
          reviewNotes: measurement.reviewNotes,
          tenantId: measurement.tenantId,
          branchId: measurement.branchId
        },
        template: {
          title: 'Measurement Review Complete',
          message: `Your measurement has been ${measurement.status.toLowerCase()}`,
          priority: measurement.status === 'REJECTED' ? 'HIGH' : 'NORMAL'
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Measurement status update notification sent', {
        measurementId: measurement.measurementId,
        status: measurement.status
      });
    } catch (error) {
      logger.error('Error sending measurement status update notification:', error);
    }
  }

  async notifyIssueReported(orthodonticCase, issue) {
    try {
      const recipients = [
        {
          userId: orthodonticCase.doctorId,
          role: 'DOCTOR',
          channel: 'IN_APP'
        }
      ];

      const notification = {
        type: 'ORTHODONTIC_ISSUE_REPORTED',
        recipients,
        data: {
          caseId: orthodonticCase.caseId,
          issueId: issue.issueId,
          issueType: issue.type,
          description: issue.description,
          reportedBy: issue.reportedBy,
          tenantId: orthodonticCase.tenantId,
          branchId: orthodonticCase.branchId
        },
        template: {
          title: 'Issue Reported',
          message: `An issue has been reported for case ${orthodonticCase.caseId}: ${issue.type.replace('_', ' ').toLowerCase()}`,
          priority: 'HIGH'
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Issue reported notification sent', {
        caseId: orthodonticCase.caseId,
        issueId: issue.issueId
      });
    } catch (error) {
      logger.error('Error sending issue reported notification:', error);
    }
  }

  async notifyIssueUpdate(orthodonticCase, issue) {
    try {
      const recipients = [
        {
          userId: orthodonticCase.doctorId,
          role: 'DOCTOR',
          channel: 'IN_APP'
        },
        {
          userId: issue.reportedBy,
          role: 'ORTHOTIST', // Assuming reporter is orthotist
          channel: 'IN_APP'
        }
      ];

      const notification = {
        type: 'ORTHODONTIC_ISSUE_UPDATE',
        recipients,
        data: {
          caseId: orthodonticCase.caseId,
          issueId: issue.issueId,
          status: issue.status,
          resolution: issue.resolution,
          tenantId: orthodonticCase.tenantId,
          branchId: orthodonticCase.branchId
        },
        template: {
          title: 'Issue Updated',
          message: `Issue ${issue.issueId} has been ${issue.status.toLowerCase()}`,
          priority: 'NORMAL'
        }
      };

      await this.sendNotification(notification);
      
      logger.info('Issue update notification sent', {
        caseId: orthodonticCase.caseId,
        issueId: issue.issueId,
        status: issue.status
      });
    } catch (error) {
      logger.error('Error sending issue update notification:', error);
    }
  }

  async notifyOverdueCases(overdueCases) {
    try {
      // Group cases by doctor
      const casesByDoctor = overdueCases.reduce((acc, orthodonticCase) => {
        if (!acc[orthodonticCase.doctorId]) {
          acc[orthodonticCase.doctorId] = [];
        }
        acc[orthodonticCase.doctorId].push(orthodonticCase);
        return acc;
      }, {});

      // Send notifications to each doctor
      for (const [doctorId, cases] of Object.entries(casesByDoctor)) {
        const notification = {
          type: 'ORTHODONTIC_OVERDUE_CASES',
          recipients: [
            {
              userId: doctorId,
              role: 'DOCTOR',
              channel: 'EMAIL'
            }
          ],
          data: {
            overdueCases: cases.map(c => ({
              caseId: c.caseId,
              patientId: c.patientId,
              caseType: c.caseType,
              estimatedDeliveryDate: c.estimatedDeliveryDate,
              daysOverdue: Math.floor((Date.now() - c.estimatedDeliveryDate) / (1000 * 60 * 60 * 24))
            }))
          },
          template: {
            title: 'Overdue Orthodontic Cases',
            message: `You have ${cases.length} overdue orthodontic case(s)`,
            priority: 'HIGH'
          }
        };

        await this.sendNotification(notification);
      }

      logger.info('Overdue cases notifications sent', {
        totalCases: overdueCases.length,
        doctorCount: Object.keys(casesByDoctor).length
      });
    } catch (error) {
      logger.error('Error sending overdue cases notifications:', error);
    }
  }

  async sendNotification(notification) {
    try {
      if (!this.notificationServiceUrl) {
        logger.warn('Notification service URL not configured');
        return;
      }

      // In a real implementation, this would make an HTTP request to the notification service
      // For now, we'll just log the notification
      logger.info('Notification would be sent', {
        type: notification.type,
        recipientCount: notification.recipients.length,
        title: notification.template.title
      });

      // TODO: Implement actual HTTP request to notification service
      // const response = await fetch(`${this.notificationServiceUrl}/notifications`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${serviceToken}`
      //   },
      //   body: JSON.stringify(notification)
      // });

      // if (!response.ok) {
      //   throw new Error(`Notification service responded with ${response.status}`);
      // }

    } catch (error) {
      logger.error('Error sending notification to service:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.notificationServiceUrl) {
        return { 
          healthy: false, 
          message: 'Notification service URL not configured' 
        };
      }

      // TODO: Implement actual health check to notification service
      return { 
        healthy: true, 
        message: 'Notification service connection would be checked' 
      };
    } catch (error) {
      logger.error('Notification service health check failed:', error);
      return { 
        healthy: false, 
        message: `Notification service check failed: ${error.message}` 
      };
    }
  }
}

module.exports = NotificationService;