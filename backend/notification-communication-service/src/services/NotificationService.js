const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/Notification');
const Template = require('../models/Template');
const NotificationPreference = require('../models/NotificationPreference');
const EmailService = require('./EmailService');
const SMSService = require('./SMSService');
const WhatsAppService = require('./WhatsAppService');
const InAppService = require('./InAppService');
const QueueService = require('./QueueService');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.whatsappService = new WhatsAppService();
    this.inAppService = new InAppService();
    this.queueService = new QueueService();
  }

  async sendNotification(notificationData) {
    try {
      const {
        tenantId,
        branchId,
        recipientId,
        recipientType,
        templateCode,
        channel,
        variables = {},
        priority = 'NORMAL',
        scheduledAt,
        metadata = {}
      } = notificationData;

      // Generate notification ID
      const notificationId = uuidv4();

      // Get template
      const template = await Template.findByCode(tenantId, templateCode);
      if (!template) {
        throw new Error(`Template not found: ${templateCode}`);
      }

      // Validate template variables
      const validation = template.validateVariables(variables);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      // Check user preferences
      const preferences = await NotificationPreference.findByUser(tenantId, recipientId);
      if (preferences && !preferences.canReceiveNotification(channel, template.category, priority)) {
        logger.info('Notification blocked by user preferences', {
          notificationId,
          tenantId,
          recipientId,
          channel,
          templateCode
        });
        return {
          success: false,
          message: 'Notification blocked by user preferences',
          notificationId
        };
      }

      // Render template content
      const rendered = template.renderContent(variables);

      // Create notification record
      const notification = new Notification({
        notificationId,
        tenantId,
        branchId,
        recipientId,
        recipientType,
        channel,
        templateCode,
        subject: rendered.subject,
        content: rendered.content,
        variables: new Map(Object.entries(variables)),
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        metadata: {
          sourceService: metadata.sourceService || 'unknown',
          eventType: metadata.eventType,
          entityId: metadata.entityId,
          correlationId: metadata.correlationId,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress
        }
      });

      await notification.save();

      // Queue for immediate or scheduled delivery
      if (scheduledAt && new Date(scheduledAt) > new Date()) {
        await this.queueService.scheduleNotification(notification);
        logger.info('Notification scheduled', {
          notificationId,
          scheduledAt,
          tenantId,
          channel
        });
      } else {
        await this.queueService.queueNotification(notification);
        logger.info('Notification queued for immediate delivery', {
          notificationId,
          tenantId,
          channel
        });
      }

      // Update template usage
      await template.incrementUsage();

      return {
        success: true,
        notificationId,
        status: 'QUEUED',
        scheduledAt: notification.scheduledAt
      };

    } catch (error) {
      logger.error('Failed to send notification', {
        error: error.message,
        stack: error.stack,
        notificationData
      });
      throw error;
    }
  }

  async sendBulkNotifications(bulkData) {
    try {
      const {
        tenantId,
        branchId,
        recipients,
        templateCode,
        channel,
        globalVariables = {},
        priority = 'NORMAL',
        scheduledAt,
        metadata = {}
      } = bulkData;

      const results = [];
      const batchSize = 10;

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const batchPromises = batch.map(async (recipient) => {
          try {
            const notificationData = {
              tenantId,
              branchId,
              recipientId: recipient.recipientId,
              recipientType: recipient.recipientType,
              templateCode,
              channel,
              variables: { ...globalVariables, ...recipient.variables },
              priority,
              scheduledAt,
              metadata: {
                ...metadata,
                batchId: uuidv4(),
                batchIndex: i / batchSize
              }
            };

            const result = await this.sendNotification(notificationData);
            return {
              recipientId: recipient.recipientId,
              ...result
            };
          } catch (error) {
            logger.error('Bulk notification failed for recipient', {
              recipientId: recipient.recipientId,
              error: error.message,
              tenantId
            });
            return {
              recipientId: recipient.recipientId,
              success: false,
              error: error.message
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      logger.info('Bulk notification completed', {
        tenantId,
        templateCode,
        channel,
        total: results.length,
        successful,
        failed
      });

      return {
        success: true,
        total: results.length,
        successful,
        failed,
        results
      };

    } catch (error) {
      logger.error('Bulk notification failed', {
        error: error.message,
        stack: error.stack,
        bulkData
      });
      throw error;
    }
  }

  async processNotification(notification) {
    try {
      notification.status = 'PROCESSING';
      await notification.save();

      let result;
      switch (notification.channel) {
        case 'EMAIL':
          result = await this.emailService.send(notification);
          break;
        case 'SMS':
          result = await this.smsService.send(notification);
          break;
        case 'WHATSAPP':
          result = await this.whatsappService.send(notification);
          break;
        case 'IN_APP':
          result = await this.inAppService.send(notification);
          break;
        case 'PUSH':
          result = await this.pushService.send(notification);
          break;
        default:
          throw new Error(`Unsupported channel: ${notification.channel}`);
      }

      if (result.success) {
        await notification.markAsSent(result.externalId, result.providerDetails);
        logger.info('Notification sent successfully', {
          notificationId: notification.notificationId,
          channel: notification.channel,
          externalId: result.externalId
        });
      } else {
        await notification.markAsFailed(result.error, result.errorDetails);
        logger.error('Notification delivery failed', {
          notificationId: notification.notificationId,
          channel: notification.channel,
          error: result.error
        });
      }

      return result;

    } catch (error) {
      await notification.markAsFailed(error.message);
      logger.error('Notification processing failed', {
        notificationId: notification.notificationId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async retryFailedNotification(notificationId) {
    try {
      const notification = await Notification.findOne({ notificationId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (!notification.canRetry()) {
        throw new Error('Notification cannot be retried');
      }

      await notification.incrementRetry();
      
      if (notification.status === 'QUEUED') {
        await this.queueService.queueNotification(notification);
        logger.info('Notification queued for retry', {
          notificationId,
          retryCount: notification.retryCount
        });
      }

      return {
        success: true,
        notificationId,
        retryCount: notification.retryCount,
        status: notification.status
      };

    } catch (error) {
      logger.error('Failed to retry notification', {
        notificationId,
        error: error.message
      });
      throw error;
    }
  }

  async getNotificationStatus(notificationId) {
    try {
      const notification = await Notification.findOne({ notificationId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      return {
        notificationId: notification.notificationId,
        status: notification.status,
        channel: notification.channel,
        recipientId: notification.recipientId,
        templateCode: notification.templateCode,
        createdAt: notification.createdAt,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        failedAt: notification.failedAt,
        retryCount: notification.retryCount,
        errorMessage: notification.errorMessage,
        externalId: notification.externalId,
        deliveryDetails: notification.deliveryDetails
      };

    } catch (error) {
      logger.error('Failed to get notification status', {
        notificationId,
        error: error.message
      });
      throw error;
    }
  }

  async getNotificationHistory(tenantId, options = {}) {
    try {
      const {
        recipientId,
        channel,
        status,
        templateCode,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = options;

      const query = { tenantId };
      
      if (recipientId) query.recipientId = recipientId;
      if (channel) query.channel = channel;
      if (status) query.status = status;
      if (templateCode) query.templateCode = templateCode;
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-variables -content -metadata');

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Failed to get notification history', {
        tenantId,
        options,
        error: error.message
      });
      throw error;
    }
  }

  async getNotificationStats(tenantId, dateRange = {}) {
    try {
      const [statusCounts, channelStats] = await Promise.all([
        Notification.getStatusCounts(tenantId, dateRange),
        Notification.getChannelStats(tenantId, dateRange)
      ]);

      return {
        statusCounts,
        channelStats,
        dateRange
      };

    } catch (error) {
      logger.error('Failed to get notification stats', {
        tenantId,
        dateRange,
        error: error.message
      });
      throw error;
    }
  }

  async handleDeliveryWebhook(provider, payload) {
    try {
      let notificationUpdate;

      switch (provider) {
        case 'twilio':
          notificationUpdate = await this.handleTwilioWebhook(payload);
          break;
        case 'sendgrid':
          notificationUpdate = await this.handleSendGridWebhook(payload);
          break;
        default:
          logger.warn('Unknown webhook provider', { provider, payload });
          return { success: false, message: 'Unknown provider' };
      }

      if (notificationUpdate) {
        logger.info('Delivery status updated via webhook', {
          provider,
          notificationId: notificationUpdate.notificationId,
          status: notificationUpdate.status
        });
      }

      return { success: true };

    } catch (error) {
      logger.error('Webhook processing failed', {
        provider,
        error: error.message,
        payload
      });
      throw error;
    }
  }

  async handleTwilioWebhook(payload) {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload;
    
    const notification = await Notification.findOne({ 
      'deliveryDetails.providerMessageId': MessageSid 
    });

    if (!notification) {
      logger.warn('Notification not found for Twilio webhook', { MessageSid });
      return null;
    }

    switch (MessageStatus) {
      case 'delivered':
        await notification.markAsDelivered({
          deliveryTime: new Date(),
          providerStatus: MessageStatus
        });
        break;
      case 'failed':
      case 'undelivered':
        await notification.markAsFailed(ErrorMessage || 'Delivery failed', {
          errorCode: ErrorCode,
          errorDescription: ErrorMessage
        });
        break;
    }

    return notification;
  }

  async handleSendGridWebhook(payload) {
    // Implementation for SendGrid webhook handling
    // Similar to Twilio but for email delivery status
    return null;
  }
}

module.exports = NotificationService;