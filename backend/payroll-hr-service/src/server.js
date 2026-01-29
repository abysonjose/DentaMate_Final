require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const databaseConfig = require('./config/database');
const redisConfig = require('./config/redis');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');

// Import routes
const attendanceRoutes = require('./routes/attendanceRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const payslipRoutes = require('./routes/payslipRoutes');

const app = express();
const PORT = process.env.PORT || 3009;

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
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'payroll-hr-service',
      version: '1.0.0',
      uptime: process.uptime(),
      database: {
        connected: databaseConfig.isConnected(),
        status: databaseConfig.isConnected() ? 'connected' : 'disconnected'
      },
      cache: await redisConfig.isClientConnected() ? 
        { status: 'connected' } : 
        { status: 'disconnected' }
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/payslips', payslipRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'DentaMate Payroll HR Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      attendance: '/api/attendance',
      payroll: '/api/payroll',
      shifts: '/api/shifts',
      payslips: '/api/payslips'
    }
  });
});

// Test endpoint for basic functionality (no auth required)
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Payroll HR Service is working correctly',
    timestamp: new Date().toISOString(),
    features: [
      'Attendance Management',
      'Shift Management', 
      'Payroll Calculation',
      'Payslip Generation',
      'Role-based Access Control',
      'Audit Logging'
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close database connection
    await databaseConfig.disconnect();
    
    // Close Redis connection
    try {
      await redisConfig.disconnect();
    } catch (error) {
      logger.warn('Redis disconnect error:', error.message);
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await databaseConfig.connect();
    logger.info('Database connected successfully');

    // Try to connect to Redis (optional)
    try {
      await redisConfig.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn('Redis not available, running without cache:', error.message);
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Payroll HR Service started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });
    });

    // Set server timeout
    server.timeout = 30000; // 30 seconds

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
const server = startServer();

module.exports = app;