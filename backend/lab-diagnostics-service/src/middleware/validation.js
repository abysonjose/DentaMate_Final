const Joi = require('joi');
const logger = require('../utils/logger');

class ValidationMiddleware {
  // Generic validation middleware
  static validate(schema, property = 'body') {
    return (req, res, next) => {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
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

      // Replace request data with validated and sanitized data
      req[property] = value;
      next();
    };
  }

  // Role validation middleware
  static validateRole(allowedRoles) {
    return (req, res, next) => {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  // Parameter validation middleware
  static validateOrderId(req, res, next) {
    const { orderId } = req.params;
    if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid order ID is required'
      });
    }
    next();
  }

  static validateUploadId(req, res, next) {
    const { uploadId } = req.params;
    if (!uploadId || typeof uploadId !== 'string' || uploadId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid upload ID is required'
      });
    }
    next();
  }

  static validateResultId(req, res, next) {
    const { resultId } = req.params;
    if (!resultId || typeof resultId !== 'string' || resultId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid result ID is required'
      });
    }
    next();
  }

  static validateAnalysisId(req, res, next) {
    const { analysisId } = req.params;
    if (!analysisId || typeof analysisId !== 'string' || analysisId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid analysis ID is required'
      });
    }
    next();
  }

  // File upload validation
  static validateFileUpload(req, res, next) {
    if (!req.file && !req.files) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const files = req.files || [req.file];
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default

    for (const file of files) {
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type ${file.mimetype} not allowed`,
          allowedTypes
        });
      }

      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size ${file.size} exceeds maximum allowed size ${maxSize}`,
          maxSize
        });
      }

      // Check for malicious file extensions
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (dangerousExtensions.includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          message: 'File type not allowed for security reasons'
        });
      }
    }

    next();
  }

  // Pagination validation
  static validatePagination(req, res, next) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const maxLimit = 100;

    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page number must be greater than 0'
      });
    }

    if (limit < 1 || limit > maxLimit) {
      return res.status(400).json({
        success: false,
        message: `Limit must be between 1 and ${maxLimit}`
      });
    }

    req.pagination = {
      page,
      limit,
      skip: (page - 1) * limit
    };

    next();
  }

  // Date range validation
  static validateDateRange(req, res, next) {
    const { startDate, endDate } = req.query;

    if (startDate && !Date.parse(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (endDate && !Date.parse(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format'
      });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    next();
  }
}

// Validation schemas
const ValidationSchemas = {
  // Diagnostic Order schemas
  createDiagnosticOrder: Joi.object({
    patientId: Joi.string().required(),
    appointmentId: Joi.string().required(),
    doctorId: Joi.string().required(),
    testType: Joi.string().valid(
      'XRAY', 'CBCT', 'MRI', 'DENTAL_SCAN', 'PANORAMIC', 
      'BITEWING', 'PERIAPICAL', 'CEPHALOMETRIC'
    ).required(),
    priority: Joi.string().valid('NORMAL', 'URGENT', 'STAT').default('NORMAL'),
    doctorNotes: Joi.string().max(1000).allow(''),
    estimatedCompletionTime: Joi.date().optional(),
    metadata: Joi.object({
      bodyPart: Joi.string().allow(''),
      technique: Joi.string().allow(''),
      contrast: Joi.boolean(),
      specialInstructions: Joi.string().allow('')
    }).optional()
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().valid('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').required(),
    notes: Joi.string().max(1000).allow('')
  }),

  assignOrder: Joi.object({
    labStaffId: Joi.string().required()
  }),

  // Upload schemas
  uploadMetadata: Joi.object({
    orderId: Joi.string().required(),
    category: Joi.string().valid('IMAGE', 'REPORT', 'SCAN', 'DOCUMENT').required(),
    replaces: Joi.string().optional()
  }),

  // Query parameter schemas
  orderFilters: Joi.object({
    status: Joi.string().valid('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
    testType: Joi.string().valid(
      'XRAY', 'CBCT', 'MRI', 'DENTAL_SCAN', 'PANORAMIC', 
      'BITEWING', 'PERIAPICAL', 'CEPHALOMETRIC'
    ),
    priority: Joi.string().valid('NORMAL', 'URGENT', 'STAT'),
    patientId: Joi.string(),
    doctorId: Joi.string(),
    assignedLabStaffId: Joi.string(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  // AI Result schemas
  reviewAIResult: Joi.object({
    approved: Joi.boolean().required(),
    reviewNotes: Joi.string().max(1000).allow('')
  }),

  aiCallback: Joi.object({
    analysisId: Joi.string().required(),
    status: Joi.string().valid('PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED').required(),
    results: Joi.object({
      confidence: Joi.number().min(0).max(1).optional(),
      findings: Joi.array().items(Joi.object({
        type: Joi.string().valid('CAVITY', 'BONE_LOSS', 'FRACTURE', 'ANOMALY', 'NORMAL', 'ARTIFACT').required(),
        location: Joi.object({
          tooth: Joi.string().optional(),
          quadrant: Joi.string().optional(),
          surface: Joi.string().optional(),
          coordinates: Joi.object({
            x: Joi.number().required(),
            y: Joi.number().required(),
            width: Joi.number().required(),
            height: Joi.number().required()
          }).optional()
        }).optional(),
        severity: Joi.string().valid('MILD', 'MODERATE', 'SEVERE', 'CRITICAL').optional(),
        confidence: Joi.number().min(0).max(1).optional(),
        description: Joi.string().optional(),
        measurements: Joi.object({
          area: Joi.number().optional(),
          depth: Joi.number().optional(),
          volume: Joi.number().optional(),
          unit: Joi.string().optional()
        }).optional()
      })).optional(),
      heatmapUrl: Joi.string().uri().optional(),
      annotatedImageUrl: Joi.string().uri().optional(),
      processingMetrics: Joi.object({
        processingTime: Joi.number().optional(),
        modelVersion: Joi.string().optional(),
        gpuUsed: Joi.boolean().optional(),
        memoryUsed: Joi.number().optional(),
        cpuTime: Joi.number().optional()
      }).optional(),
      qualityAssessment: Joi.object({
        imageQuality: Joi.string().valid('EXCELLENT', 'GOOD', 'FAIR', 'POOR').optional(),
        artifacts: Joi.array().items(Joi.string()).optional(),
        recommendations: Joi.array().items(Joi.string()).optional()
      }).optional()
    }).optional(),
    error: Joi.object({
      code: Joi.string().optional(),
      message: Joi.string().optional(),
      stack: Joi.string().optional()
    }).optional()
  }),

  // Patient access approval
  approvePatientAccess: Joi.object({
    approved: Joi.boolean().required(),
    notes: Joi.string().max(500).allow('')
  })
};

// Export convenience functions for route usage
module.exports = {
  ValidationMiddleware,
  ValidationSchemas,
  // Convenience exports for backward compatibility
  validateRole: ValidationMiddleware.validateRole,
  validateOrderId: ValidationMiddleware.validateOrderId,
  validateUploadId: ValidationMiddleware.validateUploadId,
  validateResultId: ValidationMiddleware.validateResultId,
  validateAnalysisId: ValidationMiddleware.validateAnalysisId,
  validateCreateOrder: ValidationMiddleware.validate(ValidationSchemas.createDiagnosticOrder),
  validateUpdateStatus: ValidationMiddleware.validate(ValidationSchemas.updateOrderStatus),
  validateAssignOrder: ValidationMiddleware.validate(ValidationSchemas.assignOrder),
  validateReviewResult: ValidationMiddleware.validate(ValidationSchemas.reviewAIResult),
  validateAICallback: ValidationMiddleware.validate(ValidationSchemas.aiCallback),
  validateGetOrders: ValidationMiddleware.validate(ValidationSchemas.orderFilters, 'query'),
  validateUpload: ValidationMiddleware.validate(ValidationSchemas.uploadMetadata)
};