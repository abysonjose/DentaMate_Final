const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
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
      logger.warn('Authentication failed: Invalid token', {
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
    if (!decoded.tenantId || !decoded.serviceId) {
      logger.warn('Authentication failed: Invalid token structure', {
        decoded: { ...decoded, exp: undefined, iat: undefined },
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        message: 'Invalid token structure'
      });
    }

    req.user = decoded;
    req.tenantId = decoded.tenantId;
    req.serviceId = decoded.serviceId;
    req.branchId = decoded.branchId;

    logger.debug('Authentication successful', {
      tenantId: decoded.tenantId,
      serviceId: decoded.serviceId,
      branchId: decoded.branchId,
      path: req.path
    });

    next();
  });
};

const validateServiceAccess = (allowedServices = []) => {
  return (req, res, next) => {
    if (allowedServices.length === 0) {
      return next();
    }

    if (!allowedServices.includes(req.serviceId)) {
      logger.warn('Service access denied', {
        serviceId: req.serviceId,
        allowedServices,
        tenantId: req.tenantId,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        message: 'Service not authorized for this operation'
      });
    }

    next();
  };
};

const validateTenantAccess = (req, res, next) => {
  const requestedTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
  
  if (requestedTenantId && requestedTenantId !== req.tenantId) {
    logger.warn('Tenant access violation', {
      requestedTenantId,
      userTenantId: req.tenantId,
      serviceId: req.serviceId,
      path: req.path
    });
    return res.status(403).json({
      success: false,
      message: 'Access denied: Tenant mismatch'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  validateServiceAccess,
  validateTenantAccess
};