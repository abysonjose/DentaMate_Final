const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Custom key generator that includes tenant context
const createKeyGenerator = (includeUser = false, includeTenant = false) => {
  return (req) => {
    let key = req.ip;
    
    if (includeUser && req.user?.userId) {
      key += `:user:${req.user.userId}`;
    }
    
    if (includeTenant && req.user?.tenantId) {
      key += `:tenant:${req.user.tenantId}`;
    }
    
    return key;
  };
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    tenantId: req.user?.tenantId
  });

  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    retryAfter: Math.round(req.rateLimit.resetTime / 1000)
  });
};

// Standard rate limiter - 100 requests per 15 minutes
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: createKeyGenerator(true, false),
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Strict rate limiter for sensitive operations - 20 requests per 15 minutes
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  keyGenerator: createKeyGenerator(true, true),
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

// Create tenant limiter - 5 requests per hour
const createTenantLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: createKeyGenerator(false, false),
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many tenant creation attempts. Please try again later.'
  }
});

// Login tracking limiter - 50 requests per 15 minutes per user
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  keyGenerator: createKeyGenerator(true, true),
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

// Search limiter - 30 requests per 5 minutes per user
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  keyGenerator: createKeyGenerator(true, false),
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

// Configuration update limiter - 10 requests per 15 minutes per tenant
const configUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  keyGenerator: createKeyGenerator(true, true),
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

// Admin operations limiter - 50 requests per 15 minutes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  keyGenerator: createKeyGenerator(true, false),
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

// Public API limiter - 200 requests per hour per IP
const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200,
  keyGenerator: (req) => req.ip,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

// Validation limiter - 100 requests per 5 minutes per IP
const validationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  keyGenerator: (req) => req.ip,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

// Dynamic rate limiter based on user role
const createRoleBasedLimiter = (limits) => {
  return (req, res, next) => {
    const userRole = req.user?.roles?.[0] || 'USER';
    const limit = limits[userRole] || limits.DEFAULT || 50;
    
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: limit,
      keyGenerator: createKeyGenerator(true, true),
      handler: rateLimitHandler,
      standardHeaders: true,
      legacyHeaders: false
    });

    limiter(req, res, next);
  };
};

// Role-based limits for different operations
const roleBasedLimits = {
  SAAS_ADMIN: 200,
  CENTRAL_ADMIN: 150,
  BRANCH_ADMIN: 100,
  USER: 50,
  DEFAULT: 50
};

module.exports = {
  rateLimiter: {
    standard: standardLimiter,
    strict: strictLimiter,
    createTenant: createTenantLimiter,
    login: loginLimiter,
    search: searchLimiter,
    configUpdate: configUpdateLimiter,
    admin: adminLimiter,
    public: publicLimiter,
    validation: validationLimiter,
    roleBased: createRoleBasedLimiter(roleBasedLimits)
  },
  createKeyGenerator,
  rateLimitHandler,
  createRoleBasedLimiter
};