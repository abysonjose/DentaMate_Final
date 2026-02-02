require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const database = require('./config/database');
const redisConnection = require('./config/redis');
const logger = require('./utils/logger');

// Import routes
const staffRoutes = require('./routes/staffRoutes');
const roleRoutes = require('./routes/roleRoutes');

// Import middleware
const rateLimiter = require('./middleware/rateLimiter');
const ValidationMiddleware = require('./middleware/validation');

class UserStaffServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3004;
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID', 'X-Branch-ID']
    }));

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Content type validation
    this.app.use(ValidationMiddleware.validateContentType(['application/json']));

    // Input sanitization
    this.app.use(ValidationMiddleware.sanitizeInput);

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
        service: 'user-staff-service',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        database: {
          status: dbStatus.isConnected ? 'connected' : 'disconnected',
          host: dbStatus.host,
          name: dbStatus.name
        },
        cache: {
          status: redisStatus.isConnected ? 'connected' : 'disconnected',
          enabled: process.env.ENABLE_CACHE !== 'false'
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        }
      };

      const statusCode = (dbStatus.isConnected) ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // Detailed health check for monitoring
    this.app.get('/health/detailed', async (req, res) => {
      try {
        const dbHealth = await database.healthCheck();
        const redisHealth = await redisConnection.healthCheck();
        
        const health = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'user-staff-service',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          database: dbHealth,
          cache: redisHealth,
          system: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          }
        };

        const isHealthy = dbHealth.status === 'healthy';
        const statusCode = isHealthy ? 200 : 503;
        
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'error',
          message: 'Health check failed',
          error: error.message
        });
      }
    });

    // API routes
    this.app.use('/api/staff', staffRoutes);
    this.app.use('/api/roles', roleRoutes);

    // API documentation endpoint
    this.app.get('/api/docs', (req, res) => {
      res.json({
        service: 'User Staff Service',
        version: '1.0.0',
        description: 'Centralized staff management service - Single Source of Truth for all staff operations',
        endpoints: {
          staff: {
            base: '/api/staff',
            operations: [
              'POST / - Create staff member',
              'GET /:staffId - Get staff member',
              'PUT /:staffId - Update staff member',
              'PATCH /:staffId/deactivate - Deactivate staff member',
              'PATCH /:staffId/activate - Activate staff member',
              'POST /:staffId/roles - Assign role',
              'DELETE /:staffId/roles/:roleId - Remove role',
              'GET /tenant/:tenantId - Get staff by tenant',
              'GET /role/:roleName - Get staff by role',
              'GET /tenant/:tenantId/search - Search staff',
              'PATCH /:staffId/transfer - Transfer staff',
              'GET /:staffId/audit - Get audit trail',
              'GET /tenant/:tenantId/statistics - Get statistics',
              'PATCH /bulk/update - Bulk update'
            ]
          },
          roles: {
            base: '/api/roles',
            operations: [
              'POST / - Create role',
              'GET / - Get all roles',
              'GET /:roleId - Get role by ID',
              'GET /name/:roleName - Get role by name',
              'PUT /:roleId - Update role',
              'DELETE /:roleId - Delete role',
              'POST /:roleId/permissions - Add permission',
              'DELETE /:roleId/permissions - Remove permission',
              'GET /system/hierarchy - Get role hierarchy',
              'GET /:assignerRoleId/assignable - Get assignable roles',
              'POST /validate-assignment - Validate role assignment',
              'GET /analytics/statistics - Get role statistics',
              'GET /analytics/distribution - Get role distribution',
              'GET /scope/:scope - Get roles by scope',
              'POST /system/initialize - Initialize system roles',
              'POST /check-permission - Check permission'
            ]
          }
        },
        authentication: 'Bearer JWT token required',
        rateLimit: 'Applied per endpoint type',
        documentation: 'See API_DOCUMENTATION.md for detailed specs'
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
      logger.error('Unhandled error:', error, {
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
        tenantId: req.user?.tenantId
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format'
        });
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({
          success: false,
          message: `Duplicate value for ${field}`
        });
      }

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
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(isDevelopment && { 
          stack: error.stack,
          details: error 
        })
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at Promise:', reason, { promise });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  async start() {
    try {
      // Connect to database
      await database.connect();
      
      // Connect to Redis
      await redisConnection.connect();

      // Initialize system roles
      const RoleService = require('./services/RoleService');
      const roleService = new RoleService();
      await roleService.initializeSystemRoles();

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 User Staff Service started successfully`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          timestamp: new Date().toISOString()
        });
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.port} is already in use`);
          process.exit(1);
        } else {
          logger.error('Server error:', error);
          process.exit(1);
        }
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    try {
      logger.info('Starting graceful shutdown...');

      // Close server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('HTTP server closed');
      }

      // Close database connection
      await database.disconnect();
      logger.info('Database connection closed');

      // Close Redis connection
      await redisConnection.disconnect();
      logger.info('Redis connection closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new UserStaffServer();
  server.start();
}

module.exports = UserStaffServer;