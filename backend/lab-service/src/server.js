const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');

// Import routes
const labRequestRoutes = require('./routes/labRequestRoutes');
const testCatalogRoutes = require('./routes/testCatalogRoutes');
const labProviderRoutes = require('./routes/labProviderRoutes');
const resultRoutes = require('./routes/resultRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Import middleware
const authMiddleware = require('./middleware/auth');
const tenantMiddleware = require('./middleware/tenant');
const errorHandler = require('./middleware/errorHandler');

// Import services
const NotificationService = require('./services/NotificationService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Authentication and tenant middleware
app.use(authMiddleware);
app.use(tenantMiddleware);

// Initialize notification service with socket.io
const notificationService = new NotificationService(io);
app.locals.notificationService = notificationService;

// Routes
app.use('/api/lab/requests', labRequestRoutes);
app.use('/api/lab/catalog', testCatalogRoutes);
app.use('/api/lab/providers', labProviderRoutes);
app.use('/api/lab/results', resultRoutes);
app.use('/api/lab/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'lab-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling
app.use(errorHandler);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dentamate', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Join tenant-specific rooms
  socket.on('join-tenant', (tenantId) => {
    socket.join(`tenant-${tenantId}`);
    logger.info(`Socket ${socket.id} joined tenant room: ${tenantId}`);
  });

  // Join user-specific rooms
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`Socket ${socket.id} joined user room: ${userId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3009;

server.listen(PORT, () => {
  logger.info(`Lab Service running on port ${PORT}`);
});

module.exports = { app, server, io };