const express = require('express');
const RoleController = require('../controllers/RoleController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();
const roleController = new RoleController();

// Get validation schemas
const roleSchemas = ValidationMiddleware.getRoleValidationSchemas();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticateToken);
router.use(AuthMiddleware.enrichUserContext());
router.use(AuthMiddleware.logAccess);

// Role CRUD Routes

// Create role (SAAS_ADMIN only)
router.post('/',
  rateLimiter.sensitiveOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN']),
  AuthMiddleware.requirePermission('SYSTEM', 'CREATE'),
  ValidationMiddleware.validateRequest(roleSchemas.createRole),
  ValidationMiddleware.sanitizeInput,
  (req, res) => roleController.createRole(req, res)
);

// Get all roles
router.get('/',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  (req, res) => roleController.getAllRoles(req, res)
);

// Get role by ID
router.get('/:roleId',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  (req, res) => roleController.getRole(req, res)
);

// Get role by name
router.get('/name/:roleName',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  (req, res) => roleController.getRoleByName(req, res)
);

// Update role (SAAS_ADMIN only)
router.put('/:roleId',
  rateLimiter.sensitiveOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN']),
  AuthMiddleware.requirePermission('SYSTEM', 'UPDATE'),
  ValidationMiddleware.validateRequest(roleSchemas.updateRole),
  ValidationMiddleware.sanitizeInput,
  (req, res) => roleController.updateRole(req, res)
);

// Delete role (SAAS_ADMIN only)
router.delete('/:roleId',
  rateLimiter.sensitiveOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN']),
  AuthMiddleware.requirePermission('SYSTEM', 'DELETE'),
  (req, res) => roleController.deleteRole(req, res)
);

// Permission Management Routes

// Add permission to role (SAAS_ADMIN only)
router.post('/:roleId/permissions',
  rateLimiter.sensitiveOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN']),
  AuthMiddleware.requirePermission('SYSTEM', 'UPDATE'),
  ValidationMiddleware.validateRequest(roleSchemas.addPermission),
  ValidationMiddleware.sanitizeInput,
  (req, res) => roleController.addPermission(req, res)
);

// Remove permission from role (SAAS_ADMIN only)
router.delete('/:roleId/permissions',
  rateLimiter.sensitiveOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN']),
  AuthMiddleware.requirePermission('SYSTEM', 'UPDATE'),
  ValidationMiddleware.sanitizeInput,
  (req, res) => roleController.removePermission(req, res)
);

// Role Hierarchy and Assignment Routes

// Get role hierarchy
router.get('/system/hierarchy',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  (req, res) => roleController.getRoleHierarchy(req, res)
);

// Get assignable roles for a specific role
router.get('/:assignerRoleId/assignable',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  (req, res) => roleController.getAssignableRoles(req, res)
);

// Validate role assignment
router.post('/validate-assignment',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  ValidationMiddleware.sanitizeInput,
  (req, res) => roleController.validateRoleAssignment(req, res)
);

// Role Analytics Routes

// Get role statistics
router.get('/analytics/statistics',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('REPORTS', 'READ'),
  (req, res) => roleController.getRoleStatistics(req, res)
);

// Get role distribution
router.get('/analytics/distribution',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('REPORTS', 'READ'),
  (req, res) => roleController.getRoleDistribution(req, res)
);

// Scope-based Routes

// Get roles by scope
router.get('/scope/:scope',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  (req, res) => roleController.getRolesByScope(req, res)
);

// System Management Routes

// Initialize system roles (SAAS_ADMIN only)
router.post('/system/initialize',
  rateLimiter.sensitiveOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN']),
  AuthMiddleware.requirePermission('SYSTEM', 'CREATE'),
  (req, res) => roleController.initializeSystemRoles(req, res)
);

// Permission Checking Routes

// Check if staff has specific permission
router.post('/check-permission',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  ValidationMiddleware.sanitizeInput,
  (req, res) => roleController.checkPermission(req, res)
);

// Utility Routes

// Get all available resources and actions
router.get('/system/resources',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN']),
  AuthMiddleware.requirePermission('SYSTEM', 'READ'),
  (req, res) => {
    const resources = {
      STAFF: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      PATIENTS: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      APPOINTMENTS: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'],
      BILLING: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'],
      INVENTORY: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      REPORTS: ['READ', 'EXPORT'],
      SETTINGS: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      AUDIT: ['READ', 'EXPORT'],
      NOTIFICATIONS: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      ANALYTICS: ['READ', 'EXPORT'],
      SYSTEM: ['CREATE', 'READ', 'UPDATE', 'DELETE']
    };

    res.json({
      success: true,
      data: {
        resources,
        scopes: ['GLOBAL', 'TENANT', 'BRANCH', 'DEPARTMENT']
      }
    });
  }
);

// Get role constraints and limits
router.get('/system/constraints',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN']),
  AuthMiddleware.requirePermission('SYSTEM', 'READ'),
  (req, res) => {
    const constraints = {
      maxRoleLevel: 10,
      minRoleLevel: 1,
      systemRoles: [
        'SAAS_ADMIN',
        'CENTRAL_ADMIN', 
        'BRANCH_ADMIN',
        'DOCTOR',
        'NURSE',
        'HEAD_NURSE',
        'ORTHOTIST',
        'LAB_ASSISTANT',
        'PHARMACIST',
        'RECEPTIONIST',
        'SUPPORT_STAFF',
        'HR_STAFF',
        'PAYROLL_OFFICER',
        'ACCOUNTANT',
        'ACCOUNTS_MANAGER',
        'BILLING_OFFICER',
        'CASHIER',
        'INSURANCE_OFFICER'
      ],
      roleHierarchy: {
        'SAAS_ADMIN': 10,
        'CENTRAL_ADMIN': 9,
        'BRANCH_ADMIN': 8,
        'DOCTOR': 7,
        'HEAD_NURSE': 6,
        'NURSE': 5,
        'ORTHOTIST': 5,
        'LAB_ASSISTANT': 4,
        'PHARMACIST': 4,
        'ACCOUNTS_MANAGER': 4,
        'HR_STAFF': 4,
        'PAYROLL_OFFICER': 3,
        'ACCOUNTANT': 3,
        'BILLING_OFFICER': 3,
        'INSURANCE_OFFICER': 3,
        'RECEPTIONIST': 2,
        'CASHIER': 2,
        'SUPPORT_STAFF': 1
      }
    };

    res.json({
      success: true,
      data: constraints
    });
  }
);

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('Role routes error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;