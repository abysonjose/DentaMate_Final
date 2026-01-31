const express = require('express');
const { authenticateToken, validateTenantAccess } = require('../middleware/auth');
const { notificationLimiter, bulkLimiter } = require('../middleware/rateLimiter');
const {
  validateNotificationSend,
  validateBulkNotification,
  validateEventTrigger,
  validateUUID,
  validatePagination
} = require('../middleware/validation');
const NotificationService = require('../services/NotificationService');
const logger = require('../utils/logger');

const router = express.Router();
const notificationService = new NotificationService();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(validateTenantAccess);

/**
 * @route POST /api/notifications/send
 * @desc Send a single notification
 * @access Private (Service-to-Service)
 */
router.post('/send', 
  notificationLimiter,
  validateNotificationSend,
  async (req, res) => {
    try {
      const notificationData = {
        ...req.body,
        tenantId: req.tenantId,
        metadata: {
          sourceService: req.serviceId,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          ...req.body.metadata
        }
      };

      const result = await notificationService.sendNotification(notificationData);

      logger.info('Notification send request processed', {
        notificationId: result.notificationId,
        success: result.success,
        tenantId: req.tenantId,
        serviceId: req.serviceId
      });

      res.status(201).json({
        success: true,
        message: 'Notification queued successfully',
        data: result
      });

    } catch (error) {
      logger.error('Failed to send notification', {
        error: error.message,
        tenantId: req.tenantId,
        serviceId: req.serviceId,
        body: req.body
      });

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/notifications/bulk
 * @desc Send bulk notifications
 * @access Private (Service-to-Service)
 */
router.post('/bulk',
  bulkLimiter,
  validateBulkNotification,
  async (req, res) => {
    try {
      const bulkData = {
        ...req.body,
        tenantId: req.tenantId,
        metadata: {
          sourceService: req.serviceId,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          ...req.body.metadata
        }
      };

      const result = await notificationService.sendBulkNotifications(bulkData);

      logger.info('Bulk notification request processed', {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        tenantId: req.tenantId,
        serviceId: req.serviceId
      });

      res.status(201).json({
        success: true,
        message: 'Bulk notifications processed',
        data: result
      });

    } catch (error) {
      logger.error('Failed to send bulk notifications', {
        error: error.message,
        tenantId: req.tenantId,
        serviceId: req.serviceId
      });

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/notifications/event
 * @desc Trigger notification based on event
 * @access Private (Service-to-Service)
 */
router.post('/event',
  notificationLimiter,
  validateEventTrigger,
  async (req, res) => {
    try {
      const { eventType, entityId, eventData, recipientIds } = req.body;

      // This would implement event-to-notification mapping
      // For now, return a placeholder response
      logger.info('Event-based notification triggered', {
        eventType,
        entityId,
        recipientCount: recipientIds?.length || 0,
        tenantId: req.tenantId,
        serviceId: req.serviceId
      });

      res.json({
        success: true,
        message: 'Event-based notification processing not yet implemented',
        eventType,
        entityId
      });

    } catch (error) {
      logger.error('Failed to process event notification', {
        error: error.message,
        tenantId: req.tenantId,
        serviceId: req.serviceId
      });

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/notifications/:id/status
 * @desc Get notification status
 * @access Private (Service-to-Service)
 */
router.get('/:id/status',
  validateUUID,
  async (req, res) => {
    try {
      const notificationId = req.params.id;
      const status = await notificationService.getNotificationStatus(notificationId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Failed to get notification status', {
        notificationId: req.params.id,
        error: error.message,
        tenantId: req.tenantId
      });

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get notification status'
        });
      }
    }
  }
);

/**
 * @route POST /api/notifications/:id/retry
 * @desc Retry failed notification
 * @access Private (Service-to-Service)
 */
router.post('/:id/retry',
  validateUUID,
  async (req, res) => {
    try {
      const notificationId = req.params.id;
      const result = await notificationService.retryFailedNotification(notificationId);

      logger.info('Notification retry requested', {
        notificationId,
        success: result.success,
        retryCount: result.retryCount,
        tenantId: req.tenantId
      });

      res.json({
        success: true,
        message: 'Notification queued for retry',
        data: result
      });

    } catch (error) {
      logger.error('Failed to retry notification', {
        notificationId: req.params.id,
        error: error.message,
        tenantId: req.tenantId
      });

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/notifications/history
 * @desc Get notification history
 * @access Private (Service-to-Service)
 */
router.get('/history',
  validatePagination,
  async (req, res) => {
    try {
      const options = {
        recipientId: req.query.recipientId,
        channel: req.query.channel,
        status: req.query.status,
        templateCode: req.query.templateCode,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await notificationService.getNotificationHistory(req.tenantId, options);

      res.json({
        success: true,
        data: result.notifications,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Failed to get notification history', {
        error: error.message,
        tenantId: req.tenantId,
        query: req.query
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get notification history'
      });
    }
  }
);

/**
 * @route GET /api/notifications/stats
 * @desc Get notification statistics
 * @access Private (Service-to-Service)
 */
router.get('/stats', async (req, res) => {
  try {
    const dateRange = {};
    if (req.query.startDate) dateRange.start = new Date(req.query.startDate);
    if (req.query.endDate) dateRange.end = new Date(req.query.endDate);

    const stats = await notificationService.getNotificationStats(req.tenantId, dateRange);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get notification stats', {
      error: error.message,
      tenantId: req.tenantId,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics'
    });
  }
});

/**
 * @route GET /api/notifications/queue/stats
 * @desc Get queue statistics
 * @access Private (Service-to-Service)
 */
router.get('/queue/stats', async (req, res) => {
  try {
    const QueueService = require('../services/QueueService');
    const queueService = new QueueService();
    const stats = await queueService.getQueueStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get queue stats', {
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics'
    });
  }
});

module.exports = router;