const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authentication middleware
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      
      // Log authentication
      logger.info(`User authenticated: ${decoded.userId} (${decoded.email})`);
      
      next();
    } catch (jwtError) {
      logger.warn(`Invalid JWT token: ${jwtError.message}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * SaaS Admin only middleware
 */
const saasAdminOnly = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user has SAAS_ADMIN role
    if (!req.user.roles || !req.user.roles.includes('SAAS_ADMIN')) {
      logger.warn(`Unauthorized access attempt by user: ${req.user.userId} (${req.user.email})`);
      return res.status(403).json({
        success: false,
        message: 'SaaS Admin access required'
      });
    }

    // Log admin access
    logger.info(`SaaS Admin access granted: ${req.user.userId} (${req.user.email})`);
    
    next();
  } catch (error) {
    logger.error('SaaS Admin authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

/**
 * Role-based access control middleware
 */
const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRoles = req.user.roles || [];
      const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        logger.warn(`Insufficient permissions for user: ${req.user.userId}, required: ${allowedRoles.join(', ')}, has: ${userRoles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

/**
 * API Key authentication middleware (for service-to-service communication)
 */
const apiKeyAuth = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required'
      });
    }

    // Validate API key format
    if (!apiKey.startsWith('dk_') || apiKey.length !== 35) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key format'
      });
    }

    // In a real implementation, you would validate the API key against a database
    // For now, we'll accept any properly formatted key
    req.apiKey = apiKey;
    req.user = {
      userId: 'system',
      email: 'system@dentamate.com',
      roles: ['SYSTEM']
    };

    logger.info(`API key authentication successful: ${apiKey.substring(0, 10)}...`);
    
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.userId,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[logLevel](`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId
    });
  });

  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * CORS middleware for SaaS Admin
 */
const corsMiddleware = (req, res, next) => {
  const allowedOrigins = [
    'http://localhost:4200',
    'https://admin.dentamate.com',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

module.exports = {
  authMiddleware,
  saasAdminOnly,
  requireRoles,
  apiKeyAuth,
  requestLogger,
  securityHeaders,
  corsMiddleware
};