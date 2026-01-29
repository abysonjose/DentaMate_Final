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
  validateCreateInvoice,
  validateInvoiceQuery,
  validateIdParam
} = require('../middleware/validation');

const {
  invoiceGenerationLimiter,
  generalLimiter
} = require('../middleware/rateLimiter');

// Controller
const InvoiceController = require('../controllers/InvoiceController');

// Apply common middleware
router.use(authenticateToken);
router.use(validateTenantAccess);
router.use(validateBranchAccess);
router.use(logRequest);

/**
 * @route   POST /api/billing/invoices
 * @desc    Create invoice from bill
 * @access  Private (Billing Officer only)
 */
router.post('/',
  invoiceGenerationLimiter,
  validateBillingRole('GENERATE_INVOICE'),
  validateCreateInvoice,
  InvoiceController.createInvoice
);

/**
 * @route   GET /api/billing/invoices
 * @desc    Get invoices with pagination and filters
 * @access  Private (Billing staff)
 */
router.get('/',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validateInvoiceQuery,
  InvoiceController.getInvoices
);

/**
 * @route   GET /api/billing/invoices/statistics
 * @desc    Get invoice statistics
 * @access  Private (Billing staff)
 */
router.get('/statistics',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  InvoiceController.getInvoiceStatistics
);

/**
 * @route   GET /api/billing/invoices/overdue
 * @desc    Get overdue invoices
 * @access  Private (Billing staff)
 */
router.get('/overdue',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  InvoiceController.getOverdueInvoices
);

/**
 * @route   GET /api/billing/invoices/:id
 * @desc    Get invoice by ID
 * @access  Private (Billing staff)
 */
router.get('/:id',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validateIdParam,
  InvoiceController.getInvoiceById
);

/**
 * @route   POST /api/billing/invoices/:id/cancel
 * @desc    Cancel invoice
 * @access  Private (Billing Officer, Accounts Manager)
 */
router.post('/:id/cancel',
  generalLimiter,
  validateBillingRole('CANCEL_BILL'),
  validateIdParam,
  InvoiceController.cancelInvoice
);

/**
 * @route   POST /api/billing/invoices/:id/generate-pdf
 * @desc    Generate invoice PDF
 * @access  Private (Billing staff)
 */
router.post('/:id/generate-pdf',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validateIdParam,
  InvoiceController.generateInvoicePDF
);

/**
 * @route   GET /api/billing/invoices/:id/download-pdf
 * @desc    Download invoice PDF
 * @access  Private (Billing staff)
 */
router.get('/:id/download-pdf',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validateIdParam,
  InvoiceController.downloadInvoicePDF
);

/**
 * @route   GET /api/billing/invoices/:id/validate-for-payment
 * @desc    Validate invoice for payment
 * @access  Private (Cashier)
 */
router.get('/:id/validate-for-payment',
  generalLimiter,
  validateBillingRole('COLLECT_PAYMENT'),
  validateIdParam,
  InvoiceController.validateInvoiceForPayment
);

/**
 * @route   GET /api/billing/invoices/patient/:patientId
 * @desc    Get invoices by patient ID
 * @access  Private (Billing staff)
 */
router.get('/patient/:patientId',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  InvoiceController.getInvoicesByPatient
);

/**
 * @route   GET /api/billing/invoices/bill/:billId
 * @desc    Get invoice by bill ID
 * @access  Private (Billing staff)
 */
router.get('/bill/:billId',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  InvoiceController.getInvoiceByBill
);

module.exports = router;