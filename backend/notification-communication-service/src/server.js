require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const redisClient = require('./config/redis');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');

// Services
const InAppService = require('./services/InAppService');
const QueueService = require('./services/QueueService');

// Routes
const notificationRoutes = require('./routes/notificationRoutes');
const templateRoutes = require('./routes/templateRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const server = http.createServer(app);

// Initialize services
const inAppService = new InAppService();
const queueService = new QueueService();

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason.message || reason,
    stack: reason.stack
  });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await gracefulShutdown();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await gracefulShutdown();
});

async function gracefulShutdown() {
  try {
    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Pause queues
    await queueService.pauseQueues();
    logger.info('Queues paused');

    // Disconnect from Redis
    await redisClient.disconnect();
    logger.info('Redis disconnected');

    // Close database connection
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    logger.info('Database disconnected');

    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet({
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

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Service-ID']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      tenantId: req.headers['x-tenant-id'],
      serviceId: req.headers['x-service-id']
    });
  });
  
  next();
});

// Health check (before auth)
app.use('/api/health', healthRoutes);

// API Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/webhooks', webhookRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'DentaMate Notification & Communication Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      notifications: '/api/notifications',
      templates: '/api/templates',
      preferences: '/api/preferences',
      webhooks: '/api/webhooks',
      health: '/api/health',
      socket: '/socket.io'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error in request', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Initialize application
async function initializeApp() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected successfully');

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connected successfully');

    // Initialize Socket.IO for in-app notifications
    inAppService.initialize(server);
    logger.info('Socket.IO initialized for in-app notifications');

    // Start server
    const PORT = process.env.PORT || 3012;
    server.listen(PORT, () => {
      logger.info(`Notification & Communication Service started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        pid: process.pid
      });
    });

    // Seed default templates if needed
    await seedDefaultTemplates();

  } catch (error) {
    logger.error('Failed to initialize application:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

async function seedDefaultTemplates() {
  try {
    const Template = require('./models/Template');
    const existingTemplates = await Template.countDocuments({ isSystem: true });
    
    if (existingTemplates === 0) {
      logger.info('Seeding default system templates...');
      
      const defaultTemplates = [
        {
          templateCode: 'APPOINTMENT_CONFIRMATION',
          name: 'Appointment Confirmation',
          description: 'Confirms appointment booking',
          channel: 'SMS',
          category: 'APPOINTMENT',
          subject: 'Appointment Confirmed',
          content: 'Your appointment with {{doctorName}} on {{appointmentDate}} at {{appointmentTime}} has been confirmed. Location: {{clinicName}}',
          variables: [
            { name: 'doctorName', description: 'Doctor name', required: true },
            { name: 'appointmentDate', description: 'Appointment date', required: true },
            { name: 'appointmentTime', description: 'Appointment time', required: true },
            { name: 'clinicName', description: 'Clinic name', required: true }
          ],
          isSystem: true,
          isActive: true,
          tenantId: 'SYSTEM'
        },
        {
          templateCode: 'APPOINTMENT_REMINDER',
          name: 'Appointment Reminder',
          description: 'Reminds about upcoming appointment',
          channel: 'SMS',
          category: 'APPOINTMENT',
          subject: 'Appointment Reminder',
          content: 'Reminder: You have an appointment with {{doctorName}} tomorrow at {{appointmentTime}}. Please arrive 15 minutes early.',
          variables: [
            { name: 'doctorName', description: 'Doctor name', required: true },
            { name: 'appointmentTime', description: 'Appointment time', required: true }
          ],
          isSystem: true,
          isActive: true,
          tenantId: 'SYSTEM'
        },
        {
          templateCode: 'PAYMENT_SUCCESS',
          name: 'Payment Success',
          description: 'Confirms successful payment',
          channel: 'EMAIL',
          category: 'BILLING',
          subject: 'Payment Confirmation - {{invoiceNumber}}',
          content: 'Thank you! Your payment of {{amount}} for invoice {{invoiceNumber}} has been processed successfully. Transaction ID: {{transactionId}}',
          variables: [
            { name: 'amount', description: 'Payment amount', required: true },
            { name: 'invoiceNumber', description: 'Invoice number', required: true },
            { name: 'transactionId', description: 'Transaction ID', required: true }
          ],
          isSystem: true,
          isActive: true,
          tenantId: 'SYSTEM'
        },
        {
          templateCode: 'QUEUE_TOKEN_CALLED',
          name: 'Queue Token Called',
          description: 'Notifies when token is called',
          channel: 'IN_APP',
          category: 'QUEUE',
          subject: 'Your Turn',
          content: 'Token {{tokenNumber}} is now being called. Please proceed to {{location}}.',
          variables: [
            { name: 'tokenNumber', description: 'Token number', required: true },
            { name: 'location', description: 'Location to proceed', required: true }
          ],
          isSystem: true,
          isActive: true,
          tenantId: 'SYSTEM'
        }
      ];

      await Template.insertMany(defaultTemplates);
      logger.info(`Seeded ${defaultTemplates.length} default templates`);
    }
  } catch (error) {
    logger.error('Failed to seed default templates:', {
      error: error.message
    });
  }
}

// Start the application
initializeApp();

module.exports = { app, server, inAppService, queueService };