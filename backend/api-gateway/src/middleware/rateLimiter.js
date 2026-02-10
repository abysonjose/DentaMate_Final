const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Redis client for rate limiting (optional)
let redisClient = null;
let RedisStore = null;

try {
  const Redis = require('redis');
  RedisStore = require('rate-limit-redis');
  
  redisClient = Redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  redisClient.connect().catch(err => {
    logger.warn('Redis connection failed, using memory store for rate limiting');
    redisClient = null;
  });
} catch (error) {
  logger.warn('Redis not available for rate limiting, using memory store');
  redisClient = null;
}

// Rate limiting configurations
const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
      error: 'Too many authentication attempts',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    }
  },
  
  // AI inference endpoints - resource intensive
  ai: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute per user
    message: {
      error: 'AI inference rate limit exceeded',
      code: 'AI_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute'
    }
  },
  
  // General CRUD operations
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window per user
    message: {
      error: 'Rate limit exceeded',
      code: 'GENERAL_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    }
  },
  
  // Public endpoints (health checks, etc.)
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP
    message: {
      error: 'Public endpoint rate limit exceeded',
      code: 'PUBLIC_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    }
  }
};

// Create rate limiter with tenant + user key generation
function createRateLimiter(config, keyGenerator) {
  const limiterConfig = {
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip),
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        userId: req.userContext?.userId,
        tenantId: req.userContext?.tenantId
      });
      
      res.status(429).json(config.message);
    }
  };

  // Use Redis store if available
  if (redisClient && RedisStore) {
    try {
      limiterConfig.store = new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
      });
    } catch (error) {
      logger.warn('Failed to create Redis store for rate limiting, using memory store');
    }
  }

  return rateLimit(limiterConfig);
}

// Tenant + User specific key generator
const tenantUserKeyGenerator = (req) => {
  const tenantId = req.userContext?.tenantId || req.headers['x-tenant-id'] || 'unknown';
  const userId = req.userContext?.userId || req.headers['x-user-id'] || req.ip;
  return `${tenantId}:${userId}`;
};

// IP-based key generator for public routes
const ipKeyGenerator = (req) => req.ip;

// Rate limiters
const rateLimiters = {
  // Authentication rate limiter (IP-based)
  auth: createRateLimiter(RATE_LIMITS.auth, ipKeyGenerator),
  
  // AI inference rate limiter (tenant + user based)
  ai: createRateLimiter(RATE_LIMITS.ai, tenantUserKeyGenerator),
  
  // General API rate limiter (tenant + user based)
  general: createRateLimiter(RATE_LIMITS.general, tenantUserKeyGenerator),
  
  // Public endpoints rate limiter (IP-based)
  public: createRateLimiter(RATE_LIMITS.public, ipKeyGenerator)
};

// Smart rate limiter middleware that selects appropriate limiter
const smartRateLimiter = (req, res, next) => {
  const path = req.path;
  
  // Determine which rate limiter to use based on path
  if (path.includes('/auth/')) {
    return rateLimiters.auth(req, res, next);
  }
  
  if (path.includes('/ai-diagnosis') || path.includes('/prescription-ocr')) {
    return rateLimiters.ai(req, res, next);
  }
  
  if (path === '/health' || path === '/') {
    return rateLimiters.public(req, res, next);
  }
  
  // Default to general rate limiter for authenticated endpoints
  return rateLimiters.general(req, res, next);
};

module.exports = {
  smartRateLimiter,
  rateLimiters,
  RATE_LIMITS
};