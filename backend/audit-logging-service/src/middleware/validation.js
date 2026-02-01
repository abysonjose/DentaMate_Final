const Joi = require('joi');
const logger = require('../utils/logger');

// Validation schemas for audit events
const auditEventSchema = Joi.object({
  actorId: Joi.string().required().min(1).max(100),
  actorRole: Joi.string().required().valid(
    'PATIENT', 'DOCTOR', 'NURSE', 'HEAD_NURSE', 'ORTHOTIST',
    'LAB_STAFF', 'PHARMACIST', 'RECEPTIONIST', 'SUPPORT_STAFF',
    'BILLING_OFFICER', 'CASHIER', 'ACCOUNTANT', 'ACCOUNTS_MANAGER',
    'PAYROLL_OFFICER', 'INSURANCE_STAFF', 'HR_STAFF',
    'BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN', 'SYSTEM'
  ),
  action: Joi.string().required().valid(
    'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE', 'REJECT',
    'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'
  ),
  resource: Joi.object({
    type: Joi.string().required().valid(
      'PATIENT', 'APPOINTMENT', 'MEDICAL_RECORD', 'PRESCRIPTION',
      'INVOICE', 'PAYMENT', 'REFUND', 'INSURANCE_CLAIM',
      'INVENTORY_ITEM', 'STAFF_RECORD', 'PAYROLL', 'ATTENDANCE',
      'TENANT', 'BRANCH', 'USER_ACCOUNT', 'ROLE', 'PERMISSION',
      'AI_ANALYSIS', 'LAB_RESULT', 'QUEUE_TOKEN', 'NOTIFICATION',
      'REPORT', 'BACKUP', 'SYSTEM_CONFIG', 'LICENSE'
    ),
    id: Joi.string().required().min(1).max(100)
  }).required(),
  tenantId: Joi.string().required().min(1).max(100),
  branchId: Joi.string().optional().min(1).max(100),
  sourceService: Joi.string().required().valid(
    'auth-identity-service', 'tenant-organization-service',
    'appointment-scheduling-service', 'token-queue-realtime-service',
    'nursing-care-service', 'orthodontic-braces-service',
    'lab-diagnostics-service', 'ai-diagnosis-service',
    'prescription-ocr-service', 'billing-payment-service',
    'insurance-claims-service', 'accounting-finance-service',
    'payroll-hr-service', 'inventory-pharmacy-service',
    'collaboration-meeting-service', 'notification-communication-service',
    'analytics-intelligence-service', 'audit-logging-service',
    'api-gateway', 'frontend-application'
  ),
  category: Joi.string().required().valid(
    'SECURITY', 'CLINICAL', 'FINANCIAL', 'HR_PAYROLL', 'SAAS_GOVERNANCE', 'SYSTEM'
  ),
  severity: Joi.string().optional().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
  metadata: Joi.object({
    ipAddress: Joi.string().ip().optional(),
    userAgent: Joi.string().max(500).optional(),
    sessionId: Joi.string().max(100).optional(),
    reason: Joi.string().max(500).optional(),
    additionalData: Joi.object().optional()
  }).optional(),
  timestamp: Joi.date().optional()
});

// Batch audit events schema
const batchAuditEventsSchema = Joi.object({
  events: Joi.array().items(auditEventSchema).min(1).max(100).required()
});

// Query parameters schema
const queryParamsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(50),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  category: Joi.string().valid('SECURITY', 'CLINICAL', 'FINANCIAL', 'HR_PAYROLL', 'SAAS_GOVERNANCE', 'SYSTEM').optional(),
  action: Joi.string().valid('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT').optional(),
  actorId: Joi.string().max(100).optional(),
  actorRole: Joi.string().valid(
    'PATIENT', 'DOCTOR', 'NURSE', 'HEAD_NURSE', 'ORTHOTIST',
    'LAB_STAFF', 'PHARMACIST', 'RECEPTIONIST', 'SUPPORT_STAFF',
    'BILLING_OFFICER', 'CASHIER', 'ACCOUNTANT', 'ACCOUNTS_MANAGER',
    'PAYROLL_OFFICER', 'INSURANCE_STAFF', 'HR_STAFF',
    'BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN', 'SYSTEM'
  ).optional(),
  sourceService: Joi.string().optional(),
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  resourceType: Joi.string().optional(),
  resourceId: Joi.string().max(100).optional(),
  sortBy: Joi.string().valid('timestamp', 'severity', 'category').default('timestamp'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Summary query parameters schema
const summaryQuerySchema = Joi.object({
  periodType: Joi.string().valid('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY').default('DAILY'),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  branchId: Joi.string().max(100).optional()
});

// Integrity check parameters schema
const integrityCheckSchema = Joi.object({
  limit: Joi.number().integer().min(100).max(10000).default(1000),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

// Generic validation middleware
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
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

        logger.warn('Validation error', {
          endpoint: req.path,
          method: req.method,
          errors: errorDetails,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          errors: errorDetails
        });
      }

      // Replace the request property with validated and sanitized data
      req[property] = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Validation processing error',
        code: 'VALIDATION_PROCESSING_ERROR'
      });
    }
  };
};

// Specific validation middlewares
const validateAuditEvent = validateRequest(auditEventSchema, 'body');
const validateBatchAuditEvents = validateRequest(batchAuditEventsSchema, 'body');
const validateQueryParams = validateRequest(queryParamsSchema, 'query');
const validateSummaryQuery = validateRequest(summaryQuerySchema, 'query');
const validateIntegrityCheck = validateRequest(integrityCheckSchema, 'query');

// Custom validation for date ranges
const validateDateRange = (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be before end date',
          code: 'INVALID_DATE_RANGE'
        });
      }

      // Limit date range to prevent excessive queries
      const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
      if (end - start > maxRangeMs) {
        return res.status(400).json({
          success: false,
          message: 'Date range cannot exceed 1 year',
          code: 'DATE_RANGE_TOO_LARGE'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Date range validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Date range validation error',
      code: 'DATE_VALIDATION_ERROR'
    });
  }
};

// Validate tenant context for multi-tenant operations
const validateTenantContext = (req, res, next) => {
  try {
    // For service-to-service calls, tenant context should be in the request body
    if (req.service) {
      if (!req.body.tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required for service calls',
          code: 'TENANT_ID_REQUIRED'
        });
      }
    }
    // For user calls, tenant context comes from JWT
    else if (req.user && !req.user.tenantId && req.user.role !== 'SAAS_ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Tenant context is required',
        code: 'TENANT_CONTEXT_REQUIRED'
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant context validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Tenant context validation error',
      code: 'TENANT_VALIDATION_ERROR'
    });
  }
};

// Validate batch size limits
const validateBatchSize = (maxSize = 100) => {
  return (req, res, next) => {
    try {
      if (req.body.events && Array.isArray(req.body.events)) {
        if (req.body.events.length > maxSize) {
          return res.status(400).json({
            success: false,
            message: `Batch size cannot exceed ${maxSize} events`,
            code: 'BATCH_SIZE_EXCEEDED',
            maxSize,
            receivedSize: req.body.events.length
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Batch size validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Batch size validation error',
        code: 'BATCH_VALIDATION_ERROR'
      });
    }
  };
};

module.exports = {
  validateAuditEvent,
  validateBatchAuditEvents,
  validateQueryParams,
  validateSummaryQuery,
  validateIntegrityCheck,
  validateDateRange,
  validateTenantContext,
  validateBatchSize,
  validateRequest
};