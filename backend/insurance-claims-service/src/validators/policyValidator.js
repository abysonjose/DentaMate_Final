const Joi = require('joi');

const createPolicySchema = Joi.object({
  patientId: Joi.string().required(),
  provider: Joi.object({
    name: Joi.string().required(),
    code: Joi.string().required(),
    contactInfo: Joi.object({
      phone: Joi.string().optional(),
      email: Joi.string().email().optional(),
      address: Joi.string().optional()
    }).optional()
  }).required(),
  policyNumber: Joi.string().required(),
  policyHolderName: Joi.string().required(),
  policyHolderRelation: Joi.string().valid('self', 'spouse', 'child', 'parent', 'other').default('self'),
  coverageType: Joi.string().valid('basic', 'comprehensive', 'premium', 'family').required(),
  coverageDetails: Joi.object({
    annualLimit: Joi.number().positive().required(),
    deductible: Joi.number().min(0).default(0),
    coPaymentPercentage: Joi.number().min(0).max(100).default(0),
    coveredServices: Joi.array().items(
      Joi.object({
        serviceType: Joi.string().required(),
        coveragePercentage: Joi.number().min(0).max(100).required(),
        annualLimit: Joi.number().positive().optional()
      })
    ).optional(),
    excludedServices: Joi.array().items(Joi.string()).optional()
  }).required(),
  validityPeriod: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required()
  }).required()
});

const updatePolicySchema = Joi.object({
  provider: Joi.object({
    name: Joi.string().optional(),
    code: Joi.string().optional(),
    contactInfo: Joi.object({
      phone: Joi.string().optional(),
      email: Joi.string().email().optional(),
      address: Joi.string().optional()
    }).optional()
  }).optional(),
  policyNumber: Joi.string().optional(),
  policyHolderName: Joi.string().optional(),
  policyHolderRelation: Joi.string().valid('self', 'spouse', 'child', 'parent', 'other').optional(),
  coverageType: Joi.string().valid('basic', 'comprehensive', 'premium', 'family').optional(),
  coverageDetails: Joi.object({
    annualLimit: Joi.number().positive().optional(),
    deductible: Joi.number().min(0).optional(),
    coPaymentPercentage: Joi.number().min(0).max(100).optional(),
    coveredServices: Joi.array().items(
      Joi.object({
        serviceType: Joi.string().required(),
        coveragePercentage: Joi.number().min(0).max(100).required(),
        annualLimit: Joi.number().positive().optional()
      })
    ).optional(),
    excludedServices: Joi.array().items(Joi.string()).optional()
  }).optional(),
  validityPeriod: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
  }).optional(),
  status: Joi.string().valid('active', 'expired', 'suspended', 'cancelled').optional()
}).min(1);

const verifyPolicySchema = Joi.object({
  status: Joi.string().valid('pending', 'verified', 'failed', 'expired').required(),
  notes: Joi.string().optional()
});

const policyIdSchema = Joi.object({
  policyId: Joi.string().required()
});

const patientIdSchema = Joi.object({
  patientId: Joi.string().required()
});

const eligibilityQuerySchema = Joi.object({
  serviceType: Joi.string().required(),
  amount: Joi.number().positive().required()
});

const policiesQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'expired', 'suspended', 'cancelled').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const expiringPoliciesQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30)
});

module.exports = {
  createPolicySchema,
  updatePolicySchema,
  verifyPolicySchema,
  policyIdSchema,
  patientIdSchema,
  eligibilityQuerySchema,
  policiesQuerySchema,
  expiringPoliciesQuerySchema
};