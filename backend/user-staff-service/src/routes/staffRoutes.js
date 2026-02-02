const express = require('express');
const StaffController = require('../controllers/StaffController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();
const staffController = new StaffController();

// Get validation schemas
const staffSchemas = ValidationMiddleware.getStaffValidationSchemas();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticateToken);
router.use(AuthMiddleware.enrichUserContext());
router.use(AuthMiddleware.logAccess);

// Staff CRUD Routes

// Create staff member
router.post('/',
  rateLimiter.staffCreation,
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'CREATE'),
  ValidationMiddleware.validateRequest(staffSchemas.createStaff),
  ValidationMiddleware.sanitizeInput,
  AuthMiddleware.validateTenantAccess,
  (req, res) => staffController.createStaff(req, res)
);

// Get staff member by ID
router.get('/:staffId',
  AuthMiddleware.validateStaffAccess(),
  (req, res) => staffController.getStaff(req, res)
);

// Get staff member by auth user ID (for JWT building)
router.get('/by-auth/:userAuthId',
  (req, res) => staffController.getStaffByAuthId(req, res)
);

// Update staff member
router.put('/:staffId',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'UPDATE'),
  ValidationMiddleware.validateRequest(staffSchemas.updateStaff),
  ValidationMiddleware.sanitizeInput,
  AuthMiddleware.validateStaffAccess(),
  (req, res) => staffController.updateStaff(req, res)
);

// Deactivate staff member
router.patch('/:staffId/deactivate',
  rateLimiter.sensitiveOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'UPDATE'),
  ValidationMiddleware.validateRequest(staffSchemas.deactivateStaff),
  ValidationMiddleware.sanitizeInput,
  AuthMiddleware.validateStaffAccess(),
  (req, res) => staffController.deactivateStaff(req, res)
);

// Activate staff member
router.patch('/:staffId/activate',
  rateLimiter.sensitiveOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'UPDATE'),
  AuthMiddleware.validateStaffAccess(),
  (req, res) => staffController.activateStaff(req, res)
);

// Role Management Routes

// Assign role to staff member
router.post('/:staffId/roles',
  rateLimiter.roleAssignment,
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'UPDATE'),
  ValidationMiddleware.validateRequest(staffSchemas.assignRole),
  ValidationMiddleware.sanitizeInput,
  AuthMiddleware.validateStaffAccess(),
  (req, res) => staffController.assignRole(req, res)
);

// Remove role from staff member
router.delete('/:staffId/roles/:roleId',
  rateLimiter.roleAssignment,
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'UPDATE'),
  ValidationMiddleware.validateRequest(staffSchemas.removeRole),
  AuthMiddleware.validateStaffAccess(),
  (req, res) => staffController.removeRole(req, res)
);

// Query Routes

// Get staff by tenant
router.get('/tenant/:tenantId',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  ValidationMiddleware.validateRequest(staffSchemas.getStaffQuery),
  AuthMiddleware.validateTenantAccess,
  (req, res) => staffController.getStaffByTenant(req, res)
);

// Get staff by role
router.get('/role/:roleName',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  ValidationMiddleware.validateRequest(staffSchemas.getStaffQuery),
  (req, res) => staffController.getStaffByRole(req, res)
);

// Search staff members
router.get('/tenant/:tenantId/search',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'READ'),
  AuthMiddleware.validateTenantAccess,
  (req, res) => staffController.searchStaff(req, res)
);

// Transfer staff to different branch
router.patch('/:staffId/transfer',
  rateLimiter.sensitiveOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'UPDATE'),
  ValidationMiddleware.validateRequest(staffSchemas.transferStaff),
  ValidationMiddleware.sanitizeInput,
  AuthMiddleware.validateStaffAccess(),
  (req, res) => staffController.transferStaff(req, res)
);

// Audit and Analytics Routes

// Get staff audit trail
router.get('/:staffId/audit',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('AUDIT', 'READ'),
  AuthMiddleware.validateStaffAccess(),
  (req, res) => staffController.getStaffAuditTrail(req, res)
);

// Get staff statistics
router.get('/tenant/:tenantId/statistics',
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  AuthMiddleware.requirePermission('REPORTS', 'READ'),
  AuthMiddleware.validateTenantAccess,
  (req, res) => staffController.getStaffStatistics(req, res)
);

// Bulk Operations Routes

// Bulk update staff members
router.patch('/bulk/update',
  rateLimiter.bulkOperations,
  AuthMiddleware.requireRole(['SAAS_ADMIN', 'CENTRAL_ADMIN']),
  AuthMiddleware.requirePermission('STAFF', 'UPDATE'),
  ValidationMiddleware.sanitizeInput,
  (req, res) => staffController.bulkUpdateStaff(req, res)
);

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('Staff routes error:', error);
  
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