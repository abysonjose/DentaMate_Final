const Joi = require('joi');

const tenantCreationSchema = Joi.object({
  organizationName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Organization name is required',
      'string.min': 'Organization name must be at least 2 characters',
      'string.max': 'Organization name cannot exceed 200 characters'
    }),

  industryType: Joi.string()
    .valid('DENTAL', 'MEDICAL', 'VETERINARY')
    .default('DENTAL'),

  subscriptionType: Joi.string()
    .valid('BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM')
    .default('BASIC'),

  owner: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Owner name is required',
        'string.min': 'Owner name must be at least 2 characters',
        'string.max': 'Owner name cannot exceed 100 characters'
      }),

    email: Joi.string()
      .email()
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Owner email is required'
      }),

    phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{10,15}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
        'string.empty': 'Owner phone is required'
      }),

    roles: Joi.array()
      .items(Joi.string().valid('CENTRAL_ADMIN', 'DOCTOR', 'OWNER'))
      .default(['OWNER'])
  }).required(),

  contactInfo: Joi.object({
    address: Joi.object({
      street: Joi.string().trim().allow(''),
      city: Joi.string().trim().allow(''),
      state: Joi.string().trim().allow(''),
      country: Joi.string().trim().default('India'),
      zipCode: Joi.string().trim().allow('')
    }),
    website: Joi.string().uri().allow(''),
    taxId: Joi.string().trim().allow(''),
    registrationNumber: Joi.string().trim().allow('')
  }),

  configuration: Joi.object({
    enabledModules: Joi.array()
      .items(Joi.string().valid(
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS', 
        'OCR_PRESCRIPTION', 'BILLING', 'INVENTORY', 
        'ANALYTICS', 'NOTIFICATIONS', 'AUDIT_LOGS'
      )),

    appointmentRules: Joi.object({
      maxAdvanceBookingDays: Joi.number().integer().min(1).max(365).default(30),
      minBookingNoticeHours: Joi.number().integer().min(0).max(72).default(2),
      allowCancellationHours: Joi.number().integer().min(0).max(168).default(24),
      maxAppointmentsPerDay: Joi.number().integer().min(1).max(500).default(50)
    }),

    tokenRules: Joi.object({
      enableQRCheckin: Joi.boolean().default(true),
      enableNFCCheckin: Joi.boolean().default(false),
      autoAdvanceQueue: Joi.boolean().default(true),
      maxWaitingTokens: Joi.number().integer().min(1).max(100).default(20)
    }),

    featureFlags: Joi.object().pattern(
      Joi.string(),
      Joi.boolean()
    )
  }),

  limits: Joi.object({
    maxBranches: Joi.number().integer().min(1).max(100).default(1),
    maxUsers: Joi.number().integer().min(1).max(1000).default(10),
    maxAppointmentsPerMonth: Joi.number().integer().min(100).max(100000).default(1000),
    storageQuotaGB: Joi.number().integer().min(1).max(1000).default(5)
  }),

  subscription: Joi.object({
    planId: Joi.string().allow(''),
    startDate: Joi.date(),
    endDate: Joi.date(),
    billingCycle: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY').default('MONTHLY'),
    autoRenew: Joi.boolean().default(true)
  }),

  metadata: Joi.object({
    timezone: Joi.string().default('Asia/Kolkata'),
    locale: Joi.string().default('en-IN'),
    currency: Joi.string().default('INR'),
    dateFormat: Joi.string().default('DD/MM/YYYY'),
    timeFormat: Joi.string().valid('12h', '24h').default('24h')
  }),

  // Optional main branch data
  mainBranch: Joi.object({
    branchName: Joi.string().trim().min(2).max(200),
    address: Joi.object({
      street: Joi.string().trim().required(),
      area: Joi.string().trim().allow(''),
      city: Joi.string().trim().required(),
      state: Joi.string().trim().required(),
      country: Joi.string().trim().default('India'),
      zipCode: Joi.string().trim().required(),
      landmark: Joi.string().trim().allow('')
    }).required(),
    contactInfo: Joi.object({
      phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/).required(),
      email: Joi.string().email().allow(''),
      emergencyContact: Joi.string().allow('')
    }).required()
  })
});

const tenantUpdateSchema = Joi.object({
  organizationName: Joi.string()
    .trim()
    .min(2)
    .max(200),

  industryType: Joi.string()
    .valid('DENTAL', 'MEDICAL', 'VETERINARY'),

  subscriptionType: Joi.string()
    .valid('BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'),

  owner: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    email: Joi.string().email().lowercase(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/),
    roles: Joi.array().items(Joi.string().valid('CENTRAL_ADMIN', 'DOCTOR', 'OWNER'))
  }),

  contactInfo: Joi.object({
    address: Joi.object({
      street: Joi.string().trim().allow(''),
      city: Joi.string().trim().allow(''),
      state: Joi.string().trim().allow(''),
      country: Joi.string().trim(),
      zipCode: Joi.string().trim().allow('')
    }),
    website: Joi.string().uri().allow(''),
    taxId: Joi.string().trim().allow(''),
    registrationNumber: Joi.string().trim().allow('')
  }),

  limits: Joi.object({
    maxBranches: Joi.number().integer().min(1).max(100),
    maxUsers: Joi.number().integer().min(1).max(1000),
    maxAppointmentsPerMonth: Joi.number().integer().min(100).max(100000),
    storageQuotaGB: Joi.number().integer().min(1).max(1000)
  }),

  subscription: Joi.object({
    planId: Joi.string().allow(''),
    startDate: Joi.date(),
    endDate: Joi.date(),
    billingCycle: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY'),
    autoRenew: Joi.boolean()
  }),

  metadata: Joi.object({
    timezone: Joi.string(),
    locale: Joi.string(),
    currency: Joi.string(),
    dateFormat: Joi.string(),
    timeFormat: Joi.string().valid('12h', '24h')
  })
}).min(1); // At least one field must be provided

const tenantConfigurationSchema = Joi.object({
  enabledModules: Joi.array()
    .items(Joi.string().valid(
      'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS', 
      'OCR_PRESCRIPTION', 'BILLING', 'INVENTORY', 
      'ANALYTICS', 'NOTIFICATIONS', 'AUDIT_LOGS'
    )),

  appointmentRules: Joi.object({
    maxAdvanceBookingDays: Joi.number().integer().min(1).max(365),
    minBookingNoticeHours: Joi.number().integer().min(0).max(72),
    allowCancellationHours: Joi.number().integer().min(0).max(168),
    maxAppointmentsPerDay: Joi.number().integer().min(1).max(500)
  }),

  tokenRules: Joi.object({
    enableQRCheckin: Joi.boolean(),
    enableNFCCheckin: Joi.boolean(),
    autoAdvanceQueue: Joi.boolean(),
    maxWaitingTokens: Joi.number().integer().min(1).max(100)
  }),

  featureFlags: Joi.object().pattern(
    Joi.string(),
    Joi.boolean()
  )
}).min(1);

function validateTenantCreation(data) {
  return tenantCreationSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
}

function validateTenantUpdate(data) {
  return tenantUpdateSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
}

function validateTenantConfiguration(data) {
  return tenantConfigurationSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
}

module.exports = {
  validateTenantCreation,
  validateTenantUpdate,
  validateTenantConfiguration,
  tenantCreationSchema,
  tenantUpdateSchema,
  tenantConfigurationSchema
};