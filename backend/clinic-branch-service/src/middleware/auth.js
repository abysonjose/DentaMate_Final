const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      branchId: decoded.branchId,
      clinicId: decoded.clinicId
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

const authorize = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authorization failed'
      });
    }
  };
};

const validateTenantAccess = (req, res, next) => {
  try {
    // For SAAS_ADMIN, allow access to all tenants
    if (req.user.role === 'SAAS_ADMIN') {
      return next();
    }

    // For other roles, ensure they can only access their own tenant's data
    const requestedTenantId = req.params.tenantId || req.query.tenantId || req.body.tenantId;
    
    if (requestedTenantId && requestedTenantId !== req.user.tenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this tenant'
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant validation error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Tenant validation failed'
    });
  }
};

const validateBranchAccess = (req, res, next) => {
  try {
    // For CENTRAL_ADMIN and SAAS_ADMIN, allow access to all branches
    if (['CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(req.user.role)) {
      return next();
    }

    // For BRANCH_ADMIN and staff, ensure they can only access their own branch
    const requestedBranchId = req.params.branchId || req.query.branchId || req.body.branchId;
    
    if (requestedBranchId && requestedBranchId !== req.user.branchId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this branch'
      });
    }

    next();
  } catch (error) {
    logger.error('Branch validation error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Branch validation failed'
    });
  }
};

module.exports = {
  authenticate,
  authorize,
  validateTenantAccess,
  validateBranchAccess
};