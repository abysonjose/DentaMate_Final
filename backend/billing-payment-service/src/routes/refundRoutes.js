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
  validateCreateRefund,
  validateApproveRefund,
  validateRejectRefund,
  validateRefundQuery,
  validateIdParam
} = require('../middleware/validation');

const {
  refundLimiter,
  generalLimiter,
  strictLimiter
} = require('../middleware/rateLimiter');

// Controller
const RefundController = require('../controllers/RefundController');

// Apply common middleware
router.use(authenticateToken);
router.use(validateTenantAccess);
router.use(validateBranchAccess);
router.use(logRequest);

/**
 * @route   POST /api/billing/refunds
 * @desc    Create refund request
 * @access  Private (Cashier, Billing Officer, Accounts Manager)
 */
router.post('/',
  refundLimiter,
  validateBillingRole('VIEW_BILLING'), // Basic billing access required
  validateCreateRefund,
  RefundController.createRefund
);

/**
 * @route   GET /api/billing/refunds
 * @desc    Get refunds with pagination and filters
 * @access  Private (Billing staff)
 */
router.get('/',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validateRefundQuery,
  RefundController.getRefunds
);

/**
 * @route   GET /api/billing/refunds/pending
 * @desc    Get pending refunds for approval
 * @access  Private (Accounts Manager)
 */
router.get('/pending',
  generalLimiter,
  validateBillingRole('APPROVE_REFUND'),
  RefundController.getPendingRefunds
);

/**
 * @route   GET /api/billing/refunds/statistics
 * @desc    Get refund statistics
 * @access  Private (Billing staff)
 */
router.get('/statistics',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  RefundController.getRefundStatistics
);

/**
 * @route   GET /api/billing/refunds/approval-queue
 * @desc    Get refund approval queue
 * @access  Private (Accounts Manager)
 */
router.get('/approval-queue',
  generalLimiter,
  validateBillingRole('APPROVE_REFUND'),
  RefundController.getRefundApprovalQueue
);

/**
 * @route   POST /api/billing/refunds/bulk-approve
 * @desc    Bulk approve refunds
 * @access  Private (Accounts Manager)
 */
router.post('/bulk-approve',
  strictLimiter,
  validateBillingRole('APPROVE_REFUND'),
  RefundController.bulkApproveRefunds
);

/**
 * @route   GET /api/billing/refunds/:id
 * @desc    Get refund by ID
 * @access  Private (Billing staff)
 */
router.get('/:id',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  validateIdParam,
  RefundController.getRefundById
);

/**
 * @route   POST /api/billing/refunds/:id/approve
 * @desc    Approve refund
 * @access  Private (Accounts Manager only)
 */
router.post('/:id/approve',
  strictLimiter,
  validateBillingRole('APPROVE_REFUND'),
  validateIdParam,
  validateApproveRefund,
  RefundController.approveRefund
);

/**
 * @route   POST /api/billing/refunds/:id/reject
 * @desc    Reject refund
 * @access  Private (Accounts Manager only)
 */
router.post('/:id/reject',
  strictLimiter,
  validateBillingRole('APPROVE_REFUND'),
  validateIdParam,
  validateRejectRefund,
  RefundController.rejectRefund
);

/**
 * @route   POST /api/billing/refunds/:id/complete
 * @desc    Complete manual refund
 * @access  Private (Accounts Manager only)
 */
router.post('/:id/complete',
  strictLimiter,
  validateBillingRole('APPROVE_REFUND'),
  validateIdParam,
  RefundController.completeRefund
);

/**
 * @route   GET /api/billing/refunds/payment/:paymentId
 * @desc    Get refunds by payment ID
 * @access  Private (Billing staff)
 */
router.get('/payment/:paymentId',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  RefundController.getRefundsByPayment
);

/**
 * @route   GET /api/billing/refunds/patient/:patientId
 * @desc    Get refunds by patient ID
 * @access  Private (Billing staff)
 */
router.get('/patient/:patientId',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  RefundController.getRefundsByPatient
);

/**
 * @route   GET /api/billing/refunds/invoice/:invoiceId
 * @desc    Get refunds by invoice ID
 * @access  Private (Billing staff)
 */
router.get('/invoice/:invoiceId',
  generalLimiter,
  validateBillingRole('VIEW_BILLING'),
  RefundController.getRefundsByInvoice
);

module.exports = router;