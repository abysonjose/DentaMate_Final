const Joi = require('joi');
const logger = require('../utils/logger');

class ValidationMiddleware {
  static validateRequest(schema) {
    return (req, res, next) => {
      try {
        const validationSchema = Joi.object(schema);
        const dataToValidate = {};

        // Extract data based on schema keys
        if (schema.body) {
          dataToValidate.body = req.body;
        }
        if (schema.params) {
          dataToValidate.params = req.params;
        }
        if (schema.query) {
          dataToValidate.query = req.query;
        }
        if (schema.headers) {
          dataToValidate.headers = req.headers;
        }

        const { error, value } = validationSchema.validate(dataToValidate, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });

        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Validation error:', {
            path: req.path,
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

        // Update request with validated data
        if (value.body) req.body = value.body;
        if (value.params) req.params = value.params;
        if (value.query) req.query = value.query;

        next();
      } catch (error) {
        logger.error('Validation middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Validation processing failed'
        });
      }
    };
  }

  static validateTenantId(req, res, next) {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    if (!tenantId.startsWith('tenant_')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant ID format'
      });
    }

    next();
  }

  static validateBranchId(req, res, next) {
    const { branchId } = req.params;
    
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    if (!branchId.startsWith('branch_')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch ID format'
      });
    }

    next();
  }

  static validatePagination(req, res, next) {
    const { limit, skip } = req.query;

    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Limit must be a number between 1 and 100'
        });
      }
      req.query.limit = limitNum;
    }

    if (skip !== undefined) {
      const skipNum = parseInt(skip);
      if (isNaN(skipNum) || skipNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Skip must be a non-negative number'
        });
      }
      req.query.skip = skipNum;
    }

    next();
  }

  static validateSearchQuery(req, res, next) {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query (q) is required'
      });
    }

    if (typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    if (q.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Search query cannot exceed 100 characters'
      });
    }

    // Sanitize search query
    req.query.q = q.trim();
    next();
  }

  static validateDateRange(req, res, next) {
    const { startDate, endDate } = req.query;

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format'
        });
      }
      req.query.startDate = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format'
        });
      }
      req.query.endDate = end;
    }

    if (startDate && endDate && req.query.startDate > req.query.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    next();
  }

  static sanitizeInput(req, res, next) {
    try {
      // Basic XSS protection - remove script tags and dangerous characters
      const sanitize = (obj) => {
        if (typeof obj === 'string') {
          return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
        }
        
        if (Array.isArray(obj)) {
          return obj.map(sanitize);
        }
        
        if (obj && typeof obj === 'object') {
          const sanitized = {};
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitize(value);
          }
          return sanitized;
        }
        
        return obj;
      };

      if (req.body) {
        req.body = sanitize(req.body);
      }
      
      if (req.query) {
        req.query = sanitize(req.query);
      }

      next();
    } catch (error) {
      logger.error('Input sanitization error:', error);
      res.status(500).json({
        success: false,
        message: 'Input processing failed'
      });
    }
  }

  static validateContentType(allowedTypes = ['application/json']) {
    return (req, res, next) => {
      if (req.method === 'GET' || req.method === 'DELETE') {
        return next();
      }

      const contentType = req.get('Content-Type');
      
      if (!contentType) {
        return res.status(400).json({
          success: false,
          message: 'Content-Type header is required'
        });
      }

      const isAllowed = allowedTypes.some(type => 
        contentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!isAllowed) {
        return res.status(415).json({
          success: false,
          message: `Unsupported content type. Allowed: ${allowedTypes.join(', ')}`
        });
      }

      next();
    };
  }

  static validateRequestSize(maxSize = '10mb') {
    return (req, res, next) => {
      const contentLength = req.get('Content-Length');
      
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength);
        const maxSizeInBytes = this.parseSize(maxSize);
        
        if (sizeInBytes > maxSizeInBytes) {
          return res.status(413).json({
            success: false,
            message: `Request too large. Maximum size: ${maxSize}`
          });
        }
      }

      next();
    };
  }

  static parseSize(size) {
    const units = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
    if (!match) return 10 * 1024 * 1024; // Default 10MB

    const [, number, unit] = match;
    return parseInt(number) * units[unit];
  }
}

module.exports = {
  validateRequest: ValidationMiddleware.validateRequest,
  validateTenantId: ValidationMiddleware.validateTenantId,
  validateBranchId: ValidationMiddleware.validateBranchId,
  validatePagination: ValidationMiddleware.validatePagination,
  validateSearchQuery: ValidationMiddleware.validateSearchQuery,
  validateDateRange: ValidationMiddleware.validateDateRange,
  sanitizeInput: ValidationMiddleware.sanitizeInput,
  validateContentType: ValidationMiddleware.validateContentType,
  validateRequestSize: ValidationMiddleware.validateRequestSize
};