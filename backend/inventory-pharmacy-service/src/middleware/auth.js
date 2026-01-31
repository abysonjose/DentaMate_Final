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
          message: 'Access token required',
          code: 'TOKEN_MISSING'
        });
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required',
          code: 'TOKEN_MISSING'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Validate required fields
      if (!decoded.userId || !decoded.tenantId || !decoded.role) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload',
          code: 'INVALID_TOKEN'
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
        role: req.user.role,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId
      });

      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        code: 'AUTH_ERROR'
      });
    }
  }

  // Role-based access control
  static requireRole(allowedRoles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        const userRole = req.user.role;
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!rolesArray.includes(userRole)) {
          logger.warn('Access denied - insufficient role', {
            userId: req.user.userId,
            userRole,
            requiredRoles: rolesArray,
            endpoint: req.originalUrl
          });

          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: rolesArray,
            current: userRole
          });
        }

        next();
      } catch (error) {
        logger.error('Role verification failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Authorization error',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  // Branch access control
  static requireBranchAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userBranchId = req.user.branchId;
      const requestedBranchId = req.params.branchId || req.body.branchId || req.query.branchId;

      // Central admin and SaaS admin can access all branches
      if (['central_admin', 'saas_admin'].includes(req.user.role)) {
        return next();
      }

      // Branch-specific roles must match branch
      if (requestedBranchId && userBranchId !== requestedBranchId) {
        logger.warn('Access denied - branch mismatch', {
          userId: req.user.userId,
          userBranchId,
          requestedBranchId,
          endpoint: req.originalUrl
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied to this branch',
          code: 'BRANCH_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      logger.error('Branch access verification failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  }

  // Tenant isolation
  static requireTenantAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userTenantId = req.user.tenantId;
      const requestedTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;

      // SaaS admin can access all tenants
      if (req.user.role === 'saas_admin') {
        return next();
      }

      // All other roles must match tenant
      if (requestedTenantId && userTenantId !== requestedTenantId) {
        logger.warn('Access denied - tenant mismatch', {
          userId: req.user.userId,
          userTenantId,
          requestedTenantId,
          endpoint: req.originalUrl
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied to this tenant',
          code: 'TENANT_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      logger.error('Tenant access verification failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  }

  // Permission-based access control
  static requirePermission(permission) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        const userPermissions = req.user.permissions || [];
        
        if (!userPermissions.includes(permission)) {
          logger.warn('Access denied - missing permission', {
            userId: req.user.userId,
            userRole: req.user.role,
            requiredPermission: permission,
            userPermissions,
            endpoint: req.originalUrl
          });

          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: permission
          });
        }

        next();
      } catch (error) {
        logger.error('Permission verification failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Authorization error',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  // Pharmacy-specific role validation
  static requirePharmacyRole(req, res, next) {
    const pharmacyRoles = [
      'pharmacist',
      'pharmacy_assistant',
      'head_nurse',
      'branch_admin',
      'central_admin'
    ];

    return AuthMiddleware.requireRole(pharmacyRoles)(req, res, next);
  }

  // Dispensing authorization (only pharmacists can dispense)
  static requireDispensingAuth(req, res, next) {
    const dispensingRoles = ['pharmacist'];
    return AuthMiddleware.requireRole(dispensingRoles)(req, res, next);
  }

  // Stock management authorization
  static requireStockManagementAuth(req, res, next) {
    const stockRoles = ['pharmacist', 'branch_admin'];
    return AuthMiddleware.requireRole(stockRoles)(req, res, next);
  }

  // Vendor management authorization
  static requireVendorManagementAuth(req, res, next) {
    const vendorRoles = ['pharmacist', 'branch_admin', 'accounts_manager'];
    return AuthMiddleware.requireRole(vendorRoles)(req, res, next);
  }
}

module.exports = AuthMiddleware;