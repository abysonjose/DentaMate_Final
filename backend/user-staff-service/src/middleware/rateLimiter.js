const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisConnection = require('../config/redis');
const logger = require('../utils/logger');

class RateLimiterMiddleware {
  constructor() {
    this.redisStore = redisConnection.isConnected ? new RedisStore({
      sendCommand: (...args) => redisConnection.client.sendCommand(args),
    }) : undefined;
  }

  // General rate limiter for public endpoints
  get public() {
    return rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
      store: this.redisStore,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.ip;
      },
      onLimitReached: (req, res, options) => {
        logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          limit: options.max,
          windowMs: options.windowMs
        });
      }
    });
  }

  // Strict rate limiter for authentication endpoints
  get auth() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      store: this.redisStore,
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: 900 // 15 minutes
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Rate limit by IP and email combination for auth endpoints
        const email = req.body?.email || 'unknown';
        return `auth:${req.ip}:${email}`;
      },
      onLimitReached: (req, res, options) => {
        logger.logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          email: req.body?.email,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          limit: options.max,
          windowMs: options.windowMs
        });
      }
    });
  }

  // Rate limiter for staff creation (more restrictive)
  get staffCreation() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 staff creations per hour
      store: this.redisStore,
      message: {
        success: false,
        message: 'Too many staff creation requests, please try again later.',
        retryAfter: 3600 // 1 hour
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Rate limit by tenant and user combination
        const tenantId = req.user?.tenantId || req.body?.tenantId || 'unknown';
        const userId = req.user?.userId || 'unknown';
        return `staff_creation:${tenantId}:${userId}`;
      },
      onLimitReached: (req, res, options) => {
        logger.logSecurityEvent('STAFF_CREATION_RATE_LIMIT_EXCEEDED', {
          userId: req.user?.userId,
          tenantId: req.user?.tenantId || req.body?.tenantId,
          ip: req.ip,
          path: req.path,
          limit: options.max,
          windowMs: options.windowMs
        });
      }
    });
  }

  // Rate limiter for role assignments
  get roleAssignment() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 20, // 20 role assignments per 10 minutes
      store: this.redisStore,
      message: {
        success: false,
        message: 'Too many role assignment requests, please try again later.',
        retryAfter: 600 // 10 minutes
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        const userId = req.user?.userId || 'unknown';
        return `role_assignment:${userId}`;
      },
      onLimitReached: (req, res, options) => {
        logger.logSecurityEvent('ROLE_ASSIGNMENT_RATE_LIMIT_EXCEEDED', {
          userId: req.user?.userId,
          staffId: req.params?.staffId,
          roleId: req.body?.roleId,
          ip: req.ip,
          limit: options.max,
          windowMs: options.windowMs
        });
      }
    });
  }

  // Rate limiter for bulk operations
  get bulkOperations() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 bulk operations per hour
      store: this.redisStore,
      message: {
        success: false,
        message: 'Too many bulk operations, please try again later.',
        retryAfter: 3600 // 1 hour
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        const tenantId = req.user?.tenantId || 'unknown';
        const userId = req.user?.userId || 'unknown';
        return `bulk_operations:${tenantId}:${userId}`;
      },
      onLimitReached: (req, res, options) => {
        logger.logSecurityEvent('BULK_OPERATIONS_RATE_LIMIT_EXCEEDED', {
          userId: req.user?.userId,
          tenantId: req.user?.tenantId,
          ip: req.ip,
          path: req.path,
          limit: options.max,
          windowMs: options.windowMs
        });
      }
    });
  }

  // Rate limiter for sensitive operations (deactivation, deletion)
  get sensitiveOperations() {
    return rateLimit({
      windowMs: 30 * 60 * 1000, // 30 minutes
      max: 10, // 10 sensitive operations per 30 minutes
      store: this.redisStore,
      message: {
        success: false,
        message: 'Too many sensitive operations, please try again later.',
        retryAfter: 1800 // 30 minutes
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        const userId = req.user?.userId || 'unknown';
        return `sensitive_operations:${userId}`;
      },
      onLimitReached: (req, res, options) => {
        logger.logSecurityEvent('SENSITIVE_OPERATIONS_RATE_LIMIT_EXCEEDED', {
          userId: req.user?.userId,
          ip: req.ip,
          path: req.path,
          method: req.method,
          limit: options.max,
          windowMs: options.windowMs
        });
      }
    });
  }

  // Rate limiter for data export operations
  get dataExport() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 exports per hour
      store: this.redisStore,
      message: {
        success: false,
        message: 'Too many data export requests, please try again later.',
        retryAfter: 3600 // 1 hour
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        const tenantId = req.user?.tenantId || 'unknown';
        const userId = req.user?.userId || 'unknown';
        return `data_export:${tenantId}:${userId}`;
      },
      onLimitReached: (req, res, options) => {
        logger.logSecurityEvent('DATA_EXPORT_RATE_LIMIT_EXCEEDED', {
          userId: req.user?.userId,
          tenantId: req.user?.tenantId,
          ip: req.ip,
          path: req.path,
          limit: options.max,
          windowMs: options.windowMs
        });
      }
    });
  }

  // Dynamic rate limiter based on user role
  byRole(roleConfig = {}) {
    const defaultConfig = {
      SAAS_ADMIN: { windowMs: 15 * 60 * 1000, max: 1000 },
      CENTRAL_ADMIN: { windowMs: 15 * 60 * 1000, max: 500 },
      BRANCH_ADMIN: { windowMs: 15 * 60 * 1000, max: 200 },
      DEFAULT: { windowMs: 15 * 60 * 1000, max: 100 }
    };

    const config = { ...defaultConfig, ...roleConfig };

    return (req, res, next) => {
      const userRoles = req.user?.roles || [];
      let rateLimitConfig = config.DEFAULT;

      // Find the highest privilege role
      for (const role of ['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']) {
        if (userRoles.includes(role) && config[role]) {
          rateLimitConfig = config[role];
          break;
        }
      }

      const limiter = rateLimit({
        windowMs: rateLimitConfig.windowMs,
        max: rateLimitConfig.max,
        store: this.redisStore,
        message: {
          success: false,
          message: 'Rate limit exceeded for your role level.',
          retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000)
        },
        keyGenerator: (req) => {
          const userId = req.user?.userId || req.ip;
          return `role_based:${userId}`;
        },
        onLimitReached: (req, res, options) => {
          logger.logSecurityEvent('ROLE_BASED_RATE_LIMIT_EXCEEDED', {
            userId: req.user?.userId,
            userRoles: req.user?.roles,
            appliedConfig: rateLimitConfig,
            ip: req.ip,
            path: req.path,
            limit: options.max,
            windowMs: options.windowMs
          });
        }
      });

      limiter(req, res, next);
    };
  }

  // Custom rate limiter for specific endpoints
  custom(options = {}) {
    const {
      windowMs = 15 * 60 * 1000,
      max = 100,
      keyGenerator = (req) => req.ip,
      message = 'Too many requests',
      onLimitReached = null
    } = options;

    return rateLimit({
      windowMs,
      max,
      store: this.redisStore,
      message: {
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      },
      keyGenerator,
      onLimitReached: onLimitReached || ((req, res, options) => {
        logger.logSecurityEvent('CUSTOM_RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          limit: options.max,
          windowMs: options.windowMs
        });
      })
    });
  }

  // Progressive rate limiter (increases restrictions on repeated violations)
  progressive(baseConfig = {}) {
    const {
      windowMs = 15 * 60 * 1000,
      max = 100,
      progressiveMultiplier = 2,
      maxProgression = 4
    } = baseConfig;

    return async (req, res, next) => {
      const key = `progressive:${req.ip}`;
      const violationKey = `violations:${req.ip}`;

      try {
        // Get current violation count
        const violations = await redisConnection.get(violationKey) || 0;
        const currentMax = Math.max(1, max / Math.pow(progressiveMultiplier, Math.min(violations, maxProgression)));

        const limiter = rateLimit({
          windowMs,
          max: Math.floor(currentMax),
          store: this.redisStore,
          keyGenerator: () => key,
          onLimitReached: async (req, res, options) => {
            // Increment violation count
            const newViolations = parseInt(violations) + 1;
            await redisConnection.set(violationKey, newViolations, 24 * 60 * 60); // 24 hours

            logger.logSecurityEvent('PROGRESSIVE_RATE_LIMIT_EXCEEDED', {
              ip: req.ip,
              violations: newViolations,
              currentLimit: Math.floor(currentMax),
              path: req.path,
              method: req.method
            });
          }
        });

        limiter(req, res, next);
      } catch (error) {
        logger.error('Progressive rate limiter error:', error);
        next(); // Continue without rate limiting on error
      }
    };
  }
}

// Create singleton instance
const rateLimiter = new RateLimiterMiddleware();

module.exports = rateLimiter;