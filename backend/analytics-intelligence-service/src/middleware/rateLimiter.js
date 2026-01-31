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
      tenantId: req.tenantId || 'unknown',
      userId: req.userId || 'unknown',
      category: 'rate_limit'
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }
});

// Dashboard access limiter - more permissive for frequent dashboard refreshes
const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 dashboard requests per minute
  message: {
    success: false,
    message: 'Dashboard access rate limit exceeded'
  },
  keyGenerator: (req) => {
    // Rate limit by tenant + user combination
    return `dashboard-${req.tenantId || 'unknown'}-${req.userId || 'unknown'}-${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('Dashboard rate limit exceeded', {
      ip: req.ip,
      tenantId: req.tenantId,
      userId: req.userId,
      role: req.role,
      path: req.path,
      category: 'rate_limit'
    });
    res.status(429).json({
      success: false,
      message: 'Dashboard access rate limit exceeded, please slow down'
    });
  }
});

// Report generation limiter - stricter for resource-intensive operations
const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 report generations per 10 minutes
  message: {
    success: false,
    message: 'Report generation rate limit exceeded'
  },
  keyGenerator: (req) => {
    return `report-${req.tenantId || 'unknown'}-${req.userId || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn('Report generation rate limit exceeded', {
      tenantId: req.tenantId,
      userId: req.userId,
      role: req.role,
      path: req.path,
      category: 'rate_limit'
    });
    res.status(429).json({
      success: false,
      message: 'Report generation rate limit exceeded'
    });
  }
});

// KPI calculation limiter
const kpiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 20, // 20 KPI requests per 2 minutes
  message: {
    success: false,
    message: 'KPI calculation rate limit exceeded'
  },
  keyGenerator: (req) => {
    return `kpi-${req.tenantId || 'unknown'}-${req.branchId || 'all'}-${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('KPI calculation rate limit exceeded', {
      ip: req.ip,
      tenantId: req.tenantId,
      branchId: req.branchId,
      userId: req.userId,
      path: req.path,
      category: 'rate_limit'
    });
    res.status(429).json({
      success: false,
      message: 'KPI calculation rate limit exceeded'
    });
  }
});

// Data ingestion limiter - for service-to-service calls
const dataIngestionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 data ingestion calls per minute
  message: {
    success: false,
    message: 'Data ingestion rate limit exceeded'
  },
  keyGenerator: (req) => {
    return `ingestion-${req.serviceId || 'unknown'}-${req.tenantId || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn('Data ingestion rate limit exceeded', {
      serviceId: req.serviceId,
      tenantId: req.tenantId,
      path: req.path,
      category: 'rate_limit'
    });
    res.status(429).json({
      success: false,
      message: 'Data ingestion rate limit exceeded'
    });
  }
});

// Export limiter - for file downloads
const exportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 exports per 5 minutes
  message: {
    success: false,
    message: 'Export rate limit exceeded'
  },
  keyGenerator: (req) => {
    return `export-${req.tenantId || 'unknown'}-${req.userId || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn('Export rate limit exceeded', {
      tenantId: req.tenantId,
      userId: req.userId,
      role: req.role,
      path: req.path,
      category: 'rate_limit'
    });
    res.status(429).json({
      success: false,
      message: 'Export rate limit exceeded'
    });
  }
});

// Prediction API limiter - for future ML features
const predictionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // 15 prediction requests per 5 minutes
  message: {
    success: false,
    message: 'Prediction API rate limit exceeded'
  },
  keyGenerator: (req) => {
    return `prediction-${req.tenantId || 'unknown'}-${req.branchId || 'all'}`;
  },
  handler: (req, res) => {
    logger.warn('Prediction API rate limit exceeded', {
      tenantId: req.tenantId,
      branchId: req.branchId,
      userId: req.userId,
      path: req.path,
      category: 'rate_limit'
    });
    res.status(429).json({
      success: false,
      message: 'Prediction API rate limit exceeded'
    });
  }
});

// Role-based rate limiting
const createRoleBasedLimiter = (roleConfig) => {
  return rateLimit({
    windowMs: roleConfig.windowMs || 15 * 60 * 1000,
    max: (req) => {
      const role = req.role;
      return roleConfig[role] || roleConfig.default || 50;
    },
    keyGenerator: (req) => {
      return `role-${req.role}-${req.tenantId || 'unknown'}-${req.userId || 'unknown'}`;
    },
    handler: (req, res) => {
      logger.warn('Role-based rate limit exceeded', {
        role: req.role,
        tenantId: req.tenantId,
        userId: req.userId,
        path: req.path,
        category: 'rate_limit'
      });
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded for role: ${req.role}`
      });
    }
  });
};

// Analytics-specific role limits
const analyticsRoleLimiter = createRoleBasedLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  'SAAS_ADMIN': 200,
  'CENTRAL_ADMIN': 150,
  'BRANCH_ADMIN': 100,
  'ACCOUNTS_MANAGER': 80,
  'DOCTOR': 30,
  default: 50
});

module.exports = {
  generalLimiter,
  dashboardLimiter,
  reportLimiter,
  kpiLimiter,
  dataIngestionLimiter,
  exportLimiter,
  predictionLimiter,
  analyticsRoleLimiter,
  createRoleBasedLimiter
};