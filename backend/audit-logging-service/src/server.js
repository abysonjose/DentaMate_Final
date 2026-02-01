require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

// Import configurations
const databaseConfig = require('./config/database');
const redisConfig = require('./config/redis');
const logger = require('./utils/logger');

// Import routes
const auditRoutes = require('./routes/auditRoutes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3015;

// Security middleware
app.use(helmet({
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
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://dentamate.com', 'https://app.dentamate.com']
    : ['http://localhost:4200', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-token', 'x-service-id']
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for integrity verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(logger.requestLogger);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// API routes
app.use('/api/v1/audit', auditRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'DentaMate Audit & Logging Service',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    description: 'Centralized immutable audit ledger for DentaMate platform',
    endpoints: {
      health: '/health',
      events: '/api/v1/audit/events',
      batch: '/api/v1/audit/events/batch',
      query: '/api/v1/audit/events?filters',
      summary: '/api/v1/audit/summary',
      integrity: '/api/v1/audit/integrity',
      statistics: '/api/v1/audit/statistics',
      export: '/api/v1/audit/export'
    }
  });
});

// Health check endpoint (also available at root level)
app.get('/health', auditRoutes);

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    availableEndpoints: [
      'GET /health',
      'GET /api/v1/audit/events',
      'POST /api/v1/audit/events',
      'POST /api/v1/audit/events/batch',
      'GET /api/v1/audit/summary',
      'GET /api/v1/audit/integrity',
      'GET /api/v1/audit/statistics',
      'POST /api/v1/audit/export'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled application error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body
  });

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(error.status || 500).json({
    success: false,
    message,
    code: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  try {
    // Close database connections
    if (databaseConfig.isConnected) {
      await databaseConfig.disconnect();
      logger.info('Database connection closed');
    }

    // Close Redis connection
    if (redisConfig.isConnected) {
      await redisConfig.disconnect();
      logger.info('Redis connection closed');
    }

    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);

  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Initialize and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await databaseConfig.connect();
    logger.info('✅ Database connected successfully');

    // Connect to Redis
    await redisConfig.connect();
    logger.info('✅ Redis connected successfully');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Audit Logging Service started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
      } else {
        logger.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Global process error handlers
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason, promise });
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    return server;

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
const server = startServer();

module.exports = app;