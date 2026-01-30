const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class AuthMiddleware {
  // Verify JWT token
  static verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Validate required fields
      if (!decoded.userId || !decoded.tenantId || !decoded.role) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload'
        });
      }

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        branchId: decoded.branchId,
        role: decoded.role,
        name: decoded.name,
        email: decoded.email,
        permissions: decoded.permissions || []
      };

      logger.info('User authenticated', {
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        role: req.user.role,
        endpoint: req.path
      });

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      logger.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }

  // Check if user has required role
  static requireRole(allowedRoles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const userRole = req.user.role;
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!rolesArray.includes(userRole)) {
          logger.warn('Access denied - insufficient role', {
            userId: req.user.userId,
            userRole,
            requiredRoles: rolesArray,
            endpoint: req.path
          });

          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }

        next();
      } catch (error) {
        logger.error('Role check error:', error);
        return res.status(500).json({
          success: false,
          message: 'Authorization failed'
        });
      }
    };
  }

  // Check if user has specific permission
  static requirePermission(permission) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const userPermissions = req.user.permissions || [];
        
        if (!userPermissions.includes(permission)) {
          logger.warn('Access denied - missing permission', {
            userId: req.user.userId,
            requiredPermission: permission,
            userPermissions,
            endpoint: req.path
          });

          return res.status(403).json({
            success: false,
            message: 'Permission denied'
          });
        }

        next();
      } catch (error) {
        logger.error('Permission check error:', error);
        return res.status(500).json({
          success: false,
          message: 'Authorization failed'
        });
      }
    };
  }

  // Validate tenant access
  static validateTenantAccess(req, res, next) {
    try {
      const tenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
      
      if (tenantId && tenantId !== req.user.tenantId) {
        logger.warn('Tenant access violation', {
          userId: req.user.userId,
          userTenantId: req.user.tenantId,
          requestedTenantId: tenantId,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'Tenant access denied'
        });
      }

      next();
    } catch (error) {
      logger.error('Tenant validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Tenant validation failed'
      });
    }
  }

  // Validate branch access (optional - some users can access multiple branches)
  static validateBranchAccess(req, res, next) {
    try {
      const branchId = req.params.branchId || req.body.branchId || req.query.branchId;
      
      // Skip validation if no branch specified or user has multi-branch access
      if (!branchId || req.user.role === 'CENTRAL_ADMIN' || req.user.role === 'SAAS_ADMIN') {
        return next();
      }

      if (branchId !== req.user.branchId) {
        logger.warn('Branch access violation', {
          userId: req.user.userId,
          userBranchId: req.user.branchId,
          requestedBranchId: branchId,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'Branch access denied'
        });
      }

      next();
    } catch (error) {
      logger.error('Branch validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Branch validation failed'
      });
    }
  }

  // Collaboration-specific role validation
  static requireCollaborationRole(req, res, next) {
    try {
      const allowedRoles = [
        'DOCTOR', 
        'SPECIALIST', 
        'ORTHOTIST', 
        'HEAD_NURSE', 
        'NURSE'
      ];

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Collaboration access denied', {
          userId: req.user.userId,
          userRole: req.user.role,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'Collaboration access restricted to clinical staff'
        });
      }

      next();
    } catch (error) {
      logger.error('Collaboration role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role validation failed'
      });
    }
  }

  // Meeting-specific role validation
  static requireMeetingRole(req, res, next) {
    try {
      const allowedRoles = [
        'DOCTOR', 
        'SPECIALIST', 
        'ORTHOTIST'
      ];

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Meeting access denied', {
          userId: req.user.userId,
          userRole: req.user.role,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'Meeting access restricted to doctors and specialists'
        });
      }

      next();
    } catch (error) {
      logger.error('Meeting role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role validation failed'
      });
    }
  }

  // Optional authentication (for public endpoints that benefit from user context)
  static optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return next();
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.userId && decoded.tenantId && decoded.role) {
        req.user = {
          userId: decoded.userId,
          tenantId: decoded.tenantId,
          branchId: decoded.branchId,
          role: decoded.role,
          name: decoded.name,
          email: decoded.email,
          permissions: decoded.permissions || []
        };
      }

      next();
    } catch (error) {
      // Ignore auth errors for optional auth
      next();
    }
  }
}

module.exports = AuthMiddleware;