const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const databaseConfig = require('./config/database');
const redisConfig = require('./config/redis');
const logger = require('./utils/logger');

// Import routes
const caseRoutes = require('./routes/caseRoutes');
const measurementRoutes = require('./routes/measurementRoutes');
const healthRoutes = require('./routes/healthRoutes');

class OrthodonticBracesServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3009;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

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
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Service-Token']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path.startsWith('/health') || 
               req.path.startsWith('/ready') || 
               req.path.startsWith('/live');
      }
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.userId,
          tenantId: req.user?.tenantId
        });
      });

      next();
    });

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = require('uuid').v4();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });
  }

  setupRoutes() {
    // Health check routes (no authentication required)
    this.app.use('/', healthRoutes);

    // API routes with /orthodontics prefix
    this.app.use('/orthodontics', caseRoutes);
    this.app.use('/orthodontics', measurementRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'orthodontic-braces-service',
        version: process.env.npm_package_version || '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          cases: '/orthodontics/cases',
          measurements: '/orthodontics/measurements'
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

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.userId,
        requestId: req.requestId
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        requestId: req.requestId,
        ...(isDevelopment && { stack: error.stack })
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown('SIGTERM');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('SIGTERM');
    });

    // Handle process termination signals
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  async connectDatabases() {
    try {
      // Connect to MongoDB
      await databaseConfig.connect();
      logger.info('Database connected successfully');

      // Connect to Redis
      await redisConfig.connect();
      logger.info('Redis connected successfully');

      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async start() {
    try {
      // Connect to databases
      await this.connectDatabases();

      // Start the server
      this.server = this.app.listen(this.port, () => {
        logger.info(`Orthodontic Braces Service started`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          pid: process.pid
        });
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.port} is already in use`);
        } else {
          logger.error('Server error:', error);
        }
        process.exit(1);
      });

      return this.server;
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async gracefulShutdown(signal) {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new requests
    if (this.server) {
      this.server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connections
          await databaseConfig.disconnect();
          logger.info('Database disconnected');

          await redisConfig.disconnect();
          logger.info('Redis disconnected');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    } else {
      process.exit(0);
    }
  }

  getApp() {
    return this.app;
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new OrthodonticBracesServer();
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = OrthodonticBracesServer;