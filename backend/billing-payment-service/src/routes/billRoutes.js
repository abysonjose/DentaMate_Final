const express = require('express');
const router = express.Router();

// Middleware
const { 
  authenticateToken, 
  validateTenantAccess, 
  validateBranchAccess,
  validateBillingRole,
  logRequest 
} = require('../middleware/auth');

const {
  validateCreateBill,
  validateUpdateBill,
  validateBillQuery,
  validateIdParam
} = require('../middleware/validation');

const {
  billCreationLimiter,
  generalLimiter
} = require('../middleware/rateLimiter');

// Controller
const BillController = require('../controllers/BillController');

// Apply common middleware
router.use(authenticateToken);
router.use(validateTenantAccess);
router.use(validateBranchAccess);
router.use(logRequest);

/**
 * @route   POST /api/billing/bills
 * @desc    Create a new bill
 * @access  Private (Billing Officer only)
 */
router.post('/',
  billCreationLimiter,
  validateBillingRole('CREATE_BILL'),
  validateCreateBill,
  BillController.createBill
);

/**
 * @route   GET /api/billing/bills
 * @desc    Get bills with pagination and filters
 * @access  Private (Billing staff)
 */
router.get('/',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validateBillQuery,
  BillController.getBills
);

/**
 * @route   GET /api/billing/bills/statistics
 * @desc    Get bill statistics
 * @access  Private (Billing staff)
 */
router.get('/statistics',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  BillController.getBillStatistics
);

/**
 * @route   GET /api/billing/bills/:id
 * @desc    Get bill by ID
 * @access  Private (Billing staff)
 */
router.get('/:id',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validateIdParam,
  BillController.getBillById
);

/**
 * @route   PUT /api/billing/bills/:id
 * @desc    Update bill
 * @access  Private (Billing Officer only)
 */
router.put('/:id',
  generalLimiter,
  validateBillingRole('CREATE_BILL'),
  validateIdParam,
  validateUpdateBill,
  BillController.updateBill
);

/**
 * @route   POST /api/billing/bills/:id/cancel
 * @desc    Cancel bill
 * @access  Private (Billing Officer, Accounts Manager)
 */
router.post('/:id/cancel',
  generalLimiter,
  validateBillingRole('CANCEL_BILL'),
  validateIdParam,
  BillController.cancelBill
);

/**
 * @route   GET /api/billing/bills/:id/validate-for-invoice
 * @desc    Validate bill for invoice generation
 * @access  Private (Billing Officer)
 */
router.get('/:id/validate-for-invoice',
  generalLimiter,
  validateBillingRole('GENERATE_INVOICE'),
  validateIdParam,
  BillController.validateBillForInvoice
);

/**
 * @route   GET /api/billing/bills/appointment/:appointmentId
 * @desc    Get bills by appointment ID
 * @access  Private (Billing staff)
 */
router.get('/appointment/:appointmentId',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  BillController.getBillsByAppointment
);

/**
 * @route   GET /api/billing/bills/patient/:patientId
 * @desc    Get bills by patient ID
 * @access  Private (Billing staff)
 */
router.get('/patient/:patientId',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  BillController.getBillsByPatient
);

module.exports = router;