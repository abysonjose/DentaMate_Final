const Joi = require('joi');
const logger = require('../utils/logger');

// Generic validation middleware
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation error', {
          property,
          errors: errorDetails,
          userId: req.user?.userId,
          tenantId: req.user?.tenantId,
          path: req.path
        });

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorDetails
        });
      }

      // Replace the original data with validated data
      req[property] = value;
      next();
    } catch (validationError) {
      logger.error('Validation middleware error:', validationError);
      return res.status(500).json({
        success: false,
        message: 'Validation service error'
      });
    }
  };
};

// Bill validation schemas
const billItemSchema = Joi.object({
  itemType: Joi.string().valid('CONSULTATION', 'PROCEDURE', 'DIAGNOSTIC', 'MEDICATION', 'OTHER').required(),
  itemId: Joi.string().required(),
  description: Joi.string().trim().min(1).max(500).required(),
  quantity: Joi.number().integer().min(1).default(1),
  unitPrice: Joi.number().min(0).required(),
  totalPrice: Joi.number().min(0).required(),
  discountPercent: Joi.number().min(0).max(100).default(0),
  discountAmount: Joi.number().min(0).default(0),
  taxPercent: Joi.number().min(0).default(0),
  taxAmount: Joi.number().min(0).default(0)
});

const createBillSchema = Joi.object({
  appointmentId: Joi.string().required(),
  patientId: Joi.string().required(),
  doctorId: Joi.string().required(),
  items: Joi.array().items(billItemSchema).min(1).required(),
  notes: Joi.string().trim().max(1000).optional()
});

const updateBillSchema = Joi.object({
  items: Joi.array().items(billItemSchema).min(1).optional(),
  notes: Joi.string().trim().max(1000).optional(),
  status: Joi.string().valid('DRAFT', 'GENERATED').optional()
});

// Invoice validation schemas
const createInvoiceSchema = Joi.object({
  billId: Joi.string().required(),
  patientDetails: Joi.object({
    name: Joi.string().trim().required(),
    email: Joi.string().email().optional(),
    phone: Joi.string().trim().optional(),
    address: Joi.string().trim().optional()
  }).required(),
  clinicDetails: Joi.object({
    name: Joi.string().trim().required(),
    address: Joi.string().trim().required(),
    phone: Joi.string().trim().optional(),
    email: Joi.string().email().optional(),
    gstNumber: Joi.string().trim().optional(),
    licenseNumber: Joi.string().trim().optional()
  }).required(),
  dueDate: Joi.date().min('now').required(),
  paymentTerms: Joi.string().trim().max(200).optional(),
  notes: Joi.string().trim().max(1000).optional()
});

// Payment validation schemas
const createPaymentSchema = Joi.object({
  invoiceId: Joi.string().required(),
  amount: Joi.number().min(0.01).required(),
  mode: Joi.string().valid('CASH', 'UPI', 'CARD', 'WALLET', 'BANK_TRANSFER', 'CHEQUE').required(),
  paymentDetails: Joi.object({
    cardLast4: Joi.string().length(4).optional(),
    cardType: Joi.string().optional(),
    bankName: Joi.string().trim().optional(),
    upiId: Joi.string().trim().optional(),
    chequeNumber: Joi.string().trim().optional(),
    chequeDate: Joi.date().optional(),
    bankReference: Joi.string().trim().optional()
  }).optional(),
  notes: Joi.string().trim().max(500).optional()
});

const onlinePaymentSchema = Joi.object({
  invoiceId: Joi.string().required(),
  amount: Joi.number().min(0.01).required(),
  currency: Joi.string().valid('INR').default('INR'),
  customerDetails: Joi.object({
    name: Joi.string().trim().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().trim().required()
  }).required(),
  notes: Joi.string().trim().max(500).optional()
});

const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required()
});

// Refund validation schemas
const createRefundSchema = Joi.object({
  paymentId: Joi.string().required(),
  refundAmount: Joi.number().min(0.01).required(),
  refundType: Joi.string().valid('FULL', 'PARTIAL', 'BILLING_CORRECTION').required(),
  reason: Joi.string().trim().min(10).max(500).required(),
  refundMethod: Joi.string().valid('ORIGINAL_PAYMENT_METHOD', 'CASH', 'BANK_TRANSFER', 'CHEQUE').default('ORIGINAL_PAYMENT_METHOD'),
  bankDetails: Joi.object({
    accountNumber: Joi.string().trim().required(),
    ifscCode: Joi.string().trim().required(),
    accountHolderName: Joi.string().trim().required(),
    bankName: Joi.string().trim().required()
  }).when('refundMethod', { is: 'BANK_TRANSFER', then: Joi.required() }),
  chequeDetails: Joi.object({
    chequeNumber: Joi.string().trim().required(),
    chequeDate: Joi.date().min('now').required(),
    bankName: Joi.string().trim().required()
  }).when('refundMethod', { is: 'CHEQUE', then: Joi.required() }),
  notes: Joi.string().trim().max(500).optional()
});

const approveRefundSchema = Joi.object({
  approvalNotes: Joi.string().trim().max(500).optional()
});

const rejectRefundSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(10).max(500).required()
});

// Query parameter validation schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const billQuerySchema = paginationSchema.keys({
  status: Joi.string().valid('DRAFT', 'GENERATED', 'CANCELLED').optional(),
  patientId: Joi.string().optional(),
  appointmentId: Joi.string().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().trim().optional()
});

const invoiceQuerySchema = paginationSchema.keys({
  status: Joi.string().valid('GENERATED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED').optional(),
  patientId: Joi.string().optional(),
  overdue: Joi.boolean().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().trim().optional()
});

const paymentQuerySchema = paginationSchema.keys({
  status: Joi.string().valid('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED').optional(),
  mode: Joi.string().valid('CASH', 'UPI', 'CARD', 'WALLET', 'BANK_TRANSFER', 'CHEQUE').optional(),
  patientId: Joi.string().optional(),
  invoiceId: Joi.string().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().trim().optional()
});

const refundQuerySchema = paginationSchema.keys({
  status: Joi.string().valid('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED').optional(),
  refundType: Joi.string().valid('FULL', 'PARTIAL', 'BILLING_CORRECTION').optional(),
  patientId: Joi.string().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().trim().optional()
});

// ID parameter validation
const idParamSchema = Joi.object({
  id: Joi.string().required()
});

module.exports = {
  validate,
  
  // Bill validations
  validateCreateBill: validate(createBillSchema),
  validateUpdateBill: validate(updateBillSchema),
  validateBillQuery: validate(billQuerySchema, 'query'),
  
  // Invoice validations
  validateCreateInvoice: validate(createInvoiceSchema),
  validateInvoiceQuery: validate(invoiceQuerySchema, 'query'),
  
  // Payment validations
  validateCreatePayment: validate(createPaymentSchema),
  validateOnlinePayment: validate(onlinePaymentSchema),
  validateVerifyPayment: validate(verifyPaymentSchema),
  validatePaymentQuery: validate(paymentQuerySchema, 'query'),
  
  // Refund validations
  validateCreateRefund: validate(createRefundSchema),
  validateApproveRefund: validate(approveRefundSchema),
  validateRejectRefund: validate(rejectRefundSchema),
  validateRefundQuery: validate(refundQuerySchema, 'query'),
  
  // Parameter validations
  validateIdParam: validate(idParamSchema, 'params'),
  validatePagination: validate(paginationSchema, 'query')
};