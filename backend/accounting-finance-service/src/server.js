require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import configurations
const databaseConfig = require('./config/database');
const redisConfig = require('./config/redis');
const logger = require('./utils/logger');

// Import middleware
const { applyRateLimit } = require('./middleware/rateLimiter');

// Import routes (will be created)
// const ledgerRoutes = require('./routes/ledgerRoutes');
// const expenseRoutes = require('./routes/expenseRoutes');
// const revenueRoutes = require('./routes/revenueRoutes');
// const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3009;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

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
    ? [process.env.FRONTEND_URL, process.env.API_GATEWAY_URL]
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-token', 'x-service-name']
}));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim(), { source: 'http' })
    }
  }));
}

// Rate limiting
app.use(applyRateLimit);

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'accounting-finance-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.get('/health/ready', async (req, res) => {
  try {
    // Check database connection
    const dbHealth = await databaseConfig.healthCheck();
    
    // Check Redis connection
    const redisHealth = await redisConfig.healthCheck();

    const isReady = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';

    const readiness = {
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
        redis: redisHealth
      }
    };

    res.status(isReady ? 200 : 503).json(readiness);
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/v1', (req, res, next) => {
  // Add API version info to request
  req.apiVersion = 'v1';
  next();
});

// Placeholder for routes - will be uncommented when routes are created
// app.use('/api/v1/ledger', ledgerRoutes);
// app.use('/api/v1/expenses', expenseRoutes);
// app.use('/api/v1/revenue', revenueRoutes);
// app.use('/api/v1/reports', reportRoutes);

// Temporary route for testing
app.get('/api/v1/status', (req, res) => {
  res.json({
    success: true,
    message: 'Accounting & Finance Service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(isDevelopment && { 
      stack: error.stack,
      details: error.details 
    })
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      logger.info('HTTP server closed');
    }

    // Close database connection
    await databaseConfig.disconnect();
    logger.info('Database connection closed');

    // Close Redis connection if connected
    try {
      await redisConfig.disconnect();
      logger.info('Redis connection closed');
    } catch (redisError) {
      logger.debug('Redis disconnect skipped (not connected)');
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
let server;

const startServer = async () => {
  try {
    // Connect to database
    await databaseConfig.connect();
    logger.info('Database connected successfully');

    // Try to connect to Redis (non-blocking)
    try {
      await redisConfig.connect();
      logger.info('Redis connected successfully');
    } catch (redisError) {
      logger.warn('Redis connection failed - service will continue without cache:', redisError.message);
    }

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Accounting & Finance Service started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        pid: process.pid
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server only if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;