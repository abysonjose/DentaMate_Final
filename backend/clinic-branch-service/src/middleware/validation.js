const logger = require('../utils/logger');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate({
        body: req.body,
        params: req.params,
        query: req.query
      }, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation error:', { errorDetails, path: req.path });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: errorDetails
        });
      }

      // Replace request data with validated data
      req.body = value.body || req.body;
      req.params = value.params || req.params;
      req.query = value.query || req.query;

      next();
    } catch (validationError) {
      logger.error('Validation middleware error:', validationError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Validation failed'
      });
    }
  };
};

const sanitizeInput = (req, res, next) => {
  try {
    // Basic XSS protection - remove script tags and dangerous characters
    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitize(obj[key]);
          }
        }
        return sanitized;
      }
      
      return obj;
    };

    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Input sanitization failed'
    });
  }
};

module.exports = {
  validate,
  sanitizeInput
};