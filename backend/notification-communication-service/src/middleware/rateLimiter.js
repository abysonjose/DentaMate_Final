const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
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
      path: req.path,
      tenantId: req.tenantId || 'unknown'
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }
});

// Strict limiter for notification sending
const notificationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 notifications per minute per IP
  message: {
    success: false,
    message: 'Notification rate limit exceeded'
  },
  keyGenerator: (req) => {
    // Rate limit by tenant + service combination
    return `${req.tenantId || 'unknown'}-${req.serviceId || 'unknown'}-${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('Notification rate limit exceeded', {
      ip: req.ip,
      tenantId: req.tenantId,
      serviceId: req.serviceId,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Notification rate limit exceeded, please slow down'
    });
  }
});

// Template management limiter
const templateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 template operations per 5 minutes
  message: {
    success: false,
    message: 'Template operation rate limit exceeded'
  },
  keyGenerator: (req) => {
    return `template-${req.tenantId || 'unknown'}-${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('Template rate limit exceeded', {
      ip: req.ip,
      tenantId: req.tenantId,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Template operation rate limit exceeded'
    });
  }
});

// Bulk notification limiter
const bulkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 bulk operations per 10 minutes
  message: {
    success: false,
    message: 'Bulk operation rate limit exceeded'
  },
  keyGenerator: (req) => {
    return `bulk-${req.tenantId || 'unknown'}-${req.serviceId || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn('Bulk operation rate limit exceeded', {
      tenantId: req.tenantId,
      serviceId: req.serviceId,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Bulk operation rate limit exceeded'
    });
  }
});

module.exports = {
  generalLimiter,
  notificationLimiter,
  templateLimiter,
  bulkLimiter
};