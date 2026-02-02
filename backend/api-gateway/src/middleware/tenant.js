const axios = require('axios');
const logger = require('../utils/logger');

const tenantMiddleware = async (req, res, next) => {
  try {
    // Skip tenant validation for public routes
    const publicRoutes = ['/auth/login', '/auth/register', '/health'];
    if (publicRoutes.some(route => req.path.includes(route))) {
      return next();
    }

    // Extract tenant from JWT, header, or subdomain
    let tenantId = req.headers['x-tenant-id'] || 
                   req.query.tenantId || 
                   extractTenantFromSubdomain(req.get('host'));

    // If no tenant in headers, try to extract from JWT
    if (!tenantId && req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        tenantId = decoded?.tenant_id;
      } catch (error) {
        // JWT decode error - will be handled by auth middleware
      }
    }

    if (!tenantId) {
      return res.status(400).json({ 
        error: 'Tenant context required',
        code: 'MISSING_TENANT_CONTEXT'
      });
    }

    // Validate tenant existence via tenant-organization-service
    try {
      const tenantValidationUrl = `http://tenant-organization-service:3003/api/tenants/${tenantId}/validate`;
      const response = await axios.get(tenantValidationUrl, {
        timeout: 5000,
        headers: {
          'x-service-auth': process.env.INTERNAL_SERVICE_SECRET
        }
      });

      if (!response.data.valid) {
        return res.status(403).json({ 
          error: 'Invalid tenant',
          code: 'INVALID_TENANT'
        });
      }

      // Inject validated tenant context into downstream calls
      req.headers['x-tenant-id'] = tenantId;
      req.headers['x-tenant-validated'] = 'true';
      req.tenantContext = response.data.tenant;

    } catch (error) {
      logger.error('Tenant validation failed:', error.message);
      return res.status(503).json({ 
        error: 'Tenant validation service unavailable',
        code: 'TENANT_SERVICE_ERROR'
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function extractTenantFromSubdomain(host) {
  if (!host) return null;
  
  const parts = host.split('.');
  if (parts.length > 2) {
    return parts[0]; // Return subdomain as tenant
  }
  return null;
}

module.exports = tenantMiddleware;