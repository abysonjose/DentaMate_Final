const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General rate limiter for audit queries
const auditQueryLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many audit requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  },
  skip: (req) => {
    // Skip rate limiting for service-to-service calls
    return req.headers['x-service-token'] && req.headers['x-service-id'];
  }
});

// Strict rate limiter for event ingestion
const eventIngestionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Allow high throughput for event ingestion
  message: {
    success: false,
    message: 'Event ingestion rate limit exceeded',
    code: 'INGESTION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error('Event ingestion rate limit exceeded', {
      ip: req.ip,
      serviceId: req.headers['x-service-id'],
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      message: 'Event ingestion rate limit exceeded',
      code: 'INGESTION_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Batch operation rate limiter
const batchOperationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limited batch operations
  message: {
    success: false,
    message: 'Batch operation rate limit exceeded',
    code: 'BATCH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Batch operation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.userId,
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      message: 'Batch operation rate limit exceeded',
      code: 'BATCH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Integrity check rate limiter (expensive operations)
const integrityCheckLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Very limited integrity checks
  message: {
    success: false,
    message: 'Integrity check rate limit exceeded',
    code: 'INTEGRITY_CHECK_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Integrity check rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId
    });
    
    res.status(429).json({
      success: false,
      message: 'Integrity check rate limit exceeded - this is an expensive operation',
      code: 'INTEGRITY_CHECK_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Export rate limiter for audit data
const exportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Very limited exports per day
  message: {
    success: false,
    message: 'Audit export rate limit exceeded',
    code: 'EXPORT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Audit export rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId
    });
    
    res.status(429).json({
      success: false,
      message: 'Audit export rate limit exceeded - maximum 3 exports per day',
      code: 'EXPORT_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Dynamic rate limiter based on user role
const createRoleBasedLimiter = (roleConfig) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      const userRole = req.user?.role;
      return roleConfig[userRole] || roleConfig.default || 50;
    },
    message: {
      success: false,
      message: 'Role-based rate limit exceeded',
      code: 'ROLE_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Role-based rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.userId,
        role: req.user?.role,
        endpoint: req.path
      });
      
      res.status(429).json({
        success: false,
        message: 'Role-based rate limit exceeded',
        code: 'ROLE_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      });
    }
  });
};

// Role-based limits for audit access
const auditAccessLimiter = createRoleBasedLimiter({
  'SAAS_ADMIN': 200,
  'CENTRAL_ADMIN': 150,
  'ACCOUNTS_MANAGER': 100,
  'COMPLIANCE_OFFICER': 200,
  'default': 50
});

module.exports = {
  auditQueryLimiter,
  eventIngestionLimiter,
  batchOperationLimiter,
  integrityCheckLimiter,
  exportLimiter,
  auditAccessLimiter,
  createRoleBasedLimiter
};