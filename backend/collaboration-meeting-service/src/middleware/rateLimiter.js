const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

class RateLimiterMiddleware {
  // Create a rate limiter with custom options
  static createLimiter(maxRequests = 100, windowMinutes = 15, options = {}) {
    return rateLimit({
      windowMs: windowMinutes * 60 * 1000, // Convert minutes to milliseconds
      max: maxRequests,
      message: {
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: windowMinutes * 60
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      keyGenerator: (req) => {
        // Use combination of IP, user ID, and tenant ID for more granular limiting
        const userId = req.user?.userId || 'anonymous';
        const tenantId = req.user?.tenantId || 'unknown';
        return `${req.ip}:${userId}:${tenantId}`;
      },
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.userId,
          tenantId: req.user?.tenantId,
          endpoint: req.path,
          method: req.method
        });

        res.status(429).json({
          success: false,
          message: options.message || 'Too many requests, please try again later',
          retryAfter: windowMinutes * 60,
          limit: maxRequests,
          window: `${windowMinutes} minutes`
        });
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        if (req.path === '/health') {
          return true;
        }
        
        // Skip for certain roles if specified
        if (options.skipRoles && req.user?.role) {
          return options.skipRoles.includes(req.user.role);
        }
        
        return false;
      },
      ...options
    });
  }

  // Strict rate limiter for sensitive operations
  static strictLimiter() {
    return this.createLimiter(5, 15, {
      message: 'Too many sensitive operations, please wait before trying again'
    });
  }

  // Moderate rate limiter for general API calls
  static moderateLimiter() {
    return this.createLimiter(50, 15, {
      message: 'API rate limit exceeded, please slow down your requests'
    });
  }

  // Lenient rate limiter for read operations
  static lenientLimiter() {
    return this.createLimiter(200, 15, {
      message: 'Too many read requests, please try again shortly'
    });
  }

  // Authentication rate limiter
  static authLimiter() {
    return this.createLimiter(10, 15, {
      message: 'Too many authentication attempts, please try again later',
      keyGenerator: (req) => req.ip // Only use IP for auth attempts
    });
  }

  // File upload rate limiter
  static uploadLimiter() {
    return this.createLimiter(10, 60, {
      message: 'Too many file uploads, please wait before uploading more files'
    });
  }

  // Meeting join rate limiter (to prevent spam joining)
  static meetingJoinLimiter() {
    return this.createLimiter(20, 5, {
      message: 'Too many meeting join attempts, please wait a moment'
    });
  }

  // Discussion creation rate limiter
  static discussionLimiter() {
    return this.createLimiter(30, 15, {
      message: 'Too many discussion posts, please slow down'
    });
  }

  // Reaction rate limiter (for likes, etc.)
  static reactionLimiter() {
    return this.createLimiter(60, 15, {
      message: 'Too many reactions, please wait before reacting again'
    });
  }

  // Global rate limiter for the entire service
  static globalLimiter() {
    return this.createLimiter(1000, 15, {
      message: 'Service temporarily overloaded, please try again later',
      keyGenerator: (req) => req.ip
    });
  }

  // Tenant-specific rate limiter
  static tenantLimiter(maxRequests = 500, windowMinutes = 15) {
    return this.createLimiter(maxRequests, windowMinutes, {
      message: 'Tenant rate limit exceeded, please contact support if this continues',
      keyGenerator: (req) => req.user?.tenantId || req.ip
    });
  }

  // Branch-specific rate limiter
  static branchLimiter(maxRequests = 200, windowMinutes = 15) {
    return this.createLimiter(maxRequests, windowMinutes, {
      message: 'Branch rate limit exceeded, please try again later',
      keyGenerator: (req) => {
        const tenantId = req.user?.tenantId || 'unknown';
        const branchId = req.user?.branchId || 'unknown';
        return `${tenantId}:${branchId}`;
      }
    });
  }

  // Dynamic rate limiter based on user role
  static roleBased() {
    return (req, res, next) => {
      const userRole = req.user?.role;
      let limiter;

      switch (userRole) {
        case 'DOCTOR':
        case 'SPECIALIST':
          limiter = this.createLimiter(100, 15); // Higher limits for doctors
          break;
        case 'NURSE':
        case 'HEAD_NURSE':
          limiter = this.createLimiter(75, 15);
          break;
        case 'ORTHOTIST':
          limiter = this.createLimiter(50, 15);
          break;
        case 'BRANCH_ADMIN':
        case 'CENTRAL_ADMIN':
          limiter = this.createLimiter(150, 15); // Higher limits for admins
          break;
        default:
          limiter = this.createLimiter(25, 15); // Lower limits for other roles
      }

      limiter(req, res, next);
    };
  }

  // Time-based rate limiter (stricter during peak hours)
  static timeBased() {
    return (req, res, next) => {
      const hour = new Date().getHours();
      const isPeakHour = (hour >= 9 && hour <= 17); // 9 AM to 5 PM
      
      const limiter = isPeakHour 
        ? this.createLimiter(75, 15) // Stricter during peak hours
        : this.createLimiter(100, 15); // More lenient during off-hours

      limiter(req, res, next);
    };
  }

  // Collaboration-specific rate limiter
  static collaborationLimiter() {
    return this.createLimiter(50, 15, {
      message: 'Too many collaboration requests, please wait before sharing more cases'
    });
  }

  // Meeting-specific rate limiter
  static meetingLimiter() {
    return this.createLimiter(25, 15, {
      message: 'Too many meeting operations, please wait before scheduling more meetings'
    });
  }
}

module.exports = RateLimiterMiddleware;