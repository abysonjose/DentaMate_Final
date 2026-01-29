const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Validate required JWT fields
    if (!decoded.userId || !decoded.tenantId || !decoded.branchId || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure'
      });
    }

    logger.info('User authenticated', {
      userId: decoded.userId,
      role: decoded.role,
      tenantId: decoded.tenantId,
      branchId: decoded.branchId
    });

    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
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
      logger.warn('Unauthorized access attempt', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
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
  req.tenantId = req.user.tenantId;
  req.branchId = req.user.branchId;

  // For SaaS Admin, allow cross-tenant access but log it
  if (req.user.role === 'SAAS_ADMIN') {
    logger.info('SaaS Admin cross-tenant access', {
      adminId: req.user.userId,
      targetTenant: req.params.tenantId || req.query.tenantId,
      endpoint: req.path
    });
  }

  next();
};

// Case Access Control Middleware
const authorizeCaseAccess = (req, res, next) => {
  const userRole = req.user.role;
  const method = req.method;
  const path = req.path;

  // Define access rules
  const accessRules = {
    'DOCTOR': {
      'GET': true,
      'POST': true,
      'PATCH': path.includes('/status') || path.includes('/delivery-date'),
      'DELETE': false
    },
    'ORTHOTIST': {
      'GET': true,
      'POST': false,
      'PATCH': path.includes('/status') || path.includes('/delivery-date'),
      'DELETE': false
    },
    'PATIENT': {
      'GET': true,
      'POST': false,
      'PATCH': false,
      'DELETE': false
    },
    'HEAD_NURSE': {
      'GET': true,
      'POST': false,
      'PATCH': false,
      'DELETE': false
    },
    'BRANCH_ADMIN': {
      'GET': true,
      'POST': false,
      'PATCH': false,
      'DELETE': false
    },
    'SAAS_ADMIN': {
      'GET': true,
      'POST': false,
      'PATCH': false,
      'DELETE': false
    }
  };

  const roleAccess = accessRules[userRole];
  if (!roleAccess || !roleAccess[method]) {
    return res.status(403).json({
      success: false,
      message: 'Operation not permitted for your role'
    });
  }

  next();
};

// Measurement Access Control Middleware
const authorizeMeasurementAccess = (req, res, next) => {
  const userRole = req.user.role;
  const method = req.method;

  // Define access rules for measurements
  const measurementRules = {
    'DOCTOR': {
      'GET': true,
      'POST': true,
      'PATCH': true,
      'DELETE': false
    },
    'ORTHOTIST': {
      'GET': true,
      'POST': false,
      'PATCH': false,
      'DELETE': false
    },
    'PATIENT': {
      'GET': true,
      'POST': false,
      'PATCH': false,
      'DELETE': false
    },
    'HEAD_NURSE': {
      'GET': true,
      'POST': false,
      'PATCH': false,
      'DELETE': false
    },
    'BRANCH_ADMIN': {
      'GET': true,
      'POST': false,
      'PATCH': false,
      'DELETE': false
    }
  };

  const roleAccess = measurementRules[userRole];
  if (!roleAccess || !roleAccess[method]) {
    return res.status(403).json({
      success: false,
      message: 'Measurement operation not permitted for your role'
    });
  }

  next();
};

// Service Authentication Middleware (for inter-service communication)
const authenticateService = (req, res, next) => {
  const serviceToken = req.headers['x-service-token'];
  
  if (!serviceToken) {
    return res.status(401).json({
      success: false,
      message: 'Service token required'
    });
  }

  try {
    const decoded = jwt.verify(serviceToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'service') {
      return res.status(401).json({
        success: false,
        message: 'Invalid service token'
      });
    }

    req.service = decoded;
    logger.info('Service authenticated', {
      serviceName: decoded.serviceName,
      serviceId: decoded.serviceId
    });

    next();
  } catch (error) {
    logger.error('Service token verification failed:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid service token'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  enforceTenantIsolation,
  authorizeCaseAccess,
  authorizeMeasurementAccess,
  authenticateService
};