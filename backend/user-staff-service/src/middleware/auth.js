const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const StaffRole = require('../models/StaffRole');
const logger = require('../utils/logger');

const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const StaffRole = require('../models/StaffRole');
const logger = require('../utils/logger');
const { verifyAccessToken } = require('../../auth-identity-service/src/utils/jwt');

class AuthMiddleware {
  static async authenticateToken(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      // Use the updated verifyAccessToken that checks token version
      const user = await verifyAccessToken(token);
      req.user = user;
      next();

    } catch (error) {
      logger.logSecurityEvent('INVALID_TOKEN_ATTEMPT', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
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
          logger.logSecurityEvent('INSUFFICIENT_PERMISSIONS', {
            userId: req.user.userId,
            userRoles,
            requiredRoles: allowedRoles,
            resource: req.path,
            method: req.method,
            ip: req.ip
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
        logger.error('Role authorization error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization failed'
        });
      }
    };
  }

  static requirePermission(resource, action) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        // Check if user has permission
        const hasPermission = await AuthMiddleware.checkPermission(
          req.user.staffId || req.user.userId,
          resource,
          action
        );

        if (!hasPermission) {
          logger.logSecurityEvent('PERMISSION_DENIED', {
            userId: req.user.userId,
            staffId: req.user.staffId,
            resource,
            action,
            path: req.path,
            method: req.method,
            ip: req.ip
          });

          return res.status(403).json({
            success: false,
            message: `Permission denied: ${action} on ${resource}`
          });
        }

        next();
      } catch (error) {
        logger.error('Permission check error:', error);
        res.status(500).json({
          success: false,
          message: 'Permission check failed'
        });
      }
    };
  }

  static validateTenantAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const requestedTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
      
      // SAAS_ADMIN can access all tenants
      if (req.user.roles && req.user.roles.includes('SAAS_ADMIN')) {
        return next();
      }

      // Check if user belongs to the requested tenant
      if (requestedTenantId && req.user.tenantId !== requestedTenantId) {
        logger.logSecurityEvent('TENANT_ACCESS_VIOLATION', {
          userId: req.user.userId,
          userTenantId: req.user.tenantId,
          requestedTenantId,
          path: req.path,
          method: req.method,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied: Different tenant'
        });
      }

      next();
    } catch (error) {
      logger.error('Tenant access validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Tenant access validation failed'
      });
    }
  }

  static validateBranchAccess(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const requestedBranchId = req.params.branchId || req.body.branchId || req.query.branchId;
      
      // SAAS_ADMIN and CENTRAL_ADMIN can access all branches
      if (req.user.roles && req.user.roles.some(role => ['SAAS_ADMIN', 'CENTRAL_ADMIN'].includes(role))) {
        return next();
      }

      // Check if user belongs to the requested branch
      if (requestedBranchId && req.user.branchId !== requestedBranchId) {
        logger.logSecurityEvent('BRANCH_ACCESS_VIOLATION', {
          userId: req.user.userId,
          userBranchId: req.user.branchId,
          requestedBranchId,
          path: req.path,
          method: req.method,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied: Different branch'
        });
      }

      next();
    } catch (error) {
      logger.error('Branch access validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Branch access validation failed'
      });
    }
  }

  static validateStaffAccess(req, res, next) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const requestedStaffId = req.params.staffId;
        
        // Allow access to own profile
        if (req.user.staffId === requestedStaffId) {
          return next();
        }

        // SAAS_ADMIN can access all staff
        if (req.user.roles && req.user.roles.includes('SAAS_ADMIN')) {
          return next();
        }

        // Get requested staff details
        const requestedStaff = await Staff.findOne({ staffId: requestedStaffId });
        if (!requestedStaff) {
          return res.status(404).json({
            success: false,
            message: 'Staff member not found'
          });
        }

        // CENTRAL_ADMIN can access staff in same tenant
        if (req.user.roles && req.user.roles.includes('CENTRAL_ADMIN')) {
          if (req.user.tenantId === requestedStaff.tenantId) {
            return next();
          }
        }

        // BRANCH_ADMIN can access staff in same branch
        if (req.user.roles && req.user.roles.includes('BRANCH_ADMIN')) {
          if (req.user.tenantId === requestedStaff.tenantId && 
              req.user.branchId === requestedStaff.branchId) {
            return next();
          }
        }

        logger.logSecurityEvent('STAFF_ACCESS_VIOLATION', {
          userId: req.user.userId,
          requestedStaffId,
          userTenantId: req.user.tenantId,
          userBranchId: req.user.branchId,
          targetTenantId: requestedStaff.tenantId,
          targetBranchId: requestedStaff.branchId,
          path: req.path,
          method: req.method,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot access this staff member'
        });

      } catch (error) {
        logger.error('Staff access validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Staff access validation failed'
        });
      }
    };
  }

  static async checkPermission(staffId, resource, action) {
    try {
      // Get staff with roles
      const staff = await Staff.findOne({ staffId }).populate('roles.roleId');
      if (!staff) {
        return false;
      }

      // Check each active role for the permission
      for (const roleAssignment of staff.activeRoles) {
        const role = await StaffRole.findOne({ roleId: roleAssignment.roleId });
        if (role && role.hasPermission(resource, action)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Permission check error:', error);
      return false;
    }
  }

  static enrichUserContext(req, res, next) {
    return async (req, res, next) => {
      try {
        if (req.user && req.user.staffId) {
          // Get full staff details
          const staff = await Staff.findOne({ staffId: req.user.staffId });
          if (staff) {
            req.user.fullName = staff.fullName;
            req.user.email = staff.personalInfo.email;
            req.user.employmentStatus = staff.employmentInfo.employmentStatus;
            req.user.activeRoles = staff.activeRoles.map(r => r.roleName);
          }
        }
        next();
      } catch (error) {
        logger.error('User context enrichment error:', error);
        next(); // Continue without enrichment
      }
    };
  }

  static logAccess(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (req.user) {
        logger.logAudit('SYSTEM_ACCESS', 'SYSTEM', req.path, req.user.userId, {
          method: req.method,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          tenantId: req.user.tenantId,
          branchId: req.user.branchId
        });
      }
    });

    next();
  }

  static rateLimitByUser(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    const requests = new Map();

    return (req, res, next) => {
      if (!req.user) {
        return next();
      }

      const userId = req.user.userId;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (requests.has(userId)) {
        const userRequests = requests.get(userId).filter(time => time > windowStart);
        requests.set(userId, userRequests);
      } else {
        requests.set(userId, []);
      }

      const userRequests = requests.get(userId);

      if (userRequests.length >= maxRequests) {
        logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          userId,
          requestCount: userRequests.length,
          windowMs,
          maxRequests,
          ip: req.ip,
          path: req.path
        });

        return res.status(429).json({
          success: false,
          message: 'Too many requests',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      userRequests.push(now);
      next();
    };
  }
}

module.exports = AuthMiddleware;