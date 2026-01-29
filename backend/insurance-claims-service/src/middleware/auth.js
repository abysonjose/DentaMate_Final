const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('Invalid token attempt:', { 
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Validate required token fields
      if (!decoded.userId || !decoded.tenantId || !decoded.role) {
        return res.status(403).json({
          success: false,
          message: 'Invalid token structure'
        });
      }

      req.user = {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        branchId: decoded.branchId,
        role: decoded.role,
        permissions: decoded.permissions || [],
        userName: decoded.userName || 'Unknown'
      };

      next();
    });
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error'
    });
  }
};

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
        logger.warn('Unauthorized access attempt:', {
          userId: req.user.userId,
          role: req.user.role,
          requiredRoles: allowedRoles,
          endpoint: req.path,
          method: req.method
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization service error'
      });
    }
  };
};

const validateTenantAccess = (req, res, next) => {
  try {
    const { tenantId } = req.params;
    
    if (tenantId && tenantId !== req.user.tenantId) {
      logger.warn('Cross-tenant access attempt:', {
        userId: req.user.userId,
        userTenantId: req.user.tenantId,
        requestedTenantId: tenantId
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied to tenant resources'
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Tenant validation error'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  validateTenantAccess
};