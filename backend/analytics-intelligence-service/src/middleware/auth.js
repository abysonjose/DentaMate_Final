const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      category: 'auth'
    });
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      logger.warn('Authentication failed: Invalid token', {
        error: err.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        category: 'auth'
      });
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Validate required token fields for analytics service
    if (!decoded.tenantId || !decoded.role) {
      logger.warn('Authentication failed: Invalid token structure', {
        decoded: { ...decoded, exp: undefined, iat: undefined },
        ip: req.ip,
        path: req.path,
        category: 'auth'
      });
      return res.status(403).json({
        success: false,
        message: 'Invalid token structure'
      });
    }

    req.user = decoded;
    req.tenantId = decoded.tenantId;
    req.userId = decoded.userId;
    req.role = decoded.role;
    req.branchId = decoded.branchId;
    req.serviceId = decoded.serviceId;

    logger.debug('Authentication successful', {
      tenantId: decoded.tenantId,
      userId: decoded.userId,
      role: decoded.role,
      branchId: decoded.branchId,
      serviceId: decoded.serviceId,
      path: req.path,
      category: 'auth'
    });

    next();
  });
};

const validateTenantAccess = (req, res, next) => {
  const requestedTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
  
  if (requestedTenantId && requestedTenantId !== req.tenantId) {
    logger.warn('Tenant access violation', {
      requestedTenantId,
      userTenantId: req.tenantId,
      userId: req.userId,
      role: req.role,
      path: req.path,
      category: 'auth'
    });
    return res.status(403).json({
      success: false,
      message: 'Access denied: Tenant mismatch'
    });
  }

  next();
};

const validateRoleAccess = (allowedRoles = []) => {
  return (req, res, next) => {
    if (allowedRoles.length === 0) {
      return next();
    }

    if (!allowedRoles.includes(req.role)) {
      logger.warn('Role access denied', {
        userRole: req.role,
        allowedRoles,
        tenantId: req.tenantId,
        userId: req.userId,
        path: req.path,
        category: 'auth'
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient role permissions'
      });
    }

    next();
  };
};

const validateBranchAccess = (req, res, next) => {
  const requestedBranchId = req.params.branchId || req.body.branchId || req.query.branchId;
  
  // Skip validation for roles that can access all branches
  const globalRoles = ['SAAS_ADMIN', 'CENTRAL_ADMIN'];
  if (globalRoles.includes(req.role)) {
    return next();
  }

  // Branch admins and staff can only access their own branch
  if (requestedBranchId && req.branchId && requestedBranchId !== req.branchId) {
    logger.warn('Branch access violation', {
      requestedBranchId,
      userBranchId: req.branchId,
      userId: req.userId,
      role: req.role,
      tenantId: req.tenantId,
      path: req.path,
      category: 'auth'
    });
    return res.status(403).json({
      success: false,
      message: 'Access denied: Branch access restricted'
    });
  }

  next();
};

const validateServiceAccess = (allowedServices = []) => {
  return (req, res, next) => {
    if (allowedServices.length === 0) {
      return next();
    }

    if (!req.serviceId || !allowedServices.includes(req.serviceId)) {
      logger.warn('Service access denied', {
        serviceId: req.serviceId,
        allowedServices,
        tenantId: req.tenantId,
        path: req.path,
        category: 'auth'
      });
      return res.status(403).json({
        success: false,
        message: 'Service not authorized for this operation'
      });
    }

    next();
  };
};

// Analytics-specific role validation
const validateAnalyticsAccess = (req, res, next) => {
  const analyticsRoles = [
    'SAAS_ADMIN',
    'CENTRAL_ADMIN', 
    'BRANCH_ADMIN',
    'ACCOUNTS_MANAGER',
    'DOCTOR' // Limited access
  ];

  if (!analyticsRoles.includes(req.role)) {
    logger.warn('Analytics access denied', {
      userRole: req.role,
      analyticsRoles,
      tenantId: req.tenantId,
      userId: req.userId,
      path: req.path,
      category: 'auth'
    });
    return res.status(403).json({
      success: false,
      message: 'Access denied: No analytics permissions'
    });
  }

  next();
};

// Data scope validation based on role
const validateDataScope = (req, res, next) => {
  const { role, tenantId, branchId } = req;
  
  // Set data scope based on role
  switch (role) {
    case 'SAAS_ADMIN':
      req.dataScope = {
        level: 'PLATFORM',
        tenantIds: [], // Will be populated with all tenants
        branchIds: [],
        anonymized: true
      };
      break;
      
    case 'CENTRAL_ADMIN':
      req.dataScope = {
        level: 'TENANT',
        tenantIds: [tenantId],
        branchIds: [], // All branches in tenant
        anonymized: false
      };
      break;
      
    case 'BRANCH_ADMIN':
    case 'ACCOUNTS_MANAGER':
      req.dataScope = {
        level: 'BRANCH',
        tenantIds: [tenantId],
        branchIds: branchId ? [branchId] : [],
        anonymized: false
      };
      break;
      
    case 'DOCTOR':
      req.dataScope = {
        level: 'PERSONAL',
        tenantIds: [tenantId],
        branchIds: branchId ? [branchId] : [],
        userId: req.userId,
        anonymized: false,
        limited: true // Limited metrics only
      };
      break;
      
    default:
      return res.status(403).json({
        success: false,
        message: 'Access denied: Invalid role for analytics'
      });
  }

  logger.debug('Data scope set', {
    userId: req.userId,
    role: req.role,
    dataScope: req.dataScope,
    category: 'auth'
  });

  next();
};

module.exports = {
  authenticateToken,
  validateTenantAccess,
  validateRoleAccess,
  validateBranchAccess,
  validateServiceAccess,
  validateAnalyticsAccess,
  validateDataScope
};