const Joi = require('joi');

const workingHoursSchema = Joi.object({
  isOpen: Joi.boolean().default(true),
  openTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('09:00'),
  closeTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('18:00'),
  breakStart: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
  breakEnd: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('')
});

const branchCreationSchema = Joi.object({
  branchName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Branch name is required',
      'string.min': 'Branch name must be at least 2 characters',
      'string.max': 'Branch name cannot exceed 200 characters'
    }),

  branchCode: Joi.string()
    .trim()
    .uppercase()
    .min(2)
    .max(10)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      'string.empty': 'Branch code is required',
      'string.pattern.base': 'Branch code must contain only uppercase letters and numbers',
      'string.min': 'Branch code must be at least 2 characters',
      'string.max': 'Branch code cannot exceed 10 characters'
    }),

  branchType: Joi.string()
    .valid('MAIN', 'BRANCH', 'CLINIC', 'SATELLITE')
    .default('BRANCH'),

  address: Joi.object({
    street: Joi.string()
      .trim()
      .required()
      .messages({
        'string.empty': 'Street address is required'
      }),
    area: Joi.string().trim().allow(''),
    city: Joi.string()
      .trim()
      .required()
      .messages({
        'string.empty': 'City is required'
      }),
    state: Joi.string()
      .trim()
      .required()
      .messages({
        'string.empty': 'State is required'
      }),
    country: Joi.string()
      .trim()
      .default('India'),
    zipCode: Joi.string()
      .trim()
      .required()
      .messages({
        'string.empty': 'ZIP code is required'
      }),
    landmark: Joi.string().trim().allow(''),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    })
  }).required(),

  contactInfo: Joi.object({
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{10,15}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
        'string.empty': 'Phone number is required'
      }),
    email: Joi.string()
      .email()
      .lowercase()
      .allow('')
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    website: Joi.string().uri().allow(''),
    emergencyContact: Joi.string().trim().allow('')
  }).required(),

  operationalInfo: Joi.object({
    timezone: Joi.string().default('Asia/Kolkata'),
    workingHours: Joi.object({
      monday: workingHoursSchema,
      tuesday: workingHoursSchema,
      wednesday: workingHoursSchema,
      thursday: workingHoursSchema,
      friday: workingHoursSchema,
      saturday: workingHoursSchema,
      sunday: workingHoursSchema
    }),
    holidays: Joi.array().items(
      Joi.object({
        date: Joi.date().required(),
        name: Joi.string().required(),
        type: Joi.string().valid('NATIONAL', 'REGIONAL', 'BRANCH').default('BRANCH')
      })
    )
  }),

  departments: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      code: Joi.string().uppercase().required(),
      description: Joi.string().allow(''),
      isActive: Joi.boolean().default(true),
      rooms: Joi.array().items(
        Joi.object({
          roomNumber: Joi.string().required(),
          roomName: Joi.string().allow(''),
          roomType: Joi.string()
            .valid('CONSULTATION', 'TREATMENT', 'SURGERY', 'XRAY', 'LAB', 'WAITING')
            .default('CONSULTATION'),
          capacity: Joi.number().integer().min(1).default(1),
          equipment: Joi.array().items(Joi.string()),
          isActive: Joi.boolean().default(true)
        })
      )
    })
  ),

  branchAdmin: Joi.object({
    userId: Joi.string(),
    name: Joi.string(),
    email: Joi.string().email(),
    phone: Joi.string()
  }),

  configuration: Joi.object({
    enabledServices: Joi.array().items(
      Joi.string().valid(
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'BILLING', 
        'INVENTORY', 'LAB_SERVICES', 'PHARMACY'
      )
    ),
    appointmentSlotDuration: Joi.number().integer().min(15).max(120).default(30),
    maxDailyAppointments: Joi.number().integer().min(1).max(500).default(50),
    enableWalkIns: Joi.boolean().default(true),
    autoConfirmAppointments: Joi.boolean().default(false)
  })
});

const branchUpdateSchema = Joi.object({
  branchName: Joi.string()
    .trim()
    .min(2)
    .max(200),

  branchType: Joi.string()
    .valid('MAIN', 'BRANCH', 'CLINIC', 'SATELLITE'),

  address: Joi.object({
    street: Joi.string().trim(),
    area: Joi.string().trim().allow(''),
    city: Joi.string().trim(),
    state: Joi.string().trim(),
    country: Joi.string().trim(),
    zipCode: Joi.string().trim(),
    landmark: Joi.string().trim().allow(''),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    })
  }),

  contactInfo: Joi.object({
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/),
    email: Joi.string().email().lowercase().allow(''),
    website: Joi.string().uri().allow(''),
    emergencyContact: Joi.string().trim().allow('')
  }),

  operationalInfo: Joi.object({
    timezone: Joi.string(),
    workingHours: Joi.object({
      monday: workingHoursSchema,
      tuesday: workingHoursSchema,
      wednesday: workingHoursSchema,
      thursday: workingHoursSchema,
      friday: workingHoursSchema,
      saturday: workingHoursSchema,
      sunday: workingHoursSchema
    }),
    holidays: Joi.array().items(
      Joi.object({
        date: Joi.date().required(),
        name: Joi.string().required(),
        type: Joi.string().valid('NATIONAL', 'REGIONAL', 'BRANCH').default('BRANCH')
      })
    )
  }),

  branchAdmin: Joi.object({
    userId: Joi.string(),
    name: Joi.string(),
    email: Joi.string().email(),
    phone: Joi.string()
  }),

  configuration: Joi.object({
    enabledServices: Joi.array().items(
      Joi.string().valid(
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'BILLING', 
        'INVENTORY', 'LAB_SERVICES', 'PHARMACY'
      )
    ),
    appointmentSlotDuration: Joi.number().integer().min(15).max(120),
    maxDailyAppointments: Joi.number().integer().min(1).max(500),
    enableWalkIns: Joi.boolean(),
    autoConfirmAppointments: Joi.boolean()
  })
}).min(1); // At least one field must be provided

const departmentSchema = Joi.object({
  name: Joi.string()
    .required()
    .messages({
      'string.empty': 'Department name is required'
    }),
  code: Joi.string()
    .uppercase()
    .required()
    .messages({
      'string.empty': 'Department code is required'
    }),
  description: Joi.string().allow(''),
  isActive: Joi.boolean().default(true)
});

const roomSchema = Joi.object({
  roomNumber: Joi.string()
    .required()
    .messages({
      'string.empty': 'Room number is required'
    }),
  roomName: Joi.string().allow(''),
  roomType: Joi.string()
    .valid('CONSULTATION', 'TREATMENT', 'SURGERY', 'XRAY', 'LAB', 'WAITING')
    .default('CONSULTATION'),
  capacity: Joi.number().integer().min(1).default(1),
  equipment: Joi.array().items(Joi.string()).default([]),
  isActive: Joi.boolean().default(true)
});

const branchAdminSchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      'string.empty': 'User ID is required'
    }),
  name: Joi.string()
    .required()
    .messages({
      'string.empty': 'Name is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]{10,15}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
});

function validateBranchCreation(data) {
  return branchCreationSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
}

function validateBranchUpdate(data) {
  return branchUpdateSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
}

function validateDepartment(data) {
  return departmentSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
}

function validateRoom(data) {
  return roomSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
}

function validateBranchAdmin(data) {
  return branchAdminSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
}

module.exports = {
  validateBranchCreation,
  validateBranchUpdate,
  validateDepartment,
  validateRoom,
  validateBranchAdmin,
  branchCreationSchema,
  branchUpdateSchema,
  departmentSchema,
  roomSchema,
  branchAdminSchema
};