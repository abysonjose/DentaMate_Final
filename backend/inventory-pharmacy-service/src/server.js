require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

// Import configurations
const databaseConfig = require('./config/database');
const redisConfig = require('./config/redis');

// Import middleware
const AuthMiddleware = require('./middleware/auth');
const ValidationMiddleware = require('./middleware/validation');
const RateLimiterMiddleware = require('./middleware/rateLimiter');

// Import utilities
const logger = require('./utils/logger');

// Import services
const CacheService = require('./services/CacheService');

class InventoryPharmacyServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3009;
    this.server = null;
  }

  // Initialize middleware
  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Branch-ID']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.logRequest(req, res, duration);
      });
      
      next();
    });

    // Rate limiting
    this.app.use('/api/', RateLimiterMiddleware.general());

    logger.info('✅ Middleware initialized');
  }

  // Initialize routes
  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Inventory & Pharmacy Service is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'inventory-pharmacy-service'
      });
    });

    // API health check with detailed status
    this.app.get('/api/health', async (req, res) => {
      try {
        const dbStatus = databaseConfig.getConnectionStatus();
        const redisStatus = redisConfig.getConnectionStatus();
        const cacheHealth = await CacheService.healthCheck();

        const overallHealth = dbStatus.isConnected && redisStatus.isConnected && cacheHealth.status === 'healthy';

        res.status(overallHealth ? 200 : 503).json({
          success: overallHealth,
          message: overallHealth ? 'All systems operational' : 'Some systems are down',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          service: 'inventory-pharmacy-service',
          status: {
            database: {
              connected: dbStatus.isConnected,
              readyState: dbStatus.readyState,
              host: dbStatus.host,
              port: dbStatus.port,
              name: dbStatus.name
            },
            redis: {
              connected: redisStatus.isConnected,
              status: redisStatus.status
            },
            cache: cacheHealth
          }
        });
      } catch (error) {
        logger.error('Health check error:', error);
        res.status(503).json({
          success: false,
          message: 'Health check failed',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // API base route
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'DentaMate Inventory & Pharmacy Service API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          apiHealth: '/api/health',
          medicines: '/api/medicines',
          stock: '/api/stock',
          dispensing: '/api/dispensing',
          vendors: '/api/vendors',
          restock: '/api/restock',
          reports: '/api/reports'
        }
      });
    });

    // TODO: Add route imports here
    // this.app.use('/api/medicines', require('./routes/medicineRoutes'));
    // this.app.use('/api/stock', require('./routes/stockRoutes'));
    // this.app.use('/api/dispensing', require('./routes/dispensingRoutes'));
    // this.app.use('/api/vendors', require('./routes/vendorRoutes'));
    // this.app.use('/api/restock', require('./routes/restockRoutes'));
    // this.app.use('/api/reports', require('./routes/reportRoutes'));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    logger.info('✅ Routes initialized');
  }

  // Initialize error handling
  initializeErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.userId,
        tenantId: req.user?.tenantId,
        branchId: req.user?.branchId
      });

      // Mongoose validation error
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          code: 'MONGOOSE_VALIDATION_ERROR',
          errors
        });
      }

      // Mongoose duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(409).json({
          success: false,
          message: `Duplicate value for ${field}`,
          code: 'DUPLICATE_KEY_ERROR',
          field,
          value: error.keyValue[field]
        });
      }

      // Mongoose cast error
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format',
          code: 'INVALID_ID_FORMAT',
          field: error.path,
          value: error.value
        });
      }

      // JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Default error response
      const statusCode = error.statusCode || error.status || 500;
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message;

      res.status(statusCode).json({
        success: false,
        message,
        code: 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      });
    });

    logger.info('✅ Error handling initialized');
  }

  // Connect to databases
  async connectDatabases() {
    try {
      // Connect to MongoDB
      await databaseConfig.connect();
      
      // Connect to Redis
      await redisConfig.connect();
      
      logger.info('✅ All databases connected successfully');
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  // Start the server
  async start() {
    try {
      // Connect to databases first
      await this.connectDatabases();

      // Initialize middleware
      this.initializeMiddleware();

      // Initialize routes
      this.initializeRoutes();

      // Initialize error handling
      this.initializeErrorHandling();

      // Start HTTP server
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 Inventory & Pharmacy Service started successfully`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          timestamp: new Date().toISOString()
        });
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`❌ Port ${this.port} is already in use`);
        } else {
          logger.error('❌ Server error:', error);
        }
        process.exit(1);
      });

    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  // Graceful shutdown
  async shutdown() {
    logger.info('🔄 Initiating graceful shutdown...');

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('✅ HTTP server closed');
      }

      // Close database connections
      await databaseConfig.disconnect();
      await redisConfig.disconnect();

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create server instance
const server = new InventoryPharmacyServer();

// Handle process signals for graceful shutdown
process.on('SIGTERM', () => {
  logger.info('📡 SIGTERM received');
  server.shutdown();
});

process.on('SIGINT', () => {
  logger.info('📡 SIGINT received');
  server.shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  server.shutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  server.shutdown();
});

// Start the server
if (require.main === module) {
  server.start();
}

module.exports = server;