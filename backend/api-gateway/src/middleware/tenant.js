const tenantMiddleware = (req, res, next) => {
  // Extract tenant from subdomain or header
  const tenantId = req.headers['x-tenant-id'] || 
                   req.query.tenantId || 
                   extractTenantFromSubdomain(req.get('host'));

  if (tenantId) {
    req.headers['x-tenant-id'] = tenantId;
  }

  next();
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