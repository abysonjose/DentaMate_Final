const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class AuthMiddleware {
  // Verify JWT token and extract user information
  static authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Validate required token fields
      if (!decoded.userId || !decoded.tenantId || !decoded.role) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format'
        });
      }

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        branchId: decoded.branchId,
        role: decoded.role,
        permissions: decoded.permissions || [],
        email: decoded.email,
        name: decoded.name
      };

      logger.info('User authenticated', {
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        role: req.user.role,
        endpoint: req.path
      });

      next();
    } catch (error) {
      logger.error('Authentication failed:', error);
      
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

      const userRole = req.user.role;
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!roles.includes(userRole)) {
        logger.warn('Access denied - insufficient role', {
          userId: req.user.userId,
          userRole,
          requiredRoles: roles,
          endpoint: req.path
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
          userRole: req.user.role,
          requiredPermission: permission,
          userPermissions,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  // Validate tenant access
  static validateTenantAccess(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Extract tenant ID from request (params, body, or query)
    const requestTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
    
    if (requestTenantId && requestTenantId !== req.user.tenantId) {
      logger.warn('Tenant access violation', {
        userId: req.user.userId,
        userTenantId: req.user.tenantId,
        requestedTenantId: requestTenantId,
        endpoint: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied to tenant resources'
      });
    }

    next();
  }

  // Validate branch access (for branch-specific operations)
  static validateBranchAccess(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Extract branch ID from request
    const requestBranchId = req.params.branchId || req.body.branchId || req.query.branchId;
    
    // Skip validation if no branch ID in request or user has global access
    if (!requestBranchId || req.user.role === 'CENTRAL_ADMIN' || req.user.role === 'SAAS_ADMIN') {
      return next();
    }

    if (req.user.branchId && requestBranchId !== req.user.branchId) {
      logger.warn('Branch access violation', {
        userId: req.user.userId,
        userBranchId: req.user.branchId,
        requestedBranchId: requestBranchId,
        endpoint: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied to branch resources'
      });
    }

    next();
  }

  // Lab diagnostics specific role validation
  static validateLabDiagnosticsAccess(action) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { role } = req.user;
      let hasAccess = false;

      switch (action) {
        case 'CREATE_ORDER':
          hasAccess = ['DOCTOR'].includes(role);
          break;
        case 'VIEW_ORDER':
          hasAccess = ['DOCTOR', 'LAB_STAFF', 'NURSE', 'HEAD_NURSE', 'BRANCH_ADMIN'].includes(role);
          break;
        case 'UPDATE_ORDER_STATUS':
          hasAccess = ['LAB_STAFF', 'DOCTOR'].includes(role);
          break;
        case 'UPLOAD_FILES':
          hasAccess = ['LAB_STAFF'].includes(role);
          break;
        case 'VIEW_RESULTS':
          hasAccess = ['DOCTOR', 'LAB_STAFF', 'NURSE', 'HEAD_NURSE', 'PATIENT'].includes(role);
          break;
        case 'APPROVE_PATIENT_ACCESS':
          hasAccess = ['DOCTOR'].includes(role);
          break;
        case 'MANAGE_WORKLIST':
          hasAccess = ['LAB_STAFF', 'HEAD_NURSE', 'BRANCH_ADMIN'].includes(role);
          break;
        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        logger.warn('Lab diagnostics access denied', {
          userId: req.user.userId,
          userRole: role,
          action,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          message: `Access denied for action: ${action}`
        });
      }

      next();
    };
  }
}

module.exports = AuthMiddleware;