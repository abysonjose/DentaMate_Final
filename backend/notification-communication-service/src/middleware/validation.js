const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      path: req.path,
      method: req.method,
      tenantId: req.tenantId
    });
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
const validateNotificationSend = [
  body('recipientId')
    .notEmpty()
    .withMessage('Recipient ID is required')
    .isUUID()
    .withMessage('Recipient ID must be a valid UUID'),
  
  body('templateCode')
    .notEmpty()
    .withMessage('Template code is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Template code must be between 3 and 50 characters')
    .matches(/^[A-Z_]+$/)
    .withMessage('Template code must contain only uppercase letters and underscores'),
  
  body('channel')
    .notEmpty()
    .withMessage('Channel is required')
    .isIn(['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'])
    .withMessage('Invalid channel type'),
  
  body('variables')
    .optional()
    .isObject()
    .withMessage('Variables must be an object'),
  
  body('priority')
    .optional()
    .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority level'),
  
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled time must be a valid ISO 8601 date'),
  
  handleValidationErrors
];

const validateBulkNotification = [
  body('recipients')
    .isArray({ min: 1, max: 100 })
    .withMessage('Recipients must be an array with 1-100 items'),
  
  body('recipients.*.recipientId')
    .notEmpty()
    .withMessage('Each recipient must have an ID')
    .isUUID()
    .withMessage('Recipient ID must be a valid UUID'),
  
  body('templateCode')
    .notEmpty()
    .withMessage('Template code is required')
    .matches(/^[A-Z_]+$/)
    .withMessage('Template code must contain only uppercase letters and underscores'),
  
  body('channel')
    .notEmpty()
    .withMessage('Channel is required')
    .isIn(['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'])
    .withMessage('Invalid channel type'),
  
  handleValidationErrors
];

const validateTemplateCreate = [
  body('templateCode')
    .notEmpty()
    .withMessage('Template code is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Template code must be between 3 and 50 characters')
    .matches(/^[A-Z_]+$/)
    .withMessage('Template code must contain only uppercase letters and underscores'),
  
  body('name')
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Template name must be between 3 and 100 characters'),
  
  body('channel')
    .notEmpty()
    .withMessage('Channel is required')
    .isIn(['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'])
    .withMessage('Invalid channel type'),
  
  body('content')
    .notEmpty()
    .withMessage('Template content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Template content must be between 1 and 5000 characters'),
  
  body('subject')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Subject must not exceed 200 characters'),
  
  body('language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'hi', 'ar'])
    .withMessage('Invalid language code'),
  
  body('variables')
    .optional()
    .isArray()
    .withMessage('Variables must be an array'),
  
  handleValidationErrors
];

const validateEventTrigger = [
  body('eventType')
    .notEmpty()
    .withMessage('Event type is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Event type must be between 3 and 50 characters'),
  
  body('entityId')
    .notEmpty()
    .withMessage('Entity ID is required')
    .isUUID()
    .withMessage('Entity ID must be a valid UUID'),
  
  body('eventData')
    .notEmpty()
    .withMessage('Event data is required')
    .isObject()
    .withMessage('Event data must be an object'),
  
  body('recipientIds')
    .optional()
    .isArray()
    .withMessage('Recipient IDs must be an array'),
  
  body('recipientIds.*')
    .optional()
    .isUUID()
    .withMessage('Each recipient ID must be a valid UUID'),
  
  handleValidationErrors
];

const validatePreferencesUpdate = [
  body('preferences')
    .notEmpty()
    .withMessage('Preferences are required')
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.channels')
    .optional()
    .isObject()
    .withMessage('Channel preferences must be an object'),
  
  body('preferences.notificationTypes')
    .optional()
    .isObject()
    .withMessage('Notification type preferences must be an object'),
  
  handleValidationErrors
];

const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('ID must be a valid UUID'),
  
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'status', 'channel'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateNotificationSend,
  validateBulkNotification,
  validateTemplateCreate,
  validateEventTrigger,
  validatePreferencesUpdate,
  validateUUID,
  validatePagination
};