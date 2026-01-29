const express = require('express');
const PayslipController = require('../controllers/PayslipController');
const { authenticateToken, authorizeRoles, validateTenantAccess, validateBranchAccess, authorizePayrollAccess } = require('../middleware/auth');
const { validate, validateParams, validateQuery, commonSchemas } = require('../middleware/validation');
const { payslipLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticateToken);
router.use(authorizePayrollAccess);
router.use(validateTenantAccess);
router.use(validateBranchAccess);
router.use(payslipLimiter);

// Generate payslip for employee
router.post('/:employeeId/:month/generate',
  validateParams(require('joi').object({
    employeeId: commonSchemas.employeeId,
    month: commonSchemas.month
  })),
  authorizeRoles('PAYROLL_OFFICER'),
  PayslipController.generatePayslip
);

// Download payslip PDF
router.get('/:employeeId/:month/download',
  validateParams(require('joi').object({
    employeeId: commonSchemas.employeeId,
    month: commonSchemas.month
  })),
  PayslipController.downloadPayslip
);

// Get payslip data
router.get('/:employeeId/:month',
  validateParams(require('joi').object({
    employeeId: commonSchemas.employeeId,
    month: commonSchemas.month
  })),
  PayslipController.getPayslipData
);

// Bulk generate payslips
router.post('/bulk-generate',
  validate(require('joi').object({
    month: commonSchemas.month,
    employeeIds: require('joi').array().items(require('joi').string().uuid()).optional()
  })),
  authorizeRoles('PAYROLL_OFFICER'),
  PayslipController.bulkGeneratePayslips
);

// Get employee payslip history
router.get('/history/:employeeId',
  validateParams(require('joi').object({
    employeeId: commonSchemas.employeeId
  })),
  validateQuery(require('joi').object({
    page: require('joi').number().integer().min(1).default(1),
    limit: require('joi').number().integer().min(1).max(24).default(12)
  })),
  PayslipController.getEmployeePayslipHistory
);

// Get payslip generation status for a month
router.get('/status/:month',
  validateParams(require('joi').object({
    month: commonSchemas.month
  })),
  authorizeRoles('PAYROLL_OFFICER', 'HR'),
  PayslipController.getPayslipGenerationStatus
);

// Cleanup old payslips
router.post('/cleanup',
  validate(require('joi').object({
    retentionMonths: require('joi').number().integer().min(6).max(60).default(12)
  })),
  authorizeRoles('PAYROLL_OFFICER'),
  PayslipController.cleanupOldPayslips
);

module.exports = router;