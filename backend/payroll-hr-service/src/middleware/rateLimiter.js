const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General rate limiter for all endpoints
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      userId: req.user?.userId
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Stricter rate limiter for payroll operations
const payrollLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 payroll requests per 5 minutes
  message: {
    success: false,
    message: 'Too many payroll operations from this IP, please try again later.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Payroll rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many payroll operations from this IP, please try again later.',
      retryAfter: 300
    });
  }
});

// Rate limiter for attendance operations
const attendanceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 attendance requests per minute
  message: {
    success: false,
    message: 'Too many attendance operations, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Attendance rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many attendance operations, please try again later.',
      retryAfter: 60
    });
  }
});

// Rate limiter for report generation
const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 report requests per 10 minutes
  message: {
    success: false,
    message: 'Too many report generation requests, please try again later.',
    retryAfter: 600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Report generation rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many report generation requests, please try again later.',
      retryAfter: 600
    });
  }
});

// Rate limiter for payslip downloads
const payslipLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 payslip downloads per 5 minutes
  message: {
    success: false,
    message: 'Too many payslip download requests, please try again later.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Payslip download rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many payslip download requests, please try again later.',
      retryAfter: 300
    });
  }
});

// Custom rate limiter based on user role
const createRoleBasedLimiter = (roleConfig) => {
  return rateLimit({
    windowMs: roleConfig.windowMs || 15 * 60 * 1000,
    max: (req) => {
      const userRole = req.user?.role;
      return roleConfig[userRole] || roleConfig.default || 100;
    },
    keyGenerator: (req) => {
      // Use user ID instead of IP for authenticated requests
      return req.user?.userId || req.ip;
    },
    message: {
      success: false,
      message: 'Rate limit exceeded for your role, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Role-based rate limit exceeded', {
        userId: req.user?.userId,
        role: req.user?.role,
        ip: req.ip,
        endpoint: req.path,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded for your role, please try again later.'
      });
    }
  });
};

// Role-based limits for payroll operations
const payrollRoleBasedLimiter = createRoleBasedLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  'HR': 50,
  'PAYROLL_OFFICER': 100,
  'ACCOUNTS_MANAGER': 30,
  'ACCOUNTANT': 20,
  'default': 10
});

module.exports = {
  generalLimiter,
  payrollLimiter,
  attendanceLimiter,
  reportLimiter,
  payslipLimiter,
  payrollRoleBasedLimiter,
  createRoleBasedLimiter
};