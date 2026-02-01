const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'TOKEN_MISSING'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('Invalid token attempt', {
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token',
          code: 'TOKEN_INVALID'
        });
      }

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        tenantId: decoded.tenantId,
        branchId: decoded.branchId,
        permissions: decoded.permissions || []
      };

      next();
    });
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Unauthorized access attempt', {
          userId: req.user.userId,
          role: req.user.role,
          requiredRoles: allowedRoles,
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// Tenant isolation middleware - ensures users can only access their tenant's data
const enforceTenantIsolation = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // For SaaS Admin, allow access to platform-level data only
    if (req.user.role === 'SAAS_ADMIN') {
      // SaaS Admin has limited access - only to platform metadata
      req.tenantFilter = { 
        allowPlatformAccess: true,
        restrictedAccess: true 
      };
      return next();
    }

    // For all other roles, enforce strict tenant isolation
    if (!req.user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Tenant context required',
        code: 'TENANT_REQUIRED'
      });
    }

    // Add tenant filter to request for database queries
    req.tenantFilter = { 
      tenantId: req.user.tenantId,
      allowPlatformAccess: false,
      restrictedAccess: false
    };

    // For branch-specific roles, add branch filter
    if (req.user.branchId && req.user.role !== 'CENTRAL_ADMIN') {
      req.tenantFilter.branchId = req.user.branchId;
    }

    next();
  } catch (error) {
    logger.error('Tenant isolation middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Tenant isolation error',
      code: 'TENANT_ERROR'
    });
  }
};

// Service-to-service authentication for internal API calls
const authenticateService = (req, res, next) => {
  try {
    const serviceToken = req.headers['x-service-token'];
    const serviceId = req.headers['x-service-id'];

    if (!serviceToken || !serviceId) {
      return res.status(401).json({
        success: false,
        message: 'Service authentication required',
        code: 'SERVICE_AUTH_REQUIRED'
      });
    }

    // Verify service token
    jwt.verify(serviceToken, process.env.JWT_SECRET, (err, decoded) => {
      if (err || decoded.type !== 'service' || decoded.serviceId !== serviceId) {
        logger.warn('Invalid service token attempt', {
          serviceId,
          error: err?.message,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Invalid service token',
          code: 'SERVICE_TOKEN_INVALID'
        });
      }

      req.service = {
        serviceId: decoded.serviceId,
        serviceName: decoded.serviceName,
        permissions: decoded.permissions || []
      };

      next();
    });
  } catch (error) {
    logger.error('Service authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Service authentication error',
      code: 'SERVICE_AUTH_ERROR'
    });
  }
};

// Audit access control - specific permissions for audit data
const authorizeAuditAccess = (accessType = 'READ') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const { role } = req.user;
      let hasAccess = false;
      let accessScope = 'NONE';

      switch (role) {
        case 'CENTRAL_ADMIN':
          hasAccess = true;
          accessScope = 'TENANT_FULL';
          break;
        
        case 'ACCOUNTS_MANAGER':
          hasAccess = accessType === 'READ';
          accessScope = 'FINANCIAL_ONLY';
          break;
        
        case 'COMPLIANCE_OFFICER':
          hasAccess = true;
          accessScope = 'TENANT_FULL';
          break;
        
        case 'SAAS_ADMIN':
          hasAccess = accessType === 'READ';
          accessScope = 'PLATFORM_METADATA';
          break;
        
        default:
          hasAccess = false;
          accessScope = 'NONE';
      }

      if (!hasAccess) {
        logger.warn('Unauthorized audit access attempt', {
          userId: req.user.userId,
          role: req.user.role,
          accessType,
          endpoint: req.path,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient audit permissions',
          code: 'AUDIT_ACCESS_DENIED'
        });
      }

      req.auditAccess = {
        scope: accessScope,
        canRead: hasAccess && accessType === 'READ',
        canWrite: hasAccess && accessType === 'write',
        financialOnly: accessScope === 'FINANCIAL_ONLY',
        platformOnly: accessScope === 'PLATFORM_METADATA'
      };

      next();
    } catch (error) {
      logger.error('Audit authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Audit authorization error',
        code: 'AUDIT_AUTH_ERROR'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  enforceTenantIsolation,
  authenticateService,
  authorizeAuditAccess
};