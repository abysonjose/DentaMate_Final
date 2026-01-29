const Joi = require('joi');
const logger = require('../utils/logger');

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation failed', {
        endpoint: req.path,
        method: req.method,
        errors: errorDetails,
        userId: req.user?.userId
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails
      });
    }

    req[property] = value;
    next();
  };
};

// Common validation schemas
const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  optionalUuid: Joi.string().uuid().optional(),
  tenantId: Joi.string().uuid().required(),
  branchId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Case validation schemas
const caseSchemas = {
  createCase: Joi.object({
    patientId: commonSchemas.uuid,
    appointmentId: commonSchemas.uuid,
    caseType: Joi.string().valid('BRACES', 'ALIGNERS', 'RETAINERS').required(),
    priority: Joi.string().valid('NORMAL', 'URGENT').default('NORMAL'),
    doctorNotes: Joi.string().min(10).max(1000).required()
  }),

  updateCaseStatus: Joi.object({
    status: Joi.string().valid(
      'RECEIVED',
      'IN_REVIEW',
      'IN_FABRICATION',
      'QUALITY_CHECK',
      'READY',
      'DELIVERED'
    ).required(),
    notes: Joi.string().max(500).optional(),
    orthotistNotes: Joi.string().max(1000).optional(),
    fabricationDetails: Joi.object({
      applianceType: Joi.string().max(100).optional(),
      material: Joi.string().max(100).optional(),
      internalNotes: Joi.string().max(500).optional()
    }).optional()
  }),

  updateDeliveryDate: Joi.object({
    estimatedDeliveryDate: Joi.date().min('now').required(),
    notes: Joi.string().max(500).optional()
  }),

  assignOrthotist: Joi.object({
    orthotistId: commonSchemas.uuid
  }),

  getCases: Joi.object({
    patientId: commonSchemas.optionalUuid,
    doctorId: commonSchemas.optionalUuid,
    orthotistId: commonSchemas.optionalUuid,
    status: Joi.string().valid(
      'CREATED',
      'RECEIVED',
      'IN_REVIEW',
      'IN_FABRICATION',
      'QUALITY_CHECK',
      'READY',
      'DELIVERED'
    ).optional(),
    caseType: Joi.string().valid('BRACES', 'ALIGNERS', 'RETAINERS').optional(),
    priority: Joi.string().valid('NORMAL', 'URGENT').optional(),
    fromDate: Joi.date().optional(),
    toDate: Joi.date().optional(),
    ...commonSchemas.pagination
  })
};

// Measurement validation schemas
const measurementSchemas = {
  uploadMeasurement: Joi.object({
    caseId: commonSchemas.uuid,
    type: Joi.string().valid(
      'DENTAL_IMPRESSION',
      'INTRAORAL_SCAN',
      'XRAY_REFERENCE',
      'PHOTO',
      'OTHER'
    ).required(),
    description: Joi.string().max(500).optional(),
    metadata: Joi.object({
      scannerType: Joi.string().max(100).optional(),
      resolution: Joi.string().max(50).optional(),
      captureDate: Joi.date().optional(),
      technicalNotes: Joi.string().max(500).optional()
    }).optional()
  }),

  updateMeasurementStatus: Joi.object({
    status: Joi.string().valid('APPROVED', 'REJECTED', 'INCOMPLETE').required(),
    reviewNotes: Joi.string().max(500).optional()
  }),

  getMeasurements: Joi.object({
    caseId: commonSchemas.optionalUuid,
    type: Joi.string().valid(
      'DENTAL_IMPRESSION',
      'INTRAORAL_SCAN',
      'XRAY_REFERENCE',
      'PHOTO',
      'OTHER'
    ).optional(),
    status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'INCOMPLETE').optional(),
    latestOnly: Joi.boolean().default(true),
    ...commonSchemas.pagination
  })
};

// Issue validation schemas
const issueSchemas = {
  reportIssue: Joi.object({
    type: Joi.string().valid(
      'INCOMPLETE_MEASUREMENTS',
      'MATERIAL_ISSUES',
      'CLARIFICATION_NEEDED',
      'OTHER'
    ).required(),
    description: Joi.string().min(10).max(1000).required()
  }),

  updateIssue: Joi.object({
    status: Joi.string().valid('IN_PROGRESS', 'RESOLVED').required(),
    resolution: Joi.string().max(1000).optional()
  })
};

// File upload validation
const fileValidation = {
  validateFileUpload: (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    const file = req.file;
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/pdf',
      'application/dicom',
      'model/stl',
      'model/obj'
    ];

    const maxFileSize = 50 * 1024 * 1024; // 50MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Allowed types: JPEG, PNG, TIFF, PDF, DICOM, STL, OBJ'
      });
    }

    if (file.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 50MB'
      });
    }

    next();
  }
};

// Parameter validation
const paramValidation = {
  validateCaseId: validate(Joi.object({
    caseId: commonSchemas.uuid
  }), 'params'),

  validateMeasurementId: validate(Joi.object({
    measurementId: commonSchemas.uuid
  }), 'params'),

  validateIssueId: validate(Joi.object({
    caseId: commonSchemas.uuid,
    issueId: commonSchemas.uuid
  }), 'params')
};

module.exports = {
  validate,
  commonSchemas,
  caseSchemas,
  measurementSchemas,
  issueSchemas,
  fileValidation,
  paramValidation
};