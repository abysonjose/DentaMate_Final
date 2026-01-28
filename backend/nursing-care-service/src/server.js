require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');

// Import configurations
const databaseConfig = require('./config/database');
const redisConfig = require('./config/redis');
const logger = require('./utils/logger');

// Import middleware
const RateLimiterMiddleware = require('./middleware/rateLimiter');

// Import routes
const vitalsRoutes = require('./routes/vitalsRoutes');
// const careNotesRoutes = require('./routes/careNotesRoutes');
// const escalationRoutes = require('./routes/escalationRoutes');
// const wardMonitoringRoutes = require('./routes/wardMonitoringRoutes');
// const nursingTaskRoutes = require('./routes/nursingTaskRoutes');

class NursingCareServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:4200",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    this.port = process.env.PORT || 3007;
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketHandlers();
    this.initializeErrorHandling();
  }

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
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:4200",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Branch-ID']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(RateLimiterMiddleware.general());

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });

    // Add request ID for tracing
    this.app.use((req, res, next) => {
      req.requestId = require('uuid').v4();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });
  }

  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'nursing-care-service',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/vitals', vitalsRoutes);
    // this.app.use('/api/care-notes', careNotesRoutes);
    // this.app.use('/api/escalations', escalationRoutes);
    // this.app.use('/api/ward-monitoring', wardMonitoringRoutes);
    // this.app.use('/api/nursing-tasks', nursingTaskRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'DentaMate Nursing Care Service',
        version: process.env.npm_package_version || '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  initializeSocketHandlers() {
    // Socket.IO connection handling
    this.io.on('connection', (socket) => {
      logger.info('Client connected to socket', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      // Join tenant/branch rooms for real-time updates
      socket.on('join-branch', (data) => {
        const { tenantId, branchId, userRole } = data;
        const roomName = `${tenantId}:${branchId}`;
        
        socket.join(roomName);
        socket.tenantId = tenantId;
        socket.branchId = branchId;
        socket.userRole = userRole;
        
        logger.info('Client joined branch room', {
          socketId: socket.id,
          roomName,
          userRole
        });
      });

      // Handle escalation acknowledgment
      socket.on('acknowledge-escalation', (data) => {
        const { escalationId, userId, userName } = data;
        
        // Broadcast to branch room
        if (socket.tenantId && socket.branchId) {
          const roomName = `${socket.tenantId}:${socket.branchId}`;
          socket.to(roomName).emit('escalation-acknowledged', {
            escalationId,
            acknowledgedBy: { userId, userName },
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle ward status updates
      socket.on('update-ward-status', (data) => {
        const { patientId, status, updatedBy } = data;
        
        // Broadcast to branch room
        if (socket.tenantId && socket.branchId) {
          const roomName = `${socket.tenantId}:${socket.branchId}`;
          socket.to(roomName).emit('ward-status-updated', {
            patientId,
            status,
            updatedBy,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info('Client disconnected from socket', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  initializeErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        requestId: req.requestId
      });

      res.status(error.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        requestId: req.requestId
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
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
      // Connect to databases
      await databaseConfig.connect();
      await redisConfig.connect();

      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Nursing Care Service started successfully`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
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
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close database connections
      await databaseConfig.disconnect();
      await redisConfig.disconnect();

      logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  // Method to broadcast real-time updates
  broadcastToRoom(roomName, event, data) {
    this.io.to(roomName).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Method to broadcast escalation alerts
  broadcastEscalation(tenantId, branchId, escalationData) {
    const roomName = `${tenantId}:${branchId}`;
    this.broadcastToRoom(roomName, 'new-escalation', escalationData);
  }

  // Method to broadcast abnormal vitals alerts
  broadcastAbnormalVitals(tenantId, branchId, vitalsData) {
    const roomName = `${tenantId}:${branchId}`;
    this.broadcastToRoom(roomName, 'abnormal-vitals', vitalsData);
  }

  // Method to broadcast ward status updates
  broadcastWardUpdate(tenantId, branchId, wardData) {
    const roomName = `${tenantId}:${branchId}`;
    this.broadcastToRoom(roomName, 'ward-update', wardData);
  }
}

// Create and start server
const server = new NursingCareServer();

// Export server instance for testing
module.exports = server;

// Start server if this file is run directly
if (require.main === module) {
  server.start();
}