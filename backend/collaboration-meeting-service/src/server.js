require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');

// Import configurations
const databaseConfig = require('./config/database');
const redisConfig = require('./config/redis');

// Import middleware
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Import routes
const routes = require('./routes');

class CollaborationMeetingServer {
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
    this.port = process.env.PORT || 3012;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupErrorHandlers();
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
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          process.env.FRONTEND_URL || 'http://localhost:4200',
          process.env.API_GATEWAY_URL || 'http://localhost:3000',
          'http://localhost:3000',
          'http://localhost:4200'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Branch-ID']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Global rate limiting
    this.app.use(rateLimiter.globalLimiter());

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.logRequest(req, res, duration);
      });
      
      next();
    });

    // Health check endpoint (before other middleware)
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Collaboration & Meeting Service is healthy',
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      });
    });
  }

  setupRoutes() {
    // API routes
    this.app.use('/', routes);
  }

  setupSocketHandlers() {
    // Socket.IO for real-time collaboration features
    this.io.on('connection', (socket) => {
      logger.info('Client connected to collaboration service', {
        socketId: socket.id,
        clientIP: socket.handshake.address
      });

      // Join collaboration room
      socket.on('join-collaboration', (data) => {
        const { collaborationId, userId, tenantId } = data;
        
        if (collaborationId && userId && tenantId) {
          const roomName = `collaboration:${tenantId}:${collaborationId}`;
          socket.join(roomName);
          
          logger.info('User joined collaboration room', {
            userId,
            collaborationId,
            tenantId,
            socketId: socket.id
          });

          // Notify other participants
          socket.to(roomName).emit('user-joined-collaboration', {
            userId,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Leave collaboration room
      socket.on('leave-collaboration', (data) => {
        const { collaborationId, userId, tenantId } = data;
        
        if (collaborationId && userId && tenantId) {
          const roomName = `collaboration:${tenantId}:${collaborationId}`;
          socket.leave(roomName);
          
          logger.info('User left collaboration room', {
            userId,
            collaborationId,
            tenantId,
            socketId: socket.id
          });

          // Notify other participants
          socket.to(roomName).emit('user-left-collaboration', {
            userId,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Join meeting room
      socket.on('join-meeting', (data) => {
        const { meetingId, userId, tenantId } = data;
        
        if (meetingId && userId && tenantId) {
          const roomName = `meeting:${tenantId}:${meetingId}`;
          socket.join(roomName);
          
          logger.info('User joined meeting room', {
            userId,
            meetingId,
            tenantId,
            socketId: socket.id
          });

          // Notify other participants
          socket.to(roomName).emit('user-joined-meeting', {
            userId,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Leave meeting room
      socket.on('leave-meeting', (data) => {
        const { meetingId, userId, tenantId } = data;
        
        if (meetingId && userId && tenantId) {
          const roomName = `meeting:${tenantId}:${meetingId}`;
          socket.leave(roomName);
          
          logger.info('User left meeting room', {
            userId,
            meetingId,
            tenantId,
            socketId: socket.id
          });

          // Notify other participants
          socket.to(roomName).emit('user-left-meeting', {
            userId,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Real-time discussion updates
      socket.on('new-discussion', (data) => {
        const { collaborationId, tenantId, discussion } = data;
        
        if (collaborationId && tenantId && discussion) {
          const roomName = `collaboration:${tenantId}:${collaborationId}`;
          
          // Broadcast to all participants in the collaboration
          socket.to(roomName).emit('discussion-added', {
            discussion,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Real-time meeting updates
      socket.on('meeting-update', (data) => {
        const { meetingId, tenantId, update } = data;
        
        if (meetingId && tenantId && update) {
          const roomName = `meeting:${tenantId}:${meetingId}`;
          
          // Broadcast to all participants in the meeting
          socket.to(roomName).emit('meeting-updated', {
            update,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle typing indicators for discussions
      socket.on('typing-start', (data) => {
        const { collaborationId, tenantId, userId } = data;
        
        if (collaborationId && tenantId && userId) {
          const roomName = `collaboration:${tenantId}:${collaborationId}`;
          socket.to(roomName).emit('user-typing', { userId });
        }
      });

      socket.on('typing-stop', (data) => {
        const { collaborationId, tenantId, userId } = data;
        
        if (collaborationId && tenantId && userId) {
          const roomName = `collaboration:${tenantId}:${collaborationId}`;
          socket.to(roomName).emit('user-stopped-typing', { userId });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info('Client disconnected from collaboration service', {
          socketId: socket.id,
          reason
        });
      });

      // Handle connection errors
      socket.on('error', (error) => {
        logger.error('Socket error in collaboration service', {
          socketId: socket.id,
          error: error.message
        });
      });
    });
  }

  setupErrorHandlers() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        service: 'collaboration-meeting-service'
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error in collaboration service:', error);

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(error.status || 500).json({
        success: false,
        message: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment && { stack: error.stack }),
        timestamp: new Date().toISOString()
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

    // Handle process termination
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  async gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    this.server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connections
        await databaseConfig.disconnect();
        logger.info('Database disconnected');

        // Close Redis connections
        await redisConfig.disconnect();
        logger.info('Redis disconnected');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000); // 30 seconds timeout
  }

  async start() {
    try {
      // Connect to databases
      await databaseConfig.connect();
      logger.info('Database connected successfully');

      // Try to connect to Redis, but don't fail if it's not available or disabled
      if (process.env.REDIS_ENABLED !== 'false') {
        try {
          await redisConfig.connect();
          logger.info('Redis connected successfully');
        } catch (redisError) {
          logger.warn('Redis connection failed, continuing without cache:', redisError.message);
        }
      } else {
        logger.info('Redis disabled in configuration, continuing without cache');
      }

      // Start the server
      this.server.listen(this.port, () => {
        logger.info(`Collaboration & Meeting Service started successfully`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.SERVICE_VERSION || '1.0.0'
        });
      });

    } catch (error) {
      logger.error('Failed to start Collaboration & Meeting Service:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new CollaborationMeetingServer();
server.start();

module.exports = server;