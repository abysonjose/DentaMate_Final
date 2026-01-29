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
  validateCreatePayment,
  validateOnlinePayment,
  validateVerifyPayment,
  validatePaymentQuery,
  validateIdParam
} = require('../middleware/validation');

const {
  paymentLimiter,
  generalLimiter,
  webhookLimiter
} = require('../middleware/rateLimiter');

// Controller
const PaymentController = require('../controllers/PaymentController');

// Apply common middleware to protected routes
const protectedRoutes = express.Router();
protectedRoutes.use(authenticateToken);
protectedRoutes.use(validateTenantAccess);
protectedRoutes.use(validateBranchAccess);
protectedRoutes.use(logRequest);

/**
 * @route   POST /api/billing/payments
 * @desc    Create offline payment (cash, card, etc.)
 * @access  Private (Cashier only)
 */
protectedRoutes.post('/',
  paymentLimiter,
  validateBillingRole('COLLECT_PAYMENT'),
  validateCreatePayment,
  PaymentController.createPayment
);

/**
 * @route   POST /api/billing/payments/online
 * @desc    Create online payment order
 * @access  Private (Cashier only)
 */
protectedRoutes.post('/online',
  paymentLimiter,
  validateBillingRole('COLLECT_PAYMENT'),
  validateOnlinePayment,
  PaymentController.createOnlinePayment
);

/**
 * @route   POST /api/billing/payments/verify
 * @desc    Verify online payment
 * @access  Private (Cashier only)
 */
protectedRoutes.post('/verify',
  paymentLimiter,
  validateBillingRole('COLLECT_PAYMENT'),
  validateVerifyPayment,
  PaymentController.verifyOnlinePayment
);

/**
 * @route   GET /api/billing/payments
 * @desc    Get payments with pagination and filters
 * @access  Private (Billing staff)
 */
protectedRoutes.get('/',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validatePaymentQuery,
  PaymentController.getPayments
);

/**
 * @route   GET /api/billing/payments/statistics
 * @desc    Get payment statistics
 * @access  Private (Billing staff)
 */
protectedRoutes.get('/statistics',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  PaymentController.getPaymentStatistics
);

/**
 * @route   GET /api/billing/payments/methods-summary
 * @desc    Get payment methods summary
 * @access  Private (Billing staff)
 */
protectedRoutes.get('/methods-summary',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  PaymentController.getPaymentMethodsSummary
);

/**
 * @route   GET /api/billing/payments/daily-summary
 * @desc    Get daily payment summary
 * @access  Private (Billing staff)
 */
protectedRoutes.get('/daily-summary',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  PaymentController.getDailyPaymentSummary
);

/**
 * @route   GET /api/billing/payments/:id
 * @desc    Get payment by ID
 * @access  Private (Billing staff)
 */
protectedRoutes.get('/:id',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validateIdParam,
  PaymentController.getPaymentById
);

/**
 * @route   GET /api/billing/payments/invoice/:invoiceId
 * @desc    Get payments by invoice ID
 * @access  Private (Billing staff)
 */
protectedRoutes.get('/invoice/:invoiceId',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  PaymentController.getPaymentsByInvoice
);

/**
 * @route   GET /api/billing/payments/patient/:patientId
 * @desc    Get payments by patient ID
 * @access  Private (Billing staff)
 */
protectedRoutes.get('/patient/:patientId',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  PaymentController.getPaymentsByPatient
);

// Webhook route (no authentication required)
/**
 * @route   POST /api/billing/payments/webhook
 * @desc    Handle payment gateway webhook
 * @access  Public (webhook endpoint)
 */
router.post('/webhook',
  webhookLimiter,
  PaymentController.handlePaymentWebhook
);

// Mount protected routes
router.use('/', protectedRoutes);

module.exports = router;