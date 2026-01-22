require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const database = require('./config/database');
const redisConnection = require('./config/redis');
const logger = require('./utils/logger');

// Import routes
const tenantRoutes = require('./routes/tenantRoutes');
const branchRoutes = require('./routes/branchRoutes');

// Import middleware
const { rateLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput, validateContentType } = require('./middleware/validation');

class TenantOrganizationServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3003;
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID']
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Content type validation
    this.app.use(validateContentType(['application/json']));

    // Input sanitization
    this.app.use(sanitizeInput);

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.http(message.trim())
      }
    }));

    // Global rate limiting
    this.app.use(rateLimiter.public);

    // Request timing
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      next();
    });

    // Response logging
    this.app.use((req, res, next) => {
      const originalSend = res.send;
      res.send = function(data) {
        const responseTime = Date.now() - req.startTime;
        logger.logRequest(req, res, responseTime);
        originalSend.call(this, data);
      };
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const dbStatus = database.getConnectionStatus();
      const redisStatus = redisConnection.getConnectionStatus();
      
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'tenant-organization-service',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        database: {
          connected: dbStatus.isConnected,
          readyState: dbStatus.readyState
        },
        cache: {
          connected: redisStatus.isConnected,
          ready: redisStatus.isReady
        },
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      };

      const statusCode = (dbStatus.isConnected) ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // API routes
    this.app.use('/api/tenants', tenantRoutes);
    this.app.use('/api/branches', branchRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'DentaMate Tenant Organization Service',
        version: process.env.npm_package_version || '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          tenants: '/api/tenants',
          branches: '/api/branches'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.logError(error, {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId,
        tenantId: req.user?.tenantId
      });

      // Mongoose validation errors
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
      }

      // Mongoose duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(409).json({
          success: false,
          message: `Duplicate value for field: ${field}`,
          field
        });
      }

      // JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }

      // Default error response
      const statusCode = error.statusCode || error.status || 500;
      const message = error.message || 'Internal server error';

      res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          error: error
        })
      });
    });
  }

  async start() {
    try {
      // Connect to database
      await database.connect();
      logger.info('Database connected successfully');

      // Connect to Redis (optional)
      await redisConnection.connect();
      if (redisConnection.isConnected) {
        logger.info('Redis connected successfully');
      } else {
        logger.warn('Redis connection failed - running without cache');
      }

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`Tenant Organization Service started on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          pid: process.pid
        });
      });

      // Graceful shutdown handlers
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('SIGINT', () => this.shutdown('SIGINT'));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(signal) {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    // Stop accepting new connections
    if (this.server) {
      this.server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connection
          await database.disconnect();
          logger.info('Database disconnected');

          // Close Redis connection
          await redisConnection.disconnect();
          logger.info('Redis disconnected');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new TenantOrganizationServer();
  server.start();
}

module.exports = TenantOrganizationServer;