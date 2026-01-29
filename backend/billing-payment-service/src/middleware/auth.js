const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.logSecurityEvent('MISSING_TOKEN', { 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path 
      });
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.logSecurityEvent('INVALID_TOKEN', { 
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path 
        });
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Validate required token fields
      if (!decoded.userId || !decoded.tenantId || !decoded.role) {
        logger.logSecurityEvent('MALFORMED_TOKEN', { 
          decoded: { ...decoded, userId: decoded.userId ? '[PRESENT]' : '[MISSING]' },
          ip: req.ip 
        });
        return res.status(403).json({
          success: false,
          message: 'Malformed token'
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

      next();
    });
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication service error'
    });
  }
};

// Role-based Authorization Middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.logSecurityEvent('UNAUTHORIZED_ACCESS', {
          userId: req.user.userId,
          role: req.user.role,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method
        }, req.user.userId, req.user.tenantId);

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this operation'
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization service error'
      });
    }
  };
};

// Tenant Isolation Middleware
const validateTenantAccess = (req, res, next) => {
  try {
    const { tenantId } = req.user;
    
    // Check if request contains tenant-specific data
    const requestTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
    
    if (requestTenantId && requestTenantId !== tenantId) {
      logger.logSecurityEvent('TENANT_ISOLATION_VIOLATION', {
        userTenantId: tenantId,
        requestedTenantId: requestTenantId,
        path: req.path,
        method: req.method
      }, req.user.userId, tenantId);

      return res.status(403).json({
        success: false,
        message: 'Access denied: Tenant isolation violation'
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Tenant validation service error'
    });
  }
};

// Branch Access Validation Middleware
const validateBranchAccess = (req, res, next) => {
  try {
    const { branchId, role } = req.user;
    
    // Skip branch validation for certain roles
    const skipBranchValidation = ['CENTRAL_ADMIN', 'SAAS_ADMIN'];
    if (skipBranchValidation.includes(role)) {
      return next();
    }

    // Check if request contains branch-specific data
    const requestBranchId = req.params.branchId || req.body.branchId || req.query.branchId;
    
    if (requestBranchId && requestBranchId !== branchId) {
      logger.logSecurityEvent('BRANCH_ACCESS_VIOLATION', {
        userBranchId: branchId,
        requestedBranchId: requestBranchId,
        role: role,
        path: req.path,
        method: req.method
      }, req.user.userId, req.user.tenantId);

      return res.status(403).json({
        success: false,
        message: 'Access denied: Branch access violation'
      });
    }

    next();
  } catch (error) {
    logger.error('Branch validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Branch validation service error'
    });
  }
};

// Billing-specific role validation
const validateBillingRole = (action) => {
  return (req, res, next) => {
    try {
      const { role } = req.user;
      
      const rolePermissions = {
        'CREATE_BILL': ['BILLING_OFFICER'],
        'COLLECT_PAYMENT': ['CASHIER'],
        'APPROVE_REFUND': ['ACCOUNTS_MANAGER'],
        'VIEW_BILLING': ['BILLING_OFFICER', 'CASHIER', 'ACCOUNTS_MANAGER', 'ACCOUNTANT', 'BRANCH_ADMIN'],
        'CANCEL_BILL': ['BILLING_OFFICER', 'ACCOUNTS_MANAGER'],
        'GENERATE_INVOICE': ['BILLING_OFFICER']
      };

      const allowedRoles = rolePermissions[action];
      
      if (!allowedRoles || !allowedRoles.includes(role)) {
        logger.logSecurityEvent('BILLING_ROLE_VIOLATION', {
          action,
          userRole: role,
          allowedRoles,
          path: req.path,
          method: req.method
        }, req.user.userId, req.user.tenantId);

        return res.status(403).json({
          success: false,
          message: `Role ${role} is not authorized for ${action}`
        });
      }

      next();
    } catch (error) {
      logger.error('Billing role validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role validation service error'
      });
    }
  };
};

// Request logging middleware
const logRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    tenantId: req.user?.tenantId,
    role: req.user?.role
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId
    });
  });

  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  validateTenantAccess,
  validateBranchAccess,
  validateBillingRole,
  logRequest
};