const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

class RateLimiterMiddleware {
  // General rate limiter
  static general() {
    return rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl,
          method: req.method,
          userId: req.user?.userId,
          tenantId: req.user?.tenantId
        });

        res.status(429).json({
          success: false,
          message: 'Too many requests from this IP, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
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
      max: 20, // limit each IP to 20 requests per windowMs
      message: {
        success: false,
        message: 'Too many sensitive requests from this IP, please try again later',
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Strict rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl,
          method: req.method,
          userId: req.user?.userId,
          tenantId: req.user?.tenantId
        });

        res.status(429).json({
          success: false,
          message: 'Too many sensitive requests from this IP, please try again later',
          code: 'STRICT_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  // Dispensing rate limiter (prevent rapid dispensing)
  static dispensing() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10, // limit each IP to 10 dispensing requests per 5 minutes
      message: {
        success: false,
        message: 'Too many dispensing requests, please wait before dispensing again',
        code: 'DISPENSING_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use user ID instead of IP for authenticated dispensing requests
        return req.user?.userId || req.ip;
      },
      handler: (req, res) => {
        logger.warn('Dispensing rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          tenantId: req.user?.tenantId,
          branchId: req.user?.branchId,
          endpoint: req.originalUrl,
          method: req.method
        });

        res.status(429).json({
          success: false,
          message: 'Too many dispensing requests, please wait before dispensing again',
          code: 'DISPENSING_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  // Stock modification rate limiter
  static stockModification() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 50, // limit each user to 50 stock modifications per 10 minutes
      message: {
        success: false,
        message: 'Too many stock modification requests, please slow down',
        code: 'STOCK_MODIFICATION_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.user?.userId || req.ip;
      },
      handler: (req, res) => {
        logger.warn('Stock modification rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          tenantId: req.user?.tenantId,
          branchId: req.user?.branchId,
          endpoint: req.originalUrl,
          method: req.method
        });

        res.status(429).json({
          success: false,
          message: 'Too many stock modification requests, please slow down',
          code: 'STOCK_MODIFICATION_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  // Search rate limiter (prevent search abuse)
  static search() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // limit each IP to 30 search requests per minute
      message: {
        success: false,
        message: 'Too many search requests, please slow down',
        code: 'SEARCH_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Search rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          endpoint: req.originalUrl,
          method: req.method,
          searchTerm: req.query.search
        });

        res.status(429).json({
          success: false,
          message: 'Too many search requests, please slow down',
          code: 'SEARCH_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  // Report generation rate limiter
  static reports() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each user to 5 report generations per 15 minutes
      message: {
        success: false,
        message: 'Too many report generation requests, please wait before generating another report',
        code: 'REPORT_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.user?.userId || req.ip;
      },
      handler: (req, res) => {
        logger.warn('Report generation rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          tenantId: req.user?.tenantId,
          branchId: req.user?.branchId,
          endpoint: req.originalUrl,
          method: req.method
        });

        res.status(429).json({
          success: false,
          message: 'Too many report generation requests, please wait before generating another report',
          code: 'REPORT_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  // Bulk operations rate limiter
  static bulkOperations() {
    return rateLimit({
      windowMs: 30 * 60 * 1000, // 30 minutes
      max: 3, // limit each user to 3 bulk operations per 30 minutes
      message: {
        success: false,
        message: 'Too many bulk operations, please wait before performing another bulk operation',
        code: 'BULK_OPERATION_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.user?.userId || req.ip;
      },
      handler: (req, res) => {
        logger.warn('Bulk operation rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          tenantId: req.user?.tenantId,
          branchId: req.user?.branchId,
          endpoint: req.originalUrl,
          method: req.method
        });

        res.status(429).json({
          success: false,
          message: 'Too many bulk operations, please wait before performing another bulk operation',
          code: 'BULK_OPERATION_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
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
        message: 'Rate limit exceeded',
        code: 'CUSTOM_RATE_LIMIT_EXCEEDED'
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
          method: req.method,
          rateLimitType: options.name || 'custom'
        });

        res.status(429).json({
          success: false,
          message: options.message?.message || 'Rate limit exceeded',
          code: options.message?.code || 'CUSTOM_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }
}

module.exports = RateLimiterMiddleware;