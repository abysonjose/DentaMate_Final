const express = require('express');
const mongoose = require('mongoose');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/health
 * @desc Basic health check
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'notification-communication-service',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * @route GET /api/health/detailed
 * @desc Detailed health check including dependencies
 * @access Public
 */
router.get('/detailed', async (req, res) => {
  const checks = {
    service: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    queues: 'unknown'
  };

  let overallStatus = 'healthy';

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      checks.database = 'healthy';
    } else {
      checks.database = 'unhealthy';
      overallStatus = 'degraded';
    }
  } catch (error) {
    checks.database = 'unhealthy';
    overallStatus = 'degraded';
    logger.error('Database health check failed', { error: error.message });
  }

  try {
    // Check Redis connection
    if (redisClient.isConnected) {
      await redisClient.set('health_check', 'ok', 10);
      const result = await redisClient.get('health_check');
      checks.redis = result === 'ok' ? 'healthy' : 'unhealthy';
    } else {
      checks.redis = 'unhealthy';
      overallStatus = 'degraded';
    }
  } catch (error) {
    checks.redis = 'unhealthy';
    overallStatus = 'degraded';
    logger.error('Redis health check failed', { error: error.message });
  }

  try {
    // Check queue service
    const QueueService = require('../services/QueueService');
    const queueService = new QueueService();
    const queueStats = await queueService.getQueueStats();
    
    // Consider queues healthy if they exist and are responsive
    if (queueStats) {
      checks.queues = 'healthy';
    } else {
      checks.queues = 'unhealthy';
      overallStatus = 'degraded';
    }
  } catch (error) {
    checks.queues = 'unhealthy';
    overallStatus = 'degraded';
    logger.error('Queue health check failed', { error: error.message });
  }

  const health = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: 'notification-communication-service',
    version: '1.0.0',
    checks,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * @route GET /api/health/ready
 * @desc Readiness probe for Kubernetes
 * @access Public
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical dependencies are ready
    const isMongoReady = mongoose.connection.readyState === 1;
    const isRedisReady = redisClient.isConnected;

    if (isMongoReady && isRedisReady) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        dependencies: {
          mongodb: isMongoReady ? 'ready' : 'not ready',
          redis: isRedisReady ? 'ready' : 'not ready'
        }
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'not ready',
      error: error.message
    });
  }
});

/**
 * @route GET /api/health/live
 * @desc Liveness probe for Kubernetes
 * @access Public
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if the process is running, it's alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  });
});

/**
 * @route GET /api/health/metrics
 * @desc Basic metrics for monitoring
 * @access Public
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        loadAverage: require('os').loadavg()
      }
    };

    // Add queue metrics if available
    try {
      const QueueService = require('../services/QueueService');
      const queueService = new QueueService();
      metrics.queues = await queueService.getQueueStats();
    } catch (error) {
      metrics.queues = { error: 'Queue metrics unavailable' };
    }

    // Add in-app service metrics if available
    try {
      const { inAppService } = require('../server');
      if (inAppService) {
        metrics.inApp = {
          connectedUsers: inAppService.getConnectedUsersCount()
        };
      }
    } catch (error) {
      metrics.inApp = { error: 'In-app metrics unavailable' };
    }

    res.json(metrics);
  } catch (error) {
    logger.error('Metrics collection failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message
    });
  }
});

module.exports = router;