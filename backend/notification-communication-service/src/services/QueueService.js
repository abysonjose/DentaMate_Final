const Queue = require('bull');
const logger = require('../utils/logger');
const redisClient = require('../config/redis');

class QueueService {
  constructor() {
    this.notificationQueue = null;
    this.scheduledQueue = null;
    this.retryQueue = null;
    this.initializeQueues();
  }

  initializeQueues() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        lazyConnect: true
      };

      // Main notification processing queue
      this.notificationQueue = new Queue('notification processing', {
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
          backoff: {
            type: 'exponential',
            delay: parseInt(process.env.RETRY_DELAY) || 5000
          }
        }
      });

      // Scheduled notifications queue
      this.scheduledQueue = new Queue('scheduled notifications', {
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25
        }
      });

      // Retry queue for failed notifications
      this.retryQueue = new Queue('notification retry', {
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 25,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 30000 // 30 seconds
          }
        }
      });

      this.setupQueueProcessors();
      this.setupQueueEvents();

      logger.info('Notification queues initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize notification queues', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  setupQueueProcessors() {
    // Process immediate notifications
    this.notificationQueue.process(
      'send_notification',
      parseInt(process.env.NOTIFICATION_QUEUE_CONCURRENCY) || 5,
      async (job) => {
        return await this.processNotificationJob(job);
      }
    );

    // Process scheduled notifications
    this.scheduledQueue.process(
      'send_scheduled',
      2,
      async (job) => {
        return await this.processScheduledNotificationJob(job);
      }
    );

    // Process retry notifications
    this.retryQueue.process(
      'retry_notification',
      3,
      async (job) => {
        return await this.processRetryJob(job);
      }
    );
  }

  setupQueueEvents() {
    // Notification queue events
    this.notificationQueue.on('completed', (job, result) => {
      logger.info('Notification job completed', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        result: result.success
      });
    });

    this.notificationQueue.on('failed', (job, err) => {
      logger.error('Notification job failed', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        error: err.message,
        attempts: job.attemptsMade
      });
    });

    this.notificationQueue.on('stalled', (job) => {
      logger.warn('Notification job stalled', {
        jobId: job.id,
        notificationId: job.data.notificationId
      });
    });

    // Scheduled queue events
    this.scheduledQueue.on('completed', (job) => {
      logger.info('Scheduled notification job completed', {
        jobId: job.id,
        notificationId: job.data.notificationId
      });
    });

    this.scheduledQueue.on('failed', (job, err) => {
      logger.error('Scheduled notification job failed', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        error: err.message
      });
    });

    // Retry queue events
    this.retryQueue.on('completed', (job) => {
      logger.info('Retry notification job completed', {
        jobId: job.id,
        notificationId: job.data.notificationId
      });
    });

    this.retryQueue.on('failed', (job, err) => {
      logger.error('Retry notification job failed permanently', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        error: err.message
      });
    });
  }

  async processNotificationJob(job) {
    try {
      const { notificationId } = job.data;
      
      // Get notification from database
      const Notification = require('../models/Notification');
      const notification = await Notification.findOne({ notificationId });
      
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      if (notification.status !== 'QUEUED') {
        logger.warn('Notification not in queued status', {
          notificationId,
          currentStatus: notification.status
        });
        return { success: false, reason: 'Invalid status' };
      }

      // Process the notification
      const NotificationService = require('./NotificationService');
      const notificationService = new NotificationService();
      const result = await notificationService.processNotification(notification);

      return {
        success: result.success,
        notificationId,
        externalId: result.externalId
      };

    } catch (error) {
      logger.error('Notification job processing failed', {
        jobId: job.id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async processScheduledNotificationJob(job) {
    try {
      const { notificationId } = job.data;
      
      // Move scheduled notification to immediate queue
      await this.queueNotification({ notificationId });
      
      logger.info('Scheduled notification moved to processing queue', {
        notificationId
      });

      return { success: true, notificationId };

    } catch (error) {
      logger.error('Scheduled notification job processing failed', {
        jobId: job.id,
        error: error.message
      });
      throw error;
    }
  }

  async processRetryJob(job) {
    try {
      const { notificationId } = job.data;
      
      // Get notification and check if it can be retried
      const Notification = require('../models/Notification');
      const notification = await Notification.findOne({ notificationId });
      
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      if (!notification.canRetry()) {
        logger.warn('Notification cannot be retried', {
          notificationId,
          retryCount: notification.retryCount,
          maxRetries: notification.maxRetries
        });
        return { success: false, reason: 'Max retries exceeded' };
      }

      // Increment retry count and queue for processing
      await notification.incrementRetry();
      
      if (notification.status === 'QUEUED') {
        await this.queueNotification(notification);
      }

      return { success: true, notificationId, retryCount: notification.retryCount };

    } catch (error) {
      logger.error('Retry job processing failed', {
        jobId: job.id,
        error: error.message
      });
      throw error;
    }
  }

  async queueNotification(notification) {
    try {
      const jobData = {
        notificationId: notification.notificationId || notification,
        tenantId: notification.tenantId,
        priority: notification.priority || 'NORMAL',
        createdAt: new Date().toISOString()
      };

      const jobOptions = {
        priority: this.getPriorityValue(notification.priority || 'NORMAL'),
        delay: 0
      };

      const job = await this.notificationQueue.add('send_notification', jobData, jobOptions);

      logger.debug('Notification queued for processing', {
        jobId: job.id,
        notificationId: jobData.notificationId,
        priority: jobData.priority
      });

      return job.id;

    } catch (error) {
      logger.error('Failed to queue notification', {
        notificationId: notification.notificationId || notification,
        error: error.message
      });
      throw error;
    }
  }

  async scheduleNotification(notification) {
    try {
      const delay = new Date(notification.scheduledAt) - new Date();
      
      if (delay <= 0) {
        // Schedule time has passed, queue immediately
        return await this.queueNotification(notification);
      }

      const jobData = {
        notificationId: notification.notificationId,
        tenantId: notification.tenantId,
        scheduledAt: notification.scheduledAt,
        createdAt: new Date().toISOString()
      };

      const jobOptions = {
        delay: delay,
        priority: this.getPriorityValue(notification.priority)
      };

      const job = await this.scheduledQueue.add('send_scheduled', jobData, jobOptions);

      logger.debug('Notification scheduled', {
        jobId: job.id,
        notificationId: jobData.notificationId,
        scheduledAt: notification.scheduledAt,
        delay: delay
      });

      return job.id;

    } catch (error) {
      logger.error('Failed to schedule notification', {
        notificationId: notification.notificationId,
        error: error.message
      });
      throw error;
    }
  }

  async queueRetry(notificationId, delay = 30000) {
    try {
      const jobData = {
        notificationId,
        retryAt: new Date(Date.now() + delay).toISOString()
      };

      const jobOptions = {
        delay: delay,
        priority: 1 // High priority for retries
      };

      const job = await this.retryQueue.add('retry_notification', jobData, jobOptions);

      logger.debug('Notification queued for retry', {
        jobId: job.id,
        notificationId,
        delay
      });

      return job.id;

    } catch (error) {
      logger.error('Failed to queue notification retry', {
        notificationId,
        error: error.message
      });
      throw error;
    }
  }

  getPriorityValue(priority) {
    const priorities = {
      'URGENT': 1,
      'HIGH': 2,
      'NORMAL': 3,
      'LOW': 4
    };
    return priorities[priority] || 3;
  }

  async getQueueStats() {
    try {
      const [
        notificationWaiting,
        notificationActive,
        notificationCompleted,
        notificationFailed,
        scheduledWaiting,
        scheduledActive,
        retryWaiting,
        retryActive
      ] = await Promise.all([
        this.notificationQueue.getWaiting(),
        this.notificationQueue.getActive(),
        this.notificationQueue.getCompleted(),
        this.notificationQueue.getFailed(),
        this.scheduledQueue.getWaiting(),
        this.scheduledQueue.getActive(),
        this.retryQueue.getWaiting(),
        this.retryQueue.getActive()
      ]);

      return {
        notification: {
          waiting: notificationWaiting.length,
          active: notificationActive.length,
          completed: notificationCompleted.length,
          failed: notificationFailed.length
        },
        scheduled: {
          waiting: scheduledWaiting.length,
          active: scheduledActive.length
        },
        retry: {
          waiting: retryWaiting.length,
          active: retryActive.length
        }
      };

    } catch (error) {
      logger.error('Failed to get queue stats', {
        error: error.message
      });
      throw error;
    }
  }

  async pauseQueues() {
    try {
      await Promise.all([
        this.notificationQueue.pause(),
        this.scheduledQueue.pause(),
        this.retryQueue.pause()
      ]);

      logger.info('All notification queues paused');

    } catch (error) {
      logger.error('Failed to pause queues', {
        error: error.message
      });
      throw error;
    }
  }

  async resumeQueues() {
    try {
      await Promise.all([
        this.notificationQueue.resume(),
        this.scheduledQueue.resume(),
        this.retryQueue.resume()
      ]);

      logger.info('All notification queues resumed');

    } catch (error) {
      logger.error('Failed to resume queues', {
        error: error.message
      });
      throw error;
    }
  }

  async cleanQueues() {
    try {
      await Promise.all([
        this.notificationQueue.clean(24 * 60 * 60 * 1000, 'completed'),
        this.notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'),
        this.scheduledQueue.clean(24 * 60 * 60 * 1000, 'completed'),
        this.retryQueue.clean(24 * 60 * 60 * 1000, 'completed')
      ]);

      logger.info('Queue cleanup completed');

    } catch (error) {
      logger.error('Failed to clean queues', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = QueueService;