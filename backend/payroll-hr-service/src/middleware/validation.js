const Joi = require('joi');
const logger = require('../utils/logger');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation failed', {
        endpoint: req.path,
        method: req.method,
        errors,
        userId: req.user?.userId
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, { 
      abortEarly: false 
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Parameter validation failed',
        errors
      });
    }

    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { 
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
        message: 'Query validation failed',
        errors
      });
    }

    next();
  };
};

// Common validation schemas
const commonSchemas = {
  tenantId: Joi.string().uuid().required(),
  branchId: Joi.string().uuid().required(),
  employeeId: Joi.string().uuid().required(),
  date: Joi.date().iso().required(),
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }
};

// Attendance validation schemas
const attendanceSchemas = {
  create: Joi.object({
    employeeId: commonSchemas.employeeId,
    date: commonSchemas.date,
    status: Joi.string().valid('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY').required(),
    checkInTime: Joi.date().iso().when('status', {
      is: 'PRESENT',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    checkOutTime: Joi.date().iso().when('status', {
      is: 'PRESENT',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    }),
    shiftId: Joi.string().uuid().optional(),
    leaveType: Joi.string().valid('PAID', 'UNPAID', 'EMERGENCY', 'SICK', 'CASUAL').when('status', {
      is: 'LEAVE',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    remarks: Joi.string().max(500).optional(),
    metadata: Joi.object({
      source: Joi.string().valid('MANUAL', 'QR', 'RFID', 'DEVICE').default('MANUAL'),
      deviceId: Joi.string().optional(),
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
      }).optional()
    }).optional()
  }),

  update: Joi.object({
    status: Joi.string().valid('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY').optional(),
    checkInTime: Joi.date().iso().optional(),
    checkOutTime: Joi.date().iso().optional(),
    leaveType: Joi.string().valid('PAID', 'UNPAID', 'EMERGENCY', 'SICK', 'CASUAL').optional(),
    remarks: Joi.string().max(500).optional()
  }),

  query: Joi.object({
    employeeId: Joi.string().uuid().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    status: Joi.string().valid('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY').optional(),
    month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Shift validation schemas
const shiftSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    type: Joi.string().valid('MORNING', 'EVENING', 'NIGHT', 'FULL_DAY', 'CUSTOM').required(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    breakDuration: Joi.number().min(0).max(4).default(0),
    workingDays: Joi.array().items(
      Joi.string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')
    ).min(1).required(),
    maxEmployees: Joi.number().integer().min(1).default(10),
    overtimeRules: Joi.object({
      enabled: Joi.boolean().default(false),
      thresholdHours: Joi.number().min(1).max(24).default(8),
      multiplier: Joi.number().min(1).default(1.5)
    }).optional()
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    breakDuration: Joi.number().min(0).max(4).optional(),
    workingDays: Joi.array().items(
      Joi.string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')
    ).min(1).optional(),
    maxEmployees: Joi.number().integer().min(1).optional(),
    isActive: Joi.boolean().optional(),
    overtimeRules: Joi.object({
      enabled: Joi.boolean(),
      thresholdHours: Joi.number().min(1).max(24),
      multiplier: Joi.number().min(1)
    }).optional()
  })
};

// Employee shift assignment validation schemas
const employeeShiftSchemas = {
  assign: Joi.object({
    employeeId: commonSchemas.employeeId,
    shiftId: Joi.string().uuid().required(),
    effectiveFrom: Joi.date().iso().required(),
    effectiveTo: Joi.date().iso().optional(),
    workingDays: Joi.array().items(
      Joi.string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')
    ).optional(),
    specialInstructions: Joi.string().max(500).optional(),
    metadata: Joi.object({
      reason: Joi.string().valid('NEW_HIRE', 'SHIFT_CHANGE', 'DEPARTMENT_TRANSFER', 'TEMPORARY', 'PERMANENT').default('PERMANENT'),
      isTemporary: Joi.boolean().default(false),
      originalShiftId: Joi.string().uuid().optional()
    }).optional()
  })
};

// Payroll validation schemas
const payrollSchemas = {
  run: Joi.object({
    month: commonSchemas.month,
    employeeIds: Joi.array().items(Joi.string().uuid()).optional(),
    recalculate: Joi.boolean().default(false)
  }),

  finalize: Joi.object({
    remarks: Joi.string().max(1000).optional()
  })
};

module.exports = {
  validate,
  validateParams,
  validateQuery,
  commonSchemas,
  attendanceSchemas,
  shiftSchemas,
  employeeShiftSchemas,
  payrollSchemas
};