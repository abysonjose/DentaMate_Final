const express = require('express');
const PayrollController = require('../controllers/PayrollController');
const { authenticateToken, authorizeRoles, validateTenantAccess, validateBranchAccess, authorizePayrollAccess } = require('../middleware/auth');
const { validate, validateParams, validateQuery, payrollSchemas, commonSchemas } = require('../middleware/validation');
const { payrollLimiter, payrollRoleBasedLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticateToken);
router.use(authorizePayrollAccess);
router.use(validateTenantAccess);
router.use(validateBranchAccess);
router.use(payrollRoleBasedLimiter);

// Run payroll calculation
router.post('/run',
  validate(payrollSchemas.run),
  authorizeRoles('PAYROLL_OFFICER'),
  PayrollController.runPayroll
);

// Finalize payroll
router.post('/:month/finalize',
  validateParams(require('joi').object({
    month: commonSchemas.month
  })),
  validate(payrollSchemas.finalize),
  authorizeRoles('PAYROLL_OFFICER'),
  PayrollController.finalizePayroll
);

// Get payroll summary
router.get('/:month/summary',
  validateParams(require('joi').object({
    month: commonSchemas.month
  })),
  PayrollController.getPayrollSummary
);

// Get department-wise payroll report
router.get('/:month/department-report',
  validateParams(require('joi').object({
    month: commonSchemas.month
  })),
  PayrollController.getDepartmentWiseReport
);

// Get payroll history
router.get('/history',
  validateQuery(require('joi').object({
    page: require('joi').number().integer().min(1).default(1),
    limit: require('joi').number().integer().min(1).max(50).default(10)
  })),
  PayrollController.getPayrollHistory
);

// Get employee payroll details
router.get('/:month/employee/:employeeId',
  validateParams(require('joi').object({
    month: commonSchemas.month,
    employeeId: commonSchemas.employeeId
  })),
  PayrollController.getEmployeePayrollDetails
);

// Cancel payroll
router.post('/:month/cancel',
  validateParams(require('joi').object({
    month: commonSchemas.month
  })),
  validate(require('joi').object({
    reason: require('joi').string().max(500).optional()
  })),
  authorizeRoles('PAYROLL_OFFICER'),
  PayrollController.cancelPayroll
);

// Get payroll statistics
router.get('/statistics',
  validateQuery(require('joi').object({
    year: require('joi').number().integer().min(2020).max(2030).optional()
  })),
  authorizeRoles('PAYROLL_OFFICER', 'ACCOUNTS_MANAGER', 'ACCOUNTANT'),
  PayrollController.getPayrollStatistics
);

module.exports = router;