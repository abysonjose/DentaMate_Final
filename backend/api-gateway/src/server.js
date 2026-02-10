const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const tenantMiddleware = require('./middleware/tenant');
const routingMiddleware = require('./middleware/routing');
const { smartRateLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (before rate limiting)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Apply rate limiting
app.use(smartRateLimiter);

// API Gateway Enforcement Chain (ORDER MATTERS)
app.use('/api', (req, res, next) => {
  logger.info(`API Gateway: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    tenantId: req.headers['x-tenant-id']
  });
  next();
});

// 1. Tenant Resolution & Validation (FIRST)
app.use('/api', tenantMiddleware);

// 2. Authentication & RBAC Enforcement (SECOND)
app.use('/api', authMiddleware);

// 3. Route to Backend Services (LAST)
app.use('/api', routingMiddleware);

// Error handling
app.use((err, req, res, next) => {
  logger.error('API Gateway Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - use a catch-all without wildcard
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});