const Joi = require('joi');

const createClaimSchema = Joi.object({
  patientId: Joi.string().required(),
  policyId: Joi.string().required(),
  invoiceId: Joi.string().required(),
  appointmentId: Joi.string().optional(),
  doctorId: Joi.string().optional(),
  treatmentDetails: Joi.object({
    treatmentDate: Joi.date().required(),
    treatmentType: Joi.string().required(),
    treatmentCodes: Joi.array().items(
      Joi.object({
        code: Joi.string().required(),
        description: Joi.string().required(),
        amount: Joi.number().positive().required()
      })
    ).optional(),
    diagnosis: Joi.string().optional(),
    treatmentSummary: Joi.string().optional(),
    doctorNotes: Joi.string().optional()
  }).required(),
  financialDetails: Joi.object({
    totalAmount: Joi.number().positive().required(),
    claimAmount: Joi.number().positive().required()
  }).required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  tags: Joi.array().items(Joi.string()).optional(),
  internalNotes: Joi.string().optional()
});

const updateClaimSchema = Joi.object({
  treatmentDetails: Joi.object({
    treatmentDate: Joi.date().optional(),
    treatmentType: Joi.string().optional(),
    treatmentCodes: Joi.array().items(
      Joi.object({
        code: Joi.string().required(),
        description: Joi.string().required(),
        amount: Joi.number().positive().required()
      })
    ).optional(),
    diagnosis: Joi.string().optional(),
    treatmentSummary: Joi.string().optional(),
    doctorNotes: Joi.string().optional()
  }).optional(),
  financialDetails: Joi.object({
    totalAmount: Joi.number().positive().optional(),
    claimAmount: Joi.number().positive().optional()
  }).optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  internalNotes: Joi.string().optional()
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'PARTIALLY_APPROVED',
    'REJECTED',
    'SETTLED',
    'CANCELLED'
  ).required(),
  notes: Joi.string().optional(),
  insurerRemarks: Joi.string().optional(),
  // Status-specific fields
  reviewerName: Joi.string().when('status', {
    is: 'UNDER_REVIEW',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  approvedBy: Joi.string().when('status', {
    is: Joi.valid('APPROVED', 'PARTIALLY_APPROVED'),
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  approvedAmount: Joi.number().positive().when('status', {
    is: Joi.valid('APPROVED', 'PARTIALLY_APPROVED'),
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  reference: Joi.string().when('status', {
    is: Joi.valid('APPROVED', 'PARTIALLY_APPROVED', 'SETTLED'),
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  partialReason: Joi.string().when('status', {
    is: 'PARTIALLY_APPROVED',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  reason: Joi.string().when('status', {
    is: 'REJECTED',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  code: Joi.string().when('status', {
    is: 'REJECTED',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  appealDeadline: Joi.date().when('status', {
    is: 'REJECTED',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  canResubmit: Joi.boolean().when('status', {
    is: 'REJECTED',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  settledAmount: Joi.number().positive().when('status', {
    is: 'SETTLED',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  }),
  method: Joi.string().valid('bank_transfer', 'check', 'direct_payment', 'adjustment').when('status', {
    is: 'SETTLED',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  })
});

const submitClaimSchema = Joi.object({
  method: Joi.string().valid('manual', 'api', 'portal', 'email').default('manual'),
  reference: Joi.string().optional(),
  acknowledgmentNumber: Joi.string().optional()
});

const resubmitClaimSchema = Joi.object({
  reason: Joi.string().required(),
  changes: Joi.string().optional(),
  method: Joi.string().valid('manual', 'api', 'portal', 'email').default('manual'),
  reference: Joi.string().optional()
});

const claimIdSchema = Joi.object({
  claimId: Joi.string().required()
});

const patientIdSchema = Joi.object({
  patientId: Joi.string().required()
});

const invoiceIdSchema = Joi.object({
  invoiceId: Joi.string().required()
});

const claimsQuerySchema = Joi.object({
  status: Joi.string().valid(
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'PARTIALLY_APPROVED',
    'REJECTED',
    'SETTLED',
    'CANCELLED'
  ).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'claimAmount', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  insurer: Joi.string().optional()
});

module.exports = {
  createClaimSchema,
  updateClaimSchema,
  updateStatusSchema,
  submitClaimSchema,
  resubmitClaimSchema,
  claimIdSchema,
  patientIdSchema,
  invoiceIdSchema,
  claimsQuerySchema
};