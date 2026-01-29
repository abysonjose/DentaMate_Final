const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create rate limiter configurations
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
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
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
        tenantId: req.user?.tenantId
      });
      
      res.status(429).json(options.message || defaultOptions.message);
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/health/ready';
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.userId || req.ip;
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// General API rate limiter
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many API requests, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  }
});

// Strict rate limiter for sensitive operations
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later.',
    retryAfter: 900
  }
});

// Ledger operations rate limiter
const ledgerLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 ledger operations per 5 minutes
  message: {
    success: false,
    message: 'Too many ledger operations, please try again later.',
    retryAfter: 300
  }
});

// Report generation rate limiter
const reportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 reports per 10 minutes
  message: {
    success: false,
    message: 'Too many report generation requests, please try again later.',
    retryAfter: 600
  }
});

// Export operations rate limiter
const exportLimiter = createRateLimiter({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 exports per 30 minutes
  message: {
    success: false,
    message: 'Too many export requests, please try again later.',
    retryAfter: 1800
  }
});

// File upload rate limiter
const uploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 uploads per 10 minutes
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.',
    retryAfter: 600
  }
});

// Authentication rate limiter
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  },
  keyGenerator: (req) => {
    // Use IP for authentication attempts
    return req.ip;
  }
});

// Service-to-service rate limiter (more lenient)
const serviceLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // 500 requests per 5 minutes for services
  message: {
    success: false,
    message: 'Service rate limit exceeded, please try again later.',
    retryAfter: 300
  },
  keyGenerator: (req) => {
    // Use service name for service-to-service calls
    return req.service?.serviceName || req.ip;
  }
});

// Dynamic rate limiter based on user role
const roleBasedLimiter = (req, res, next) => {
  if (!req.user) {
    return generalLimiter(req, res, next);
  }

  const role = req.user.role;
  let limiter;

  switch (role) {
    case 'SAAS_ADMIN':
      // Most lenient for SaaS admins
      limiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: {
          success: false,
          message: 'SaaS admin rate limit exceeded.',
          retryAfter: 900
        }
      });
      break;
      
    case 'CENTRAL_ADMIN':
    case 'ACCOUNTS_MANAGER':
      // Moderate limits for admins and managers
      limiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 200,
        message: {
          success: false,
          message: 'Admin rate limit exceeded.',
          retryAfter: 900
        }
      });
      break;
      
    case 'ACCOUNTANT':
      // Higher limits for accountants
      limiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 150,
        message: {
          success: false,
          message: 'Accountant rate limit exceeded.',
          retryAfter: 900
        }
      });
      break;
      
    case 'BRANCH_ADMIN':
      // Standard limits for branch admins
      limiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: {
          success: false,
          message: 'Branch admin rate limit exceeded.',
          retryAfter: 900
        }
      });
      break;
      
    default:
      // Default general limiter for other roles
      limiter = generalLimiter;
  }

  return limiter(req, res, next);
};

// Tenant-based rate limiter
const tenantBasedLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per tenant per 15 minutes
  keyGenerator: (req) => {
    // Use tenant ID for tenant-based limiting
    return req.user?.tenantId || req.ip;
  },
  message: {
    success: false,
    message: 'Tenant rate limit exceeded, please try again later.',
    retryAfter: 900
  }
});

// IP-based rate limiter for unauthenticated requests
const ipLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per IP per 15 minutes
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    message: 'IP rate limit exceeded, please try again later.',
    retryAfter: 900
  }
});

// Middleware to apply appropriate rate limiter
const applyRateLimit = (req, res, next) => {
  // Check if it's a service-to-service call
  if (req.service) {
    return serviceLimiter(req, res, next);
  }
  
  // Check if user is authenticated
  if (req.user) {
    // Apply both role-based and tenant-based limiting
    return roleBasedLimiter(req, res, (err) => {
      if (err) return next(err);
      return tenantBasedLimiter(req, res, next);
    });
  }
  
  // Apply IP-based limiting for unauthenticated requests
  return ipLimiter(req, res, next);
};

module.exports = {
  generalLimiter,
  strictLimiter,
  ledgerLimiter,
  reportLimiter,
  exportLimiter,
  uploadLimiter,
  authLimiter,
  serviceLimiter,
  roleBasedLimiter,
  tenantBasedLimiter,
  ipLimiter,
  applyRateLimit
};