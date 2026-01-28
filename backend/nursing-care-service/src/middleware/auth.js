const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class AuthMiddleware {
  // Verify JWT token
  static verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const token = authHeader.substring(7);
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Add user info to request
      req.user = {
        userId: decoded.userId,
        userName: decoded.userName,
        userRole: decoded.userRole,
        tenantId: decoded.tenantId,
        branchId: decoded.branchId,
        permissions: decoded.permissions || []
      };

      logger.info('User authenticated', {
        userId: req.user.userId,
        userRole: req.user.userRole,
        tenantId: req.user.tenantId
      });

      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      
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

      return res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  }

  // Check if user has required role
  static requireRole(allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.userRole;
      
      if (!allowedRoles.includes(userRole)) {
        logger.warn('Access denied - insufficient role', {
          userId: req.user.userId,
          userRole: userRole,
          requiredRoles: allowedRoles
        });
        
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  // Check if user has specific permission
  static requirePermission(permission) {
    return (req, res, next) => {
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
          userRole: req.user.userRole,
          requiredPermission: permission,
          userPermissions: userPermissions
        });
        
        return res.status(403).json({
          success: false,
          message: 'Permission denied'
        });
      }

      next();
    };
  }

  // Nursing-specific role checks
  static requireNursingRole() {
    return AuthMiddleware.requireRole([
      'NURSE',
      'HEAD_NURSE',
      'BRANCH_ADMIN',
      'CENTRAL_ADMIN'
    ]);
  }

  static requireHeadNurseOrAbove() {
    return AuthMiddleware.requireRole([
      'HEAD_NURSE',
      'BRANCH_ADMIN',
      'CENTRAL_ADMIN'
    ]);
  }

  static requireNurseOrAbove() {
    return AuthMiddleware.requireRole([
      'NURSE',
      'HEAD_NURSE',
      'DOCTOR',
      'BRANCH_ADMIN',
      'CENTRAL_ADMIN'
    ]);
  }

  // Check if user can access patient data (same branch)
  static requireSameBranch(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Central admin can access all branches
    if (req.user.userRole === 'CENTRAL_ADMIN') {
      return next();
    }

    // Extract branchId from request (params, body, or query)
    const requestBranchId = req.params.branchId || req.body.branchId || req.query.branchId;
    
    if (requestBranchId && req.user.branchId !== requestBranchId) {
      logger.warn('Access denied - different branch', {
        userId: req.user.userId,
        userBranchId: req.user.branchId,
        requestedBranchId: requestBranchId
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied - different branch'
      });
    }

    next();
  }

  // Check tenant isolation
  static requireSameTenant(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Extract tenantId from request
    const requestTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
    
    if (requestTenantId && req.user.tenantId !== requestTenantId) {
      logger.warn('Access denied - different tenant', {
        userId: req.user.userId,
        userTenantId: req.user.tenantId,
        requestedTenantId: requestTenantId
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied - different tenant'
      });
    }

    next();
  }
}

module.exports = AuthMiddleware;