const Joi = require('joi');
const logger = require('../utils/logger');

// Common validation schemas
const commonSchemas = {
  tenantId: Joi.string().required().min(1).max(100),
  branchId: Joi.string().required().min(1).max(100),
  userId: Joi.string().required().min(1).max(100),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD').default('USD'),
  date: Joi.date().iso().required(),
  period: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  description: Joi.string().min(1).max(500).required(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }
};

// Ledger Entry Validation Schemas
const ledgerEntrySchemas = {
  create: Joi.object({
    debitAccount: Joi.string().valid(
      'CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'EQUIPMENT',
      'PREPAID_EXPENSES', 'OTHER_ASSETS', 'GOODWILL'
    ).required(),
    creditAccount: Joi.string().valid(
      'REVENUE', 'ACCOUNTS_PAYABLE', 'ACCRUED_EXPENSES', 'UNEARNED_REVENUE',
      'LOANS_PAYABLE', 'EQUITY', 'RETAINED_EARNINGS', 'OTHER_LIABILITIES'
    ).required(),
    amount: commonSchemas.amount,
    currency: commonSchemas.currency,
    reference: Joi.string().required().min(1).max(100),
    referenceService: Joi.string().valid(
      'billing-payment-service',
      'insurance-claims-service',
      'payroll-hr-service',
      'manual-entry'
    ).required(),
    date: commonSchemas.date,
    description: commonSchemas.description,
    department: Joi.string().valid(
      'GENERAL_DENTISTRY', 'ORTHODONTICS', 'ORAL_SURGERY', 
      'PERIODONTICS', 'ENDODONTICS', 'PEDIATRIC_DENTISTRY',
      'PROSTHODONTICS', 'ORAL_PATHOLOGY', 'ADMINISTRATION'
    ).optional(),
    doctorId: Joi.string().optional(),
    patientId: Joi.string().optional(),
    treatmentType: Joi.string().valid(
      'CONSULTATION', 'CLEANING', 'FILLING', 'EXTRACTION', 
      'ROOT_CANAL', 'CROWN', 'BRIDGE', 'IMPLANT', 
      'ORTHODONTIC_TREATMENT', 'SURGERY', 'OTHER'
    ).optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    metadata: Joi.object().optional()
  }),

  query: Joi.object({
    period: commonSchemas.period.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    debitAccount: Joi.string().optional(),
    creditAccount: Joi.string().optional(),
    isPosted: Joi.boolean().optional(),
    isReversed: Joi.boolean().optional(),
    department: Joi.string().optional(),
    doctorId: Joi.string().optional(),
    reference: Joi.string().optional(),
    ...commonSchemas.pagination
  }),

  post: Joi.object({
    entryId: Joi.string().required()
  }),

  reverse: Joi.object({
    entryId: Joi.string().required(),
    reason: Joi.string().required().min(1).max(500)
  })
};

// Expense Validation Schemas
const expenseSchemas = {
  create: Joi.object({
    category: Joi.string().valid(
      'EQUIPMENT', 'SUPPLIES', 'UTILITIES', 'RENT', 'INSURANCE',
      'MARKETING', 'PROFESSIONAL_SERVICES', 'MAINTENANCE',
      'STAFF_TRAINING', 'OFFICE_SUPPLIES', 'TECHNOLOGY',
      'TRAVEL', 'MEALS', 'OTHER'
    ).required(),
    subcategory: Joi.string().max(100).optional(),
    amount: commonSchemas.amount,
    currency: commonSchemas.currency,
    date: commonSchemas.date,
    description: commonSchemas.description,
    vendor: Joi.object({
      name: Joi.string().required().min(1).max(200),
      contactInfo: Joi.object({
        email: Joi.string().email().optional(),
        phone: Joi.string().optional(),
        address: Joi.string().optional()
      }).optional(),
      vendorId: Joi.string().optional()
    }).required(),
    invoiceNumber: Joi.string().max(100).optional(),
    purchaseOrderNumber: Joi.string().max(100).optional(),
    paymentMethod: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'OTHER').default('BANK_TRANSFER'),
    dueDate: Joi.date().iso().optional(),
    department: Joi.string().valid(
      'GENERAL_DENTISTRY', 'ORTHODONTICS', 'ORAL_SURGERY', 
      'PERIODONTICS', 'ENDODONTICS', 'PEDIATRIC_DENTISTRY',
      'PROSTHODONTICS', 'ORAL_PATHOLOGY', 'ADMINISTRATION',
      'FACILITIES', 'IT', 'MARKETING', 'HR'
    ).optional(),
    isTaxDeductible: Joi.boolean().default(true),
    taxCategory: Joi.string().valid('BUSINESS_EXPENSE', 'CAPITAL_EXPENDITURE', 'NON_DEDUCTIBLE').default('BUSINESS_EXPENSE'),
    taxAmount: Joi.number().min(0).default(0),
    isRecurring: Joi.boolean().default(false),
    recurringFrequency: Joi.when('isRecurring', {
      is: true,
      then: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY').required(),
      otherwise: Joi.optional()
    }),
    nextRecurringDate: Joi.when('isRecurring', {
      is: true,
      then: Joi.date().iso().required(),
      otherwise: Joi.optional()
    }),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    notes: Joi.string().max(1000).optional(),
    metadata: Joi.object().optional()
  }),

  update: Joi.object({
    category: Joi.string().valid(
      'EQUIPMENT', 'SUPPLIES', 'UTILITIES', 'RENT', 'INSURANCE',
      'MARKETING', 'PROFESSIONAL_SERVICES', 'MAINTENANCE',
      'STAFF_TRAINING', 'OFFICE_SUPPLIES', 'TECHNOLOGY',
      'TRAVEL', 'MEALS', 'OTHER'
    ).optional(),
    subcategory: Joi.string().max(100).optional(),
    amount: Joi.number().positive().precision(2).optional(),
    description: Joi.string().min(1).max(500).optional(),
    vendor: Joi.object({
      name: Joi.string().min(1).max(200).optional(),
      contactInfo: Joi.object({
        email: Joi.string().email().optional(),
        phone: Joi.string().optional(),
        address: Joi.string().optional()
      }).optional(),
      vendorId: Joi.string().optional()
    }).optional(),
    invoiceNumber: Joi.string().max(100).optional(),
    purchaseOrderNumber: Joi.string().max(100).optional(),
    paymentMethod: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'OTHER').optional(),
    dueDate: Joi.date().iso().optional(),
    department: Joi.string().optional(),
    isTaxDeductible: Joi.boolean().optional(),
    taxCategory: Joi.string().valid('BUSINESS_EXPENSE', 'CAPITAL_EXPENDITURE', 'NON_DEDUCTIBLE').optional(),
    taxAmount: Joi.number().min(0).optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    notes: Joi.string().max(1000).optional(),
    metadata: Joi.object().optional()
  }),

  query: Joi.object({
    category: Joi.string().optional(),
    approvalStatus: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_REVIEW').optional(),
    paymentStatus: Joi.string().valid('PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED').optional(),
    period: commonSchemas.period.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    vendor: Joi.string().optional(),
    department: Joi.string().optional(),
    isPostedToLedger: Joi.boolean().optional(),
    ...commonSchemas.pagination
  }),

  approve: Joi.object({
    comments: Joi.string().max(500).optional()
  }),

  reject: Joi.object({
    comments: Joi.string().required().min(1).max(500)
  }),

  markPaid: Joi.object({
    paymentDate: Joi.date().iso().optional(),
    paymentMethod: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'OTHER').optional()
  })
};

// Revenue Validation Schemas
const revenueSchemas = {
  query: Joi.object({
    source: Joi.string().valid('PATIENT_PAYMENT', 'INSURANCE_SETTLEMENT', 'OTHER').optional(),
    department: Joi.string().optional(),
    doctorId: Joi.string().optional(),
    treatmentType: Joi.string().optional(),
    period: commonSchemas.period.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    reconciliationStatus: Joi.string().valid('MATCHED', 'PENDING', 'FLAGGED').optional(),
    isRefunded: Joi.boolean().optional(),
    ...commonSchemas.pagination
  }),

  reconcile: Joi.object({
    revenueId: Joi.string().required(),
    notes: Joi.string().max(500).optional()
  }),

  flag: Joi.object({
    revenueId: Joi.string().required(),
    reason: Joi.string().required().min(1).max(500)
  })
};

// Financial Period Validation Schemas
const financialPeriodSchemas = {
  create: Joi.object({
    period: commonSchemas.period,
    periodType: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY').default('MONTHLY')
  }),

  query: Joi.object({
    status: Joi.string().valid('OPEN', 'CLOSED', 'LOCKED').optional(),
    financialYear: Joi.string().pattern(/^\d{4}-\d{4}$/).optional(),
    periodType: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY').optional(),
    ...commonSchemas.pagination
  }),

  close: Joi.object({
    periodId: Joi.string().required()
  }),

  lock: Joi.object({
    periodId: Joi.string().required(),
    reason: Joi.string().required().min(1).max(500)
  }),

  unlock: Joi.object({
    periodId: Joi.string().required(),
    reason: Joi.string().required().min(1).max(500)
  })
};

// Report Validation Schemas
const reportSchemas = {
  generate: Joi.object({
    reportType: Joi.string().valid(
      'TRIAL_BALANCE', 'INCOME_STATEMENT', 'BALANCE_SHEET', 
      'CASH_FLOW', 'TAX_SUMMARY', 'EXPENSE_SUMMARY', 'REVENUE_SUMMARY'
    ).required(),
    period: commonSchemas.period.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    format: Joi.string().valid('PDF', 'CSV', 'JSON').default('PDF'),
    filters: Joi.object({
      department: Joi.string().optional(),
      doctorId: Joi.string().optional(),
      category: Joi.string().optional()
    }).optional()
  }),

  export: Joi.object({
    dataType: Joi.string().valid('LEDGER', 'EXPENSES', 'REVENUE', 'ALL').required(),
    format: Joi.string().valid('CSV', 'JSON').required(),
    period: commonSchemas.period.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    filters: Joi.object().optional()
  })
};

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : 
                  source === 'params' ? req.params : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation failed', {
        source,
        errors: errorDetails,
        userId: req.user?.userId,
        path: req.path
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails
      });
    }

    // Replace the original data with validated and sanitized data
    if (source === 'query') {
      req.query = value;
    } else if (source === 'params') {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// Custom validation functions
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }
    
    // Limit date range to prevent performance issues
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 365 days'
      });
    }
  }
  
  next();
};

const validatePeriodAccess = async (req, res, next) => {
  const { period } = req.body || req.query;
  
  if (period) {
    const FinancialPeriod = require('../models/FinancialPeriod');
    
    try {
      const canPost = await FinancialPeriod.canPostToLedger(
        req.user.tenantId,
        req.user.branchId,
        period
      );
      
      if (!canPost) {
        return res.status(400).json({
          success: false,
          message: 'Cannot post to closed or locked financial period'
        });
      }
    } catch (error) {
      logger.error('Period validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate financial period'
      });
    }
  }
  
  next();
};

module.exports = {
  validate,
  validateDateRange,
  validatePeriodAccess,
  schemas: {
    ledgerEntry: ledgerEntrySchemas,
    expense: expenseSchemas,
    revenue: revenueSchemas,
    financialPeriod: financialPeriodSchemas,
    report: reportSchemas
  }
};