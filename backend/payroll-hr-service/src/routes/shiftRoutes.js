const express = require('express');
const ShiftController = require('../controllers/ShiftController');
const { authenticateToken, authorizeRoles, validateTenantAccess, validateBranchAccess, authorizePayrollAccess } = require('../middleware/auth');
const { validate, validateParams, validateQuery, shiftSchemas, employeeShiftSchemas, commonSchemas } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticateToken);
router.use(authorizePayrollAccess);
router.use(validateTenantAccess);
router.use(validateBranchAccess);
router.use(generalLimiter);

// Create shift
router.post('/',
  validate(shiftSchemas.create),
  authorizeRoles('HR', 'BRANCH_ADMIN'),
  ShiftController.createShift
);

// Update shift
router.put('/:shiftId',
  validateParams(require('joi').object({
    shiftId: require('joi').string().uuid().required()
  })),
  validate(shiftSchemas.update),
  authorizeRoles('HR', 'BRANCH_ADMIN'),
  ShiftController.updateShift
);

// Get all shifts
router.get('/',
  validateQuery(require('joi').object({
    isActive: require('joi').boolean().optional(),
    type: require('joi').string().valid('MORNING', 'EVENING', 'NIGHT', 'FULL_DAY', 'CUSTOM').optional()
  })),
  ShiftController.getShifts
);

// Get shift by ID
router.get('/:shiftId',
  validateParams(require('joi').object({
    shiftId: require('joi').string().uuid().required()
  })),
  ShiftController.getShiftById
);

// Get available shifts for a day
router.get('/available/day',
  validateQuery(require('joi').object({
    day: require('joi').string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY').required()
  })),
  ShiftController.getAvailableShifts
);

// Get shift coverage report
router.get('/reports/coverage',
  authorizeRoles('HR', 'BRANCH_ADMIN', 'HEAD_NURSE'),
  ShiftController.getShiftCoverageReport
);

// Get shift distribution report
router.get('/reports/distribution',
  authorizeRoles('HR', 'BRANCH_ADMIN', 'HEAD_NURSE'),
  ShiftController.getShiftDistributionReport
);

// Assign employee to shift
router.post('/assignments',
  validate(employeeShiftSchemas.assign),
  authorizeRoles('HR', 'BRANCH_ADMIN'),
  ShiftController.assignEmployeeToShift
);

// Bulk assign employees to shifts
router.post('/assignments/bulk',
  validate(require('joi').object({
    assignments: require('joi').array().items(employeeShiftSchemas.assign).min(1).required()
  })),
  authorizeRoles('HR', 'BRANCH_ADMIN'),
  ShiftController.bulkAssignEmployees
);

// Remove employee from shift
router.delete('/assignments/:employeeId/:shiftId',
  validateParams(require('joi').object({
    employeeId: commonSchemas.employeeId,
    shiftId: require('joi').string().uuid().required()
  })),
  validate(require('joi').object({
    endDate: require('joi').date().iso().optional()
  })),
  authorizeRoles('HR', 'BRANCH_ADMIN'),
  ShiftController.removeEmployeeFromShift
);

// Get employee's current shift
router.get('/assignments/employee/:employeeId/current',
  validateParams(require('joi').object({
    employeeId: commonSchemas.employeeId
  })),
  ShiftController.getEmployeeCurrentShift
);

// Get employees in a shift
router.get('/:shiftId/employees',
  validateParams(require('joi').object({
    shiftId: require('joi').string().uuid().required()
  })),
  validateQuery(require('joi').object({
    date: require('joi').date().iso().optional()
  })),
  ShiftController.getEmployeesInShift
);

// Delete shift
router.delete('/:shiftId',
  validateParams(require('joi').object({
    shiftId: require('joi').string().uuid().required()
  })),
  authorizeRoles('HR', 'BRANCH_ADMIN'),
  ShiftController.deleteShift
);

module.exports = router;