const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create rate limiter with custom key generator
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
    keyGenerator: (req) => {
      // Use combination of IP and user ID for authenticated requests
      if (req.user && req.user.userId) {
        return `${req.ip}:${req.user.userId}`;
      }
      return req.ip;
    },
    handler: (req, res) => {
      logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userId: req.user?.userId,
        tenantId: req.user?.tenantId,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      }, req.user?.userId, req.user?.tenantId);

      res.status(429).json(defaultOptions.message);
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
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

// Payment processing rate limiter
const paymentLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 payment attempts per 5 minutes
  message: {
    success: false,
    message: 'Too many payment attempts, please try again later.',
    retryAfter: 300
  }
});

// Refund request rate limiter
const refundLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 refund requests per hour
  message: {
    success: false,
    message: 'Too many refund requests, please try again later.',
    retryAfter: 3600
  }
});

// Bill creation rate limiter
const billCreationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 bills per 10 minutes
  message: {
    success: false,
    message: 'Too many bill creation requests, please try again later.',
    retryAfter: 600
  }
});

// Invoice generation rate limiter
const invoiceGenerationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 invoices per 10 minutes
  message: {
    success: false,
    message: 'Too many invoice generation requests, please try again later.',
    retryAfter: 600
  }
});

// Login attempt rate limiter (for webhook endpoints)
const webhookLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 webhook calls per minute
  message: {
    success: false,
    message: 'Too many webhook requests, please try again later.',
    retryAfter: 60
  },
  keyGenerator: (req) => {
    // Use IP for webhook rate limiting
    return req.ip;
  }
});

// Custom rate limiter for specific tenant
const createTenantRateLimiter = (maxRequests = 1000, windowMs = 60 * 60 * 1000) => {
  return createRateLimiter({
    windowMs,
    max: maxRequests,
    keyGenerator: (req) => {
      // Rate limit by tenant
      return req.user?.tenantId || req.ip;
    },
    message: {
      success: false,
      message: 'Tenant rate limit exceeded, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    }
  });
};

// Dynamic rate limiter based on user role
const createRoleBasedLimiter = (req, res, next) => {
  const role = req.user?.role;
  
  let limiter;
  
  switch (role) {
    case 'SAAS_ADMIN':
      // Higher limits for SaaS admin
      limiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 500
      });
      break;
      
    case 'CENTRAL_ADMIN':
    case 'BRANCH_ADMIN':
      // Higher limits for admins
      limiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 200
      });
      break;
      
    case 'BILLING_OFFICER':
    case 'CASHIER':
    case 'ACCOUNTS_MANAGER':
      // Standard limits for billing staff
      limiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 150
      });
      break;
      
    default:
      // Lower limits for other roles
      limiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 100
      });
  }
  
  return limiter(req, res, next);
};

module.exports = {
  generalLimiter,
  strictLimiter,
  paymentLimiter,
  refundLimiter,
  billCreationLimiter,
  invoiceGenerationLimiter,
  webhookLimiter,
  createTenantRateLimiter,
  createRoleBasedLimiter,
  createRateLimiter
};