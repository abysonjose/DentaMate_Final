const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../utils/logger');

// RBAC Configuration - Route to Role Mapping
const RBAC_RULES = {
  // Admin routes
  '/api/saas-admin': ['SAAS_ADMIN'],
  '/api/tenants': ['SAAS_ADMIN', 'CENTRAL_ADMIN'],
  '/api/analytics': ['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN'],
  
  // Branch management
  '/api/branches': ['CENTRAL_ADMIN', 'BRANCH_ADMIN'],
  '/api/users/staff': ['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'HR_OFFICER'],
  
  // Clinical operations
  '/api/appointments': ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'BRANCH_ADMIN'],
  '/api/queue': ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'BRANCH_ADMIN'],
  '/api/tokens': ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'BRANCH_ADMIN'],
  '/api/nursing': ['NURSE', 'HEAD_NURSE', 'DOCTOR'],
  '/api/lab': ['LAB_STAFF', 'DOCTOR', 'BRANCH_ADMIN'],
  
  // AI and diagnostics
  '/api/ai-diagnosis': ['DOCTOR'],
  '/api/prescription-ocr': ['DOCTOR', 'PHARMACIST'],
  
  // Financial operations
  '/api/billing': ['CASHIER', 'BILLING_STAFF', 'BRANCH_ADMIN', 'ACCOUNTANT'],
  '/api/insurance': ['INSURANCE_STAFF', 'BILLING_STAFF', 'BRANCH_ADMIN'],
  '/api/accounting': ['ACCOUNTANT', 'BRANCH_ADMIN'],
  '/api/payroll': ['PAYROLL_OFFICER', 'HR_OFFICER', 'BRANCH_ADMIN'],
  
  // Inventory and pharmacy
  '/api/inventory': ['PHARMACIST', 'INVENTORY_STAFF', 'BRANCH_ADMIN'],
  
  // Patient access
  '/api/patients/profile': ['PATIENT'],
  '/api/patients/appointments': ['PATIENT'],
  '/api/patients/records': ['PATIENT', 'DOCTOR', 'NURSE'],
  
  // Support and collaboration
  '/api/collaboration': ['DOCTOR', 'NURSE', 'BRANCH_ADMIN'],
  '/api/notifications': ['*'], // All authenticated users
  '/api/audit': ['BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN']
};

const authMiddleware = async (req, res, next) => {
  try {
    // Skip auth for public routes
    const publicRoutes = ['/auth/login', '/auth/register', '/health'];
    if (publicRoutes.some(route => req.path.includes(route))) {
      return next();
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate required JWT claims
    if (!decoded.staff_id || !decoded.roles || !decoded.tenant_id) {
      return res.status(401).json({ 
        error: 'Invalid token claims',
        code: 'INVALID_TOKEN_CLAIMS'
      });
    }

    // RBAC Enforcement
    const userRoles = Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles];
    const hasAccess = checkRBACAccess(req.path, userRoles);
    
    if (!hasAccess) {
      logger.warn(`RBAC: Access denied for user ${decoded.staff_id} to ${req.path}`, {
        userId: decoded.staff_id,
        roles: userRoles,
        path: req.path,
        method: req.method
      });
      
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'ACCESS_DENIED'
      });
    }

    // Forward validated user context to downstream services
    req.headers['x-user-id'] = decoded.staff_id;
    req.headers['x-user-roles'] = JSON.stringify(userRoles);
    req.headers['x-tenant-id'] = decoded.tenant_id;
    req.headers['x-branch-id'] = decoded.branch_id || '';
    req.headers['x-auth-validated'] = 'true';
    
    // Store user context for rate limiting
    req.userContext = {
      userId: decoded.staff_id,
      roles: userRoles,
      tenantId: decoded.tenant_id,
      branchId: decoded.branch_id
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
};

function checkRBACAccess(path, userRoles) {
  // Find matching RBAC rule
  const matchingRule = Object.keys(RBAC_RULES).find(route => 
    path.startsWith(route)
  );
  
  if (!matchingRule) {
    // No specific rule - allow if authenticated
    return true;
  }
  
  const requiredRoles = RBAC_RULES[matchingRule];
  
  // Check for wildcard access
  if (requiredRoles.includes('*')) {
    return true;
  }
  
  // Check if user has any of the required roles
  return userRoles.some(role => requiredRoles.includes(role));
}

module.exports = authMiddleware;