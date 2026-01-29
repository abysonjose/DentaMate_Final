const express = require('express');
const DiagnosticOrderController = require('../controllers/DiagnosticOrderController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();
const orderController = new DiagnosticOrderController();

// Apply authentication to all routes
router.use(auth);

// Apply rate limiting
router.use(rateLimiter.createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
}));

/**
 * @route POST /api/diagnostics/orders
 * @desc Create a new diagnostic order
 * @access Doctor, Nurse, Head Nurse
 */
router.post('/orders', 
  validation.validateRole(['DOCTOR', 'NURSE', 'HEAD_NURSE']),
  validation.validateCreateOrder,
  orderController.createOrder.bind(orderController)
);

/**
 * @route GET /api/diagnostics/orders
 * @desc Get diagnostic orders with filtering and pagination
 * @access All authenticated users (filtered by role)
 */
router.get('/orders',
  validation.validateGetOrders,
  orderController.getOrders.bind(orderController)
);

/**
 * @route GET /api/diagnostics/orders/:orderId
 * @desc Get a specific diagnostic order
 * @access All authenticated users (with access control)
 */
router.get('/orders/:orderId',
  validation.validateOrderId,
  orderController.getOrderById.bind(orderController)
);

/**
 * @route PATCH /api/diagnostics/orders/:orderId/status
 * @desc Update order status
 * @access Lab Staff, Branch Admin, Central Admin
 */
router.patch('/orders/:orderId/status',
  validation.validateRole(['LAB_STAFF', 'BRANCH_ADMIN', 'CENTRAL_ADMIN', 'DOCTOR']),
  validation.validateOrderId,
  validation.validateUpdateStatus,
  orderController.updateOrderStatus.bind(orderController)
);

/**
 * @route POST /api/diagnostics/orders/:orderId/assign
 * @desc Assign order to lab staff
 * @access Lab Staff, Branch Admin, Central Admin
 */
router.post('/orders/:orderId/assign',
  validation.validateRole(['LAB_STAFF', 'BRANCH_ADMIN', 'CENTRAL_ADMIN']),
  validation.validateOrderId,
  validation.validateAssignOrder,
  orderController.assignOrder.bind(orderController)
);

/**
 * @route PATCH /api/diagnostics/orders/:orderId/cancel
 * @desc Cancel order
 * @access Doctor, Branch Admin, Central Admin
 */
router.patch('/orders/:orderId/cancel',
  validation.validateRole(['DOCTOR', 'BRANCH_ADMIN', 'CENTRAL_ADMIN']),
  validation.validateOrderId,
  orderController.cancelOrder.bind(orderController)
);

/**
 * @route GET /api/diagnostics/orders/:orderId/history
 * @desc Get order status history
 * @access All authenticated users (with access control)
 */
router.get('/orders/:orderId/history',
  validation.validateOrderId,
  orderController.getOrderHistory.bind(orderController)
);

/**
 * @route GET /api/diagnostics/worklist
 * @desc Get lab worklist
 * @access Lab Staff, Branch Admin, Central Admin
 */
router.get('/worklist',
  validation.validateRole(['LAB_STAFF', 'BRANCH_ADMIN', 'CENTRAL_ADMIN']),
  orderController.getWorklist.bind(orderController)
);

/**
 * @route GET /api/diagnostics/statistics
 * @desc Get order statistics
 * @access All authenticated users (filtered by role)
 */
router.get('/statistics',
  orderController.getOrderStatistics.bind(orderController)
);

module.exports = router;