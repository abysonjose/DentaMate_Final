const logger = require('../utils/logger');

const tenantMiddleware = (req, res, next) => {
  try {
    // Extract tenant information from user token
    const { tenantId, branchId } = req.user;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    // Add tenant context to request
    req.tenant = {
      id: tenantId,
      branchId: branchId || null
    };
    
    // Log tenant access for audit
    logger.info(`Tenant access: ${tenantId}, User: ${req.user.userId}, Role: ${req.user.userRole}`);
    
    next();
    
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Tenant validation error'
    });
  }
};

module.exports = tenantMiddleware;