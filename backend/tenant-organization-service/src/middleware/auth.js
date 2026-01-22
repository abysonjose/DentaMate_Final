const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class AuthMiddleware {
  static authenticateToken(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
          logger.warn('Invalid token attempt:', { 
            error: err.message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          
          return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
          });
        }

        req.user = user;
        next();
      });

    } catch (error) {
      logger.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }

  static requireRole(allowedRoles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
          logger.warn('Insufficient permissions:', {
            userId: req.user.userId,
            userRoles,
            requiredRoles: allowedRoles,
            endpoint: req.path
          });

          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            required: allowedRoles,
            current: userRoles
          });
        }

        next();
      } catch (error) {
        logger.error('Role validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization failed'
        });
      }
    };
  }

  static validateTenantAccess(req, res, next) {
    try {
      const { tenantId } = req.params;
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // SAAS_ADMIN can access all tenants
      if (user.roles && user.roles.includes('SAAS_ADMIN')) {
        return next();
      }

      // Check if user belongs to the requested tenant
      if (user.tenantId !== tenantId) {
        logger.warn('Tenant access violation:', {
          userId: user.userId,
          userTenantId: user.tenantId,
          requestedTenantId: tenantId,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied to this tenant'
        });
      }

      next();
    } catch (error) {
      logger.error('Tenant access validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Access validation failed'
      });
    }
  }

  static validateBranchAccess(req, res, next) {
    try {
      const { branchId } = req.params;
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // SAAS_ADMIN and CENTRAL_ADMIN can access all branches
      if (user.roles && (user.roles.includes('SAAS_ADMIN') || user.roles.includes('CENTRAL_ADMIN'))) {
        return next();
      }

      // BRANCH_ADMIN can only access their assigned branch
      if (user.roles && user.roles.includes('BRANCH_ADMIN')) {
        if (user.branchId !== branchId) {
          logger.warn('Branch access violation:', {
            userId: user.userId,
            userBranchId: user.branchId,
            requestedBranchId: branchId,
            endpoint: req.path
          });

          return res.status(403).json({
            success: false,
            message: 'Access denied to this branch'
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Branch access validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Access validation failed'
      });
    }
  }

  static optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return next(); // Continue without authentication
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (!err) {
          req.user = user;
        }
        next();
      });

    } catch (error) {
      logger.error('Optional authentication error:', error);
      next(); // Continue even if auth fails
    }
  }

  static extractTenantFromToken(req, res, next) {
    try {
      if (req.user && req.user.tenantId) {
        req.tenantId = req.user.tenantId;
      }
      next();
    } catch (error) {
      logger.error('Tenant extraction error:', error);
      next();
    }
  }

  static validateApiKey(req, res, next) {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: 'API key required'
        });
      }

      // In production, validate against database
      const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
      
      if (!validApiKeys.includes(apiKey)) {
        logger.warn('Invalid API key attempt:', {
          apiKey: apiKey.substring(0, 8) + '...',
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          success: false,
          message: 'Invalid API key'
        });
      }

      req.apiKeyAuth = true;
      next();
    } catch (error) {
      logger.error('API key validation error:', error);
      res.status(500).json({
        success: false,
        message: 'API key validation failed'
      });
    }
  }
}

module.exports = {
  authenticateToken: AuthMiddleware.authenticateToken,
  requireRole: AuthMiddleware.requireRole,
  validateTenantAccess: AuthMiddleware.validateTenantAccess,
  validateBranchAccess: AuthMiddleware.validateBranchAccess,
  optionalAuth: AuthMiddleware.optionalAuth,
  extractTenantFromToken: AuthMiddleware.extractTenantFromToken,
  validateApiKey: AuthMiddleware.validateApiKey
};