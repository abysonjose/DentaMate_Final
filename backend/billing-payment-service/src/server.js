require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import configurations and utilities
const databaseConfig = require('./config/database');
const redisConfig = require('./config/redis');
const logger = require('./utils/logger');

// Import routes
const routes = require('./routes');

// Import middleware
const { generalLimiter } = require('./middleware/rateLimiter');

class BillingPaymentServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3007;
    this.isShuttingDown = false;
  }

  /**
   * Initialize server
   */
  async initialize() {
    try {
      // Connect to databases
      await this.connectDatabases();
      
      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Start server
      await this.startServer();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      logger.info('🚀 Billing & Payment Service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize server:', error);
      process.exit(1);
    }
  }

  /**
   * Connect to databases
   */
  async connectDatabases() {
    try {
      // Connect to MongoDB
      await databaseConfig.connect();
      
      // Connect to Redis (optional - service works without Redis)
      try {
        await redisConfig.connect();
      } catch (redisError) {
        logger.warn('⚠️ Redis connection failed, continuing without cache:', redisError.message);
      }
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
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
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(generalLimiter);

    // Request logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('Request processed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      });
      
      next();
    });

    // Static files for PDF storage
    this.app.use('/storage', express.static(path.join(__dirname, '../storage')));
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // API routes
    this.app.use('/api/billing', routes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'DentaMate Billing & Payment Service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/api/billing/health',
          info: '/api/billing/info',
          bills: '/api/billing/bills',
          invoices: '/api/billing/invoices',
          payments: '/api/billing/payments',
          refunds: '/api/billing/refunds'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        user: req.user?.userId
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(error.status || 500).json({
        success: false,
        message: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment && { stack: error.stack })
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection:', {
        reason: reason.toString(),
        stack: reason.stack
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
      });
      
      // Graceful shutdown on uncaught exception
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  }

  /**
   * Start server
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (error) => {
        if (error) {
          reject(error);
        } else {
          logger.info(`🌟 Billing & Payment Service running on port ${this.port}`);
          logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
          logger.info(`🔗 Health check: http://localhost:${this.port}/api/billing/health`);
          resolve();
        }
      });
    });
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        logger.info(`📴 Received ${signal}, starting graceful shutdown...`);
        this.gracefulShutdown(signal);
      });
    });
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn('⚠️ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`🔄 Graceful shutdown initiated by ${signal}`);

    try {
      // Stop accepting new requests
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('✅ HTTP server closed');
      }

      // Close database connections
      await databaseConfig.disconnect();
      logger.info('✅ Database connections closed');

      // Close Redis connection
      await redisConfig.disconnect();
      logger.info('✅ Redis connection closed');

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Get server instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get server instance
   */
  getServer() {
    return this.server;
  }
}

// Initialize and start server
const billingPaymentServer = new BillingPaymentServer();

if (require.main === module) {
  billingPaymentServer.initialize();
}

module.exports = billingPaymentServer;