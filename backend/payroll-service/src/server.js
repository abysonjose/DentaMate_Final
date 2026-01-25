const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const authMiddleware = require('./middleware/auth');
const tenantMiddleware = require('./middleware/tenant');
const errorHandler = require('./middleware/errorHandler');
const payrollRoutes = require('./routes/payrollRoutes');
const employeePayrollRoutes = require('./routes/employeePayrollRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const reportRoutes = require('./routes/reportRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3015;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    tenantId: req.headers['x-tenant-id']
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'payroll-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes with middleware chain
app.use('/api', tenantMiddleware);
app.use('/api', authMiddleware);

// Route handlers
app.use('/api/payroll', payrollRoutes);
app.use('/api/payroll/employee-payroll', employeePayrollRoutes);
app.use('/api/payroll/payslips', payslipRoutes);
app.use('/api/payroll/reports', reportRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`Payroll Service running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

module.exports = app;