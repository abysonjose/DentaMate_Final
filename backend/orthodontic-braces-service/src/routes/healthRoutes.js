const express = require('express');
const CacheService = require('../services/CacheService');
const FileStorageService = require('../services/FileStorageService');
const NotificationService = require('../services/NotificationService');
const databaseConfig = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      service: 'orthodontic-braces-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // Check database connection
    try {
      const dbConnection = databaseConfig.getConnection();
      if (dbConnection && dbConnection.connection.readyState === 1) {
        healthStatus.checks.database = { status: 'healthy', message: 'Connected' };
      } else {
        healthStatus.checks.database = { status: 'unhealthy', message: 'Not connected' };
        healthStatus.status = 'unhealthy';
      }
    } catch (error) {
      healthStatus.checks.database = { status: 'unhealthy', message: error.message };
      healthStatus.status = 'unhealthy';
    }

    // Check Redis cache
    try {
      const cacheService = new CacheService();
      const cacheHealthy = await cacheService.healthCheck();
      healthStatus.checks.cache = { 
        status: cacheHealthy ? 'healthy' : 'unhealthy',
        message: cacheHealthy ? 'Connected' : 'Connection failed'
      };
      if (!cacheHealthy) {
        healthStatus.status = 'degraded'; // Cache failure is not critical
      }
    } catch (error) {
      healthStatus.checks.cache = { status: 'unhealthy', message: error.message };
      healthStatus.status = 'degraded';
    }

    // Check file storage
    try {
      const fileStorageService = new FileStorageService();
      const storageHealth = await fileStorageService.healthCheck();
      healthStatus.checks.fileStorage = {
        status: storageHealth.healthy ? 'healthy' : 'unhealthy',
        message: storageHealth.message
      };
      if (!storageHealth.healthy) {
        healthStatus.status = 'degraded'; // File storage issues are not critical for basic operations
      }
    } catch (error) {
      healthStatus.checks.fileStorage = { status: 'unhealthy', message: error.message };
      healthStatus.status = 'degraded';
    }

    // Check notification service
    try {
      const notificationService = new NotificationService();
      const notificationHealth = await notificationService.healthCheck();
      healthStatus.checks.notifications = {
        status: notificationHealth.healthy ? 'healthy' : 'unhealthy',
        message: notificationHealth.message
      };
      if (!notificationHealth.healthy) {
        healthStatus.status = 'degraded'; // Notification issues are not critical
      }
    } catch (error) {
      healthStatus.checks.notifications = { status: 'unhealthy', message: error.message };
      healthStatus.status = 'degraded';
    }

    // Set appropriate HTTP status code
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    res.status(httpStatus).json(healthStatus);

    logger.info('Health check performed', {
      status: healthStatus.status,
      checks: Object.keys(healthStatus.checks).reduce((acc, key) => {
        acc[key] = healthStatus.checks[key].status;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      service: 'orthodontic-braces-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness check endpoint
router.get('/ready', async (req, res) => {
  try {
    // Check if essential services are ready
    const dbConnection = databaseConfig.getConnection();
    if (!dbConnection || dbConnection.connection.readyState !== 1) {
      return res.status(503).json({
        ready: false,
        message: 'Database not ready'
      });
    }

    res.json({
      ready: true,
      message: 'Service is ready to accept requests',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      ready: false,
      message: 'Service not ready',
      error: error.message
    });
  }
});

// Liveness check endpoint
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    message: 'Service is alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint (basic)
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      service: 'orthodontic-braces-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Add database metrics if available
    try {
      const dbConnection = databaseConfig.getConnection();
      if (dbConnection) {
        metrics.database = {
          connected: dbConnection.connection.readyState === 1,
          host: dbConnection.connection.host,
          port: dbConnection.connection.port,
          name: dbConnection.connection.name
        };
      }
    } catch (error) {
      metrics.database = { error: error.message };
    }

    res.json(metrics);
  } catch (error) {
    logger.error('Metrics collection failed:', error);
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message
    });
  }
});

// Service info endpoint
router.get('/info', (req, res) => {
  res.json({
    service: 'orthodontic-braces-service',
    description: 'Orthodontic braces and aligner management service for DentaMate',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    platform: process.platform,
    architecture: process.arch,
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    uptime_seconds: process.uptime()
  });
});

module.exports = router;