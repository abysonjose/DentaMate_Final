const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

class RateLimiterMiddleware {
  // General rate limiter
  static general() {
    return rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: {
        success: false,
        message: 'Too many requests, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.userId,
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later'
        });
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/api/health';
      }
    });
  }

  // Strict rate limiter for sensitive operations
  static strict() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // Limit each IP to 20 requests per windowMs
      message: {
        success: false,
        message: 'Too many sensitive operations, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Strict rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.userId,
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          success: false,
          message: 'Too many sensitive operations, please try again later'
        });
      }
    });
  }

  // Escalation rate limiter (prevent spam escalations)
  static escalation() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 5, // Limit each user to 5 escalations per 5 minutes
      keyGenerator: (req) => {
        // Rate limit per user, not per IP
        return req.user?.userId || req.ip;
      },
      message: {
        success: false,
        message: 'Too many escalations raised, please wait before creating another'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Escalation rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          userRole: req.user?.userRole,
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          success: false,
          message: 'Too many escalations raised, please wait before creating another'
        });
      }
    });
  }

  // Vitals recording rate limiter
  static vitalsRecording() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 10, // Limit each user to 10 vitals recordings per minute
      keyGenerator: (req) => {
        return req.user?.userId || req.ip;
      },
      message: {
        success: false,
        message: 'Too many vitals recordings, please wait before recording more'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Vitals recording rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          userRole: req.user?.userRole,
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          success: false,
          message: 'Too many vitals recordings, please wait before recording more'
        });
      }
    });
  }

  // Care notes rate limiter
  static careNotes() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 15, // Limit each user to 15 care notes per minute
      keyGenerator: (req) => {
        return req.user?.userId || req.ip;
      },
      message: {
        success: false,
        message: 'Too many care notes created, please wait before creating more'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Care notes rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          userRole: req.user?.userRole,
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          success: false,
          message: 'Too many care notes created, please wait before creating more'
        });
      }
    });
  }

  // Task creation rate limiter
  static taskCreation() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 20, // Limit each user to 20 task creations per 5 minutes
      keyGenerator: (req) => {
        return req.user?.userId || req.ip;
      },
      message: {
        success: false,
        message: 'Too many tasks created, please wait before creating more'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Task creation rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          userRole: req.user?.userRole,
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          success: false,
          message: 'Too many tasks created, please wait before creating more'
        });
      }
    });
  }

  // Login attempts rate limiter
  static loginAttempts() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per windowMs
      message: {
        success: false,
        message: 'Too many login attempts, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Login rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          success: false,
          message: 'Too many login attempts, please try again later'
        });
      }
    });
  }

  // Create custom rate limiter
  static custom(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: {
        success: false,
        message: 'Rate limit exceeded'
      },
      standardHeaders: true,
      legacyHeaders: false
    };

    return rateLimit({
      ...defaultOptions,
      ...options,
      handler: (req, res) => {
        logger.warn('Custom rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          endpoint: req.originalUrl,
          options: options
        });
        
        res.status(429).json(options.message || defaultOptions.message);
      }
    });
  }
}

module.exports = RateLimiterMiddleware;