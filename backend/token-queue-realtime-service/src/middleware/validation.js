const Joi = require('joi');
const logger = require('../utils/logger');

// Token generation validation schema
const tokenGenerationSchema = Joi.object({
  patientId: Joi.string().required(),
  patientName: Joi.string().required(),
  patientPhone: Joi.string().required(),
  doctorId: Joi.string().required(),
  doctorName: Joi.string().required(),
  departmentId: Joi.string().required(),
  departmentName: Joi.string().required(),
  branchId: Joi.string().required(),
  tenantId: Joi.string().required(),
  tokenType: Joi.string().valid('APPOINTMENT', 'WALK_IN', 'PRIORITY').default('WALK_IN'),
  appointmentId: Joi.string().optional(),
  scheduledTime: Joi.date().optional()
});

// Check-in validation schema
const checkinSchema = Joi.object({
  qrData: Joi.string().when('nfcData', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  nfcData: Joi.alternatives().try(
    Joi.string(),
    Joi.object()
  ).optional(),
  location: Joi.string().default('Reception'),
  device: Joi.string().optional(),
  reason: Joi.string().optional()
});

// Validation middleware factory
const createValidationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      logger.warn('Validation error:', errorMessages);
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessages
      });
    }

    req.body = value;
    next();
  };
};

// Export validation middlewares
const validateTokenGeneration = createValidationMiddleware(tokenGenerationSchema);
const validateCheckin = createValidationMiddleware(checkinSchema);

// Custom validation functions
const validateQueueAccess = (userRole, branchId, userBranchId) => {
  if (userRole === 'CENTRAL_ADMIN') return true;
  if (userRole === 'BRANCH_ADMIN' && branchId === userBranchId) return true;
  if (['DOCTOR', 'RECEPTIONIST'].includes(userRole) && branchId === userBranchId) return true;
  return false;
};

const validateDoctorAccess = (userRole, userId, doctorId) => {
  if (['CENTRAL_ADMIN', 'BRANCH_ADMIN'].includes(userRole)) return true;
  if (userRole === 'DOCTOR' && userId === doctorId) return true;
  return false;
};

module.exports = {
  validateTokenGeneration,
  validateCheckin,
  validateQueueAccess,
  validateDoctorAccess,
  createValidationMiddleware
};