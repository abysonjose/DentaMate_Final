const Joi = require('joi');
const logger = require('../utils/logger');

// License validation schema
const licenseCreationSchema = Joi.object({
  tenantId: Joi.string().required().pattern(/^tenant_[a-f0-9-]+$/),
  planId: Joi.string().required().pattern(/^plan_[a-f0-9-]+$/),
  billingCycle: Joi.string().valid('monthly', 'yearly').default('monthly'),
  autoRenewal: Joi.boolean().default(true),
  skipTrial: Joi.boolean().default(false),
  gracePeriodDays: Joi.number().integer().min(0).max(30).default(7),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

// Subscription plan validation schema
const planCreationSchema = Joi.object({
  name: Joi.string().required().min(3).max(100).pattern(/^[a-zA-Z0-9_-]+$/),
  displayName: Joi.string().required().min(3).max(150),
  description: Joi.string().required().min(10).max(500),
  pricing: Joi.object({
    monthly: Joi.object({
      price: Joi.number().required().min(0),
      currency: Joi.string().default('USD').length(3)
    }).required(),
    yearly: Joi.object({
      price: Joi.number().required().min(0),
      currency: Joi.string().default('USD').length(3),
      discount: Joi.number().min(0).max(100).default(0)
    }).required()
  }).required(),
  limits: Joi.object({
    maxBranches: Joi.number().integer().required().min(1),
    maxUsers: Joi.number().integer().required().min(1),
    maxAppointmentsPerMonth: Joi.number().integer().required().min(1),
    storageQuotaGB: Joi.number().integer().required().min(1),
    maxAiRequestsPerMonth: Joi.number().integer().default(1000).min(0)
  }).required(),
  features: Joi.object({
    enabledModules: Joi.array().items(
      Joi.string().valid(
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS', 
        'OCR_PRESCRIPTION', 'BILLING', 'INVENTORY', 
        'ANALYTICS', 'NOTIFICATIONS', 'AUDIT_LOGS',
        'PAYROLL', 'HR', 'INSURANCE', 'LAB_MANAGEMENT',
        'PHARMACY', 'ORTHODONTIC', 'NURSING_CARE'
      )
    ).required(),
    aiFeatures: Joi.object({
      xrayAnalysis: Joi.boolean().default(false),
      cavityDetection: Joi.boolean().default(false),
      boneLossDetection: Joi.boolean().default(false),
      prescriptionOCR: Joi.boolean().default(false)
    }).default({}),
    advancedFeatures: Joi.object({
      multiTenantReporting: Joi.boolean().default(false),
      customBranding: Joi.boolean().default(false),
      apiAccess: Joi.boolean().default(false),
      prioritySupport: Joi.boolean().default(false),
      slaGuarantee: Joi.boolean().default(false)
    }).default({})
  }).required(),
  isPopular: Joi.boolean().default(false),
  isCustomizable: Joi.boolean().default(false),
  trialPeriodDays: Joi.number().integer().min(0).max(90).default(14),
  metadata: Joi.object({
    targetAudience: Joi.string().max(200),
    marketingDescription: Joi.string().max(500),
    salesNotes: Joi.string().max(1000)
  }).default({})
});

// Plan update validation schema
const planUpdateSchema = Joi.object({
  displayName: Joi.string().min(3).max(150),
  description: Joi.string().min(10).max(500),
  pricing: Joi.object({
    monthly: Joi.object({
      price: Joi.number().min(0),
      currency: Joi.string().length(3)
    }),
    yearly: Joi.object({
      price: Joi.number().min(0),
      currency: Joi.string().length(3),
      discount: Joi.number().min(0).max(100)
    })
  }),
  limits: Joi.object({
    maxBranches: Joi.number().integer().min(1),
    maxUsers: Joi.number().integer().min(1),
    maxAppointmentsPerMonth: Joi.number().integer().min(1),
    storageQuotaGB: Joi.number().integer().min(1),
    maxAiRequestsPerMonth: Joi.number().integer().min(0)
  }),
  features: Joi.object({
    enabledModules: Joi.array().items(
      Joi.string().valid(
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS', 
        'OCR_PRESCRIPTION', 'BILLING', 'INVENTORY', 
        'ANALYTICS', 'NOTIFICATIONS', 'AUDIT_LOGS',
        'PAYROLL', 'HR', 'INSURANCE', 'LAB_MANAGEMENT',
        'PHARMACY', 'ORTHODONTIC', 'NURSING_CARE'
      )
    ),
    aiFeatures: Joi.object({
      xrayAnalysis: Joi.boolean(),
      cavityDetection: Joi.boolean(),
      boneLossDetection: Joi.boolean(),
      prescriptionOCR: Joi.boolean()
    }),
    advancedFeatures: Joi.object({
      multiTenantReporting: Joi.boolean(),
      customBranding: Joi.boolean(),
      apiAccess: Joi.boolean(),
      prioritySupport: Joi.boolean(),
      slaGuarantee: Joi.boolean()
    })
  }),
  isPopular: Joi.boolean(),
  trialPeriodDays: Joi.number().integer().min(0).max(90),
  metadata: Joi.object({
    targetAudience: Joi.string().max(200),
    marketingDescription: Joi.string().max(500),
    salesNotes: Joi.string().max(1000)
  })
});

// Custom plan creation schema
const customPlanSchema = Joi.object({
  basePlanId: Joi.string().required().pattern(/^plan_[a-f0-9-]+$/),
  tenantId: Joi.string().required().pattern(/^tenant_[a-f0-9-]+$/),
  customizations: Joi.object({
    pricing: Joi.object({
      monthly: Joi.object({
        price: Joi.number().min(0),
        currency: Joi.string().length(3)
      }),
      yearly: Joi.object({
        price: Joi.number().min(0),
        currency: Joi.string().length(3),
        discount: Joi.number().min(0).max(100)
      })
    }),
    limits: Joi.object({
      maxBranches: Joi.number().integer().min(1),
      maxUsers: Joi.number().integer().min(1),
      maxAppointmentsPerMonth: Joi.number().integer().min(1),
      storageQuotaGB: Joi.number().integer().min(1),
      maxAiRequestsPerMonth: Joi.number().integer().min(0)
    }),
    enabledModules: Joi.array().items(
      Joi.string().valid(
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS', 
        'OCR_PRESCRIPTION', 'BILLING', 'INVENTORY', 
        'ANALYTICS', 'NOTIFICATIONS', 'AUDIT_LOGS',
        'PAYROLL', 'HR', 'INSURANCE', 'LAB_MANAGEMENT',
        'PHARMACY', 'ORTHODONTIC', 'NURSING_CARE'
      )
    ),
    aiFeatures: Joi.object({
      xrayAnalysis: Joi.boolean(),
      cavityDetection: Joi.boolean(),
      boneLossDetection: Joi.boolean(),
      prescriptionOCR: Joi.boolean()
    }),
    advancedFeatures: Joi.object({
      multiTenantReporting: Joi.boolean(),
      customBranding: Joi.boolean(),
      apiAccess: Joi.boolean(),
      prioritySupport: Joi.boolean(),
      slaGuarantee: Joi.boolean()
    }),
    trialPeriodDays: Joi.number().integer().min(0).max(90)
  }).required()
});

// License suspension/revocation schema
const licenseActionSchema = Joi.object({
  reason: Joi.string().required().min(10).max(500)
});

// Query parameter validation schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate'))
});

// Validation middleware factory
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation error:', { errors, body: req.body });

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
      }

      req.body = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Validation error'
      });
    }
  };
};

// Query validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Query validation error',
          errors
        });
      }

      req.query = value;
      next();
    } catch (err) {
      logger.error('Query validation middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Query validation error'
      });
    }
  };
};

// Specific validation middlewares
const validateLicenseCreation = validateBody(licenseCreationSchema);
const validatePlanCreation = validateBody(planCreationSchema);
const validatePlanUpdate = validateBody(planUpdateSchema);
const validateCustomPlan = validateBody(customPlanSchema);
const validateLicenseAction = validateBody(licenseActionSchema);
const validatePagination = validateQuery(paginationSchema);
const validateDateRange = validateQuery(dateRangeSchema);

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  try {
    // Recursively sanitize strings in request body
    const sanitizeObject = (obj) => {
      if (typeof obj === 'string') {
        return obj.trim().replace(/[<>]/g, ''); // Basic XSS prevention
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (err) {
    logger.error('Input sanitization error:', err);
    return res.status(500).json({
      success: false,
      message: 'Input processing error'
    });
  }
};

module.exports = {
  validateLicenseCreation,
  validatePlanCreation,
  validatePlanUpdate,
  validateCustomPlan,
  validateLicenseAction,
  validatePagination,
  validateDateRange,
  validateBody,
  validateQuery,
  sanitizeInput,
  
  // Export schemas for testing
  schemas: {
    licenseCreationSchema,
    planCreationSchema,
    planUpdateSchema,
    customPlanSchema,
    licenseActionSchema,
    paginationSchema,
    dateRangeSchema
  }
};