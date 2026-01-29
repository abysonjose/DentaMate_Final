const Joi = require('joi');
const logger = require('../utils/logger');

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation error:', {
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

      req.validatedData = value;
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Validation service error'
      });
    }
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Query validation failed',
          errors: errorDetails
        });
      }

      req.validatedQuery = value;
      next();
    } catch (error) {
      logger.error('Query validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Query validation service error'
      });
    }
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Parameter validation failed',
          errors: errorDetails
        });
      }

      req.validatedParams = value;
      next();
    } catch (error) {
      logger.error('Parameter validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Parameter validation service error'
      });
    }
  };
};

module.exports = {
  validateRequest,
  validateQuery,
  validateParams
};