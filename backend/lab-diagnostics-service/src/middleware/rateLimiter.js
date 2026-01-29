const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Rate limiting configurations
const rateLimitConfigs = {
  // General API rate limiting
  general: rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        userId: req.user?.userId
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later'
      });
    }
  }),

  // Strict rate limiting for file uploads
  upload: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 upload requests per windowMs
    message: {
      success: false,
      message: 'Too many upload requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Upload rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        userId: req.user?.userId
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many upload requests, please try again later'
      });
    }
  }),

  // Moderate rate limiting for order creation
  createOrder: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // limit each IP to 10 order creation requests per windowMs
    message: {
      success: false,
      message: 'Too many order creation requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Order creation rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        userId: req.user?.userId
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many order creation requests, please try again later'
      });
    }
  }),

  // Lenient rate limiting for read operations
  read: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 read requests per windowMs
    message: {
      success: false,
      message: 'Too many read requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Read rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        userId: req.user?.userId
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many read requests, please try again later'
      });
    }
  }),

  // Very strict rate limiting for sensitive operations
  sensitive: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 sensitive requests per hour
    message: {
      success: false,
      message: 'Too many sensitive operation requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Sensitive operation rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        userId: req.user?.userId
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many sensitive operation requests, please try again later'
      });
    }
  })
};

// Custom rate limiter based on user ID instead of IP
const createUserBasedRateLimit = (windowMs, max, message) => {
  const store = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.userId || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    for (const [key, data] of store.entries()) {
      if (data.resetTime < now) {
        store.delete(key);
      }
    }
    
    // Get or create user data
    let userData = store.get(userId);
    if (!userData || userData.resetTime < now) {
      userData = {
        count: 0,
        resetTime: now + windowMs
      };
      store.set(userId, userData);
    }
    
    // Check if limit exceeded
    if (userData.count >= max) {
      logger.warn('User-based rate limit exceeded', {
        userId,
        count: userData.count,
        max,
        endpoint: req.path
      });
      
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later',
        retryAfter: Math.ceil((userData.resetTime - now) / 1000)
      });
    }
    
    // Increment counter
    userData.count++;
    
    // Set headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - userData.count),
      'X-RateLimit-Reset': new Date(userData.resetTime).toISOString()
    });
    
    next();
  };
};

// User-based rate limiters
const userRateLimiters = {
  upload: createUserBasedRateLimit(
    15 * 60 * 1000, // 15 minutes
    10, // 10 uploads per user per 15 minutes
    'Too many uploads, please try again later'
  ),
  
  orderCreation: createUserBasedRateLimit(
    5 * 60 * 1000, // 5 minutes
    5, // 5 orders per user per 5 minutes
    'Too many order creation requests, please try again later'
  )
};

module.exports = {
  rateLimitConfigs,
  userRateLimiters
};