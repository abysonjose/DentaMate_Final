const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate required fields
    if (!decoded.userId || !decoded.tenantId || !decoded.role) {
      logger.warn('Authentication failed: Invalid token payload', {
        tokenPayload: decoded,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      branchId: decoded.branchId,
      role: decoded.role,
      permissions: decoded.permissions || [],
      userName: decoded.userName || 'Unknown User'
    };

    logger.debug('User authenticated successfully', {
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      branchId: req.user.branchId,
      role: req.user.role
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Role-based Authorization Middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to access this resource'
      });
    }

    logger.debug('User authorized successfully', {
      userId: req.user.userId,
      role: req.user.role,
      path: req.path
    });

    next();
  };
};

// Permission-based Authorization Middleware
const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('Authorization failed: Missing required permissions', {
        userId: req.user.userId,
        userPermissions,
        requiredPermissions,
        path: req.path,
        method: req.method
      });
      
      return res.status(403).json({
        success: false,
        message: 'Missing required permissions'
      });
    }

    next();
  };
};

// Tenant Isolation Middleware
const enforceTenantIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Add tenant and branch filters to query parameters
  req.tenantFilter = {
    tenantId: req.user.tenantId
  };

  // Add branch filter if user has branchId (not for SaaS Admin)
  if (req.user.branchId && req.user.role !== 'SAAS_ADMIN') {
    req.tenantFilter.branchId = req.user.branchId;
  }

  // For SaaS Admin, allow access to all tenants but log the access
  if (req.user.role === 'SAAS_ADMIN') {
    logger.info('SaaS Admin accessing cross-tenant data', {
      userId: req.user.userId,
      path: req.path,
      method: req.method,
      queryParams: req.query
    });
    
    // Remove tenant filter for SaaS Admin
    req.tenantFilter = {};
  }

  next();
};

// Branch Access Control Middleware
const enforceBranchAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Extract branchId from request (params, query, or body)
  const requestedBranchId = req.params.branchId || req.query.branchId || req.body.branchId;

  // SaaS Admin and Central Admin can access any branch
  if (['SAAS_ADMIN', 'CENTRAL_ADMIN'].includes(req.user.role)) {
    return next();
  }

  // Other roles can only access their assigned branch
  if (requestedBranchId && requestedBranchId !== req.user.branchId) {
    logger.warn('Branch access denied', {
      userId: req.user.userId,
      userBranchId: req.user.branchId,
      requestedBranchId,
      role: req.user.role,
      path: req.path
    });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied to requested branch'
    });
  }

  next();
};

// Service-to-Service Authentication
const authenticateService = (req, res, next) => {
  const serviceToken = req.headers['x-service-token'];
  const serviceName = req.headers['x-service-name'];

  if (!serviceToken || !serviceName) {
    logger.warn('Service authentication failed: Missing headers', {
      hasServiceToken: !!serviceToken,
      serviceName,
      ip: req.ip
    });
    
    return res.status(401).json({
      success: false,
      message: 'Service authentication required'
    });
  }

  try {
    const decoded = jwt.verify(serviceToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'service' || decoded.serviceName !== serviceName) {
      throw new Error('Invalid service token');
    }

    req.service = {
      serviceName: decoded.serviceName,
      permissions: decoded.permissions || []
    };

    logger.debug('Service authenticated successfully', {
      serviceName: req.service.serviceName
    });

    next();
  } catch (error) {
    logger.warn('Service authentication failed: Invalid token', {
      error: error.message,
      serviceName,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      message: 'Invalid service token'
    });
  }
};

// Accounting-specific role definitions
const ACCOUNTING_ROLES = {
  ACCOUNTANT: 'ACCOUNTANT',
  ACCOUNTS_MANAGER: 'ACCOUNTS_MANAGER',
  BRANCH_ADMIN: 'BRANCH_ADMIN',
  CENTRAL_ADMIN: 'CENTRAL_ADMIN',
  SAAS_ADMIN: 'SAAS_ADMIN'
};

// Accounting-specific permission definitions
const ACCOUNTING_PERMISSIONS = {
  READ_LEDGER: 'accounting:ledger:read',
  WRITE_LEDGER: 'accounting:ledger:write',
  POST_LEDGER: 'accounting:ledger:post',
  READ_EXPENSES: 'accounting:expenses:read',
  WRITE_EXPENSES: 'accounting:expenses:write',
  APPROVE_EXPENSES: 'accounting:expenses:approve',
  READ_REVENUE: 'accounting:revenue:read',
  RECONCILE: 'accounting:reconcile',
  GENERATE_REPORTS: 'accounting:reports:generate',
  EXPORT_DATA: 'accounting:data:export',
  MANAGE_PERIODS: 'accounting:periods:manage'
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizePermissions,
  enforceTenantIsolation,
  enforceBranchAccess,
  authenticateService,
  ACCOUNTING_ROLES,
  ACCOUNTING_PERMISSIONS
};