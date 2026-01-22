const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const redis = require('redis');
const logger = require('./utils/logger');
const config = require('./config/config');
const authMiddleware = require('./middleware/auth');
const tenantMiddleware = require('./middleware/tenant');
const socketAuth = require('./middleware/socketAuth');

// Import routes
const tokenRoutes = require('./routes/tokenRoutes');
const queueRoutes = require('./routes/queueRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Import socket handlers
const queueSocketHandler = require('./sockets/queueSocketHandler');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:4200",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'token-queue-realtime-service',
    timestamp: new Date().toISOString()
  });
});

// Apply auth and tenant middleware to protected routes
app.use('/api', authMiddleware);
app.use('/api', tenantMiddleware);

// Routes
app.use('/api/tokens', tokenRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/analytics', analyticsRoutes);

// Socket authentication and handlers
io.use(socketAuth);
queueSocketHandler(io);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Database connections
async function connectDatabases() {
  try {
    // MongoDB connection
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Connected to MongoDB');

    // Redis connection
    const redisClient = redis.createClient({
      url: config.redis.uri
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });
    
    await redisClient.connect();
    logger.info('Connected to Redis');
    
    // Make Redis client available globally
    app.locals.redis = redisClient;
    
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 3005;

connectDatabases().then(() => {
  server.listen(PORT, () => {
    logger.info(`Token Queue Realtime Service running on port ${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    if (app.locals.redis) {
      app.locals.redis.quit();
    }
    process.exit(0);
  });
});

module.exports = { app, server, io };