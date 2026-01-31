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
      tenantId: req.tenantId,
      userId: req.userId,
      category: 'validation'
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
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(endDate);
        if (end <= start) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'value', 'period', 'metric'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('ID must be a valid UUID'),
  
  handleValidationErrors
];

const validateTenantId = [
  param('tenantId')
    .optional()
    .isUUID()
    .withMessage('Tenant ID must be a valid UUID'),
  
  handleValidationErrors
];

const validateBranchId = [
  param('branchId')
    .optional()
    .isUUID()
    .withMessage('Branch ID must be a valid UUID'),
  
  handleValidationErrors
];

// Dashboard validation
const validateDashboardRequest = [
  query('role')
    .optional()
    .isIn(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTS_MANAGER', 'DOCTOR'])
    .withMessage('Invalid role'),
  
  query('branchId')
    .optional()
    .isUUID()
    .withMessage('Branch ID must be a valid UUID'),
  
  query('refresh')
    .optional()
    .isBoolean()
    .withMessage('Refresh must be a boolean'),
  
  handleValidationErrors
];

// KPI validation
const validateKPIRequest = [
  query('metrics')
    .optional()
    .isArray()
    .withMessage('Metrics must be an array'),
  
  query('metrics.*')
    .optional()
    .isIn([
      'DAILY_REVENUE',
      'PATIENT_FOOTFALL',
      'APPOINTMENT_COMPLETION_RATE',
      'AVERAGE_WAIT_TIME',
      'STAFF_UTILIZATION',
      'INVENTORY_TURNOVER',
      'INSURANCE_APPROVAL_RATE',
      'PATIENT_SATISFACTION'
    ])
    .withMessage('Invalid metric type'),
  
  query('period')
    .optional()
    .isIn(['today', 'week', 'month', 'quarter', 'year', 'custom'])
    .withMessage('Invalid period'),
  
  query('branchId')
    .optional()
    .isUUID()
    .withMessage('Branch ID must be a valid UUID'),
  
  handleValidationErrors
];

// Report validation
const validateReportRequest = [
  body('reportType')
    .notEmpty()
    .withMessage('Report type is required')
    .isIn([
      'OPERATIONAL_SUMMARY',
      'FINANCIAL_SUMMARY',
      'HR_PAYROLL_SUMMARY',
      'INVENTORY_EXPIRY',
      'PATIENT_ANALYTICS',
      'APPOINTMENT_ANALYTICS',
      'REVENUE_ANALYTICS',
      'STAFF_PERFORMANCE'
    ])
    .withMessage('Invalid report type'),
  
  body('format')
    .optional()
    .isIn(['PDF', 'CSV', 'EXCEL'])
    .withMessage('Invalid report format'),
  
  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object'),
  
  body('parameters.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  body('parameters.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  body('parameters.branchId')
    .optional()
    .isUUID()
    .withMessage('Branch ID must be a valid UUID'),
  
  body('parameters.includeCharts')
    .optional()
    .isBoolean()
    .withMessage('Include charts must be a boolean'),
  
  handleValidationErrors
];

// Data ingestion validation
const validateDataIngestion = [
  body('sourceService')
    .notEmpty()
    .withMessage('Source service is required')
    .isIn([
      'appointment-scheduling-service',
      'billing-payment-service',
      'lab-diagnostics-service',
      'payroll-hr-service',
      'inventory-pharmacy-service',
      'token-queue-realtime-service',
      'nursing-care-service',
      'ai-diagnosis-service'
    ])
    .withMessage('Invalid source service'),
  
  body('dataType')
    .notEmpty()
    .withMessage('Data type is required')
    .isIn([
      'APPOINTMENT',
      'BILLING',
      'LAB_RESULT',
      'PAYROLL',
      'INVENTORY',
      'QUEUE_TOKEN',
      'NURSING_RECORD',
      'AI_DIAGNOSIS'
    ])
    .withMessage('Invalid data type'),
  
  body('data')
    .notEmpty()
    .withMessage('Data is required')
    .isArray()
    .withMessage('Data must be an array'),
  
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date'),
  
  body('batchId')
    .optional()
    .isUUID()
    .withMessage('Batch ID must be a valid UUID'),
  
  handleValidationErrors
];

// Metric snapshot validation
const validateMetricSnapshot = [
  body('metric')
    .notEmpty()
    .withMessage('Metric name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Metric name must be between 3 and 100 characters'),
  
  body('value')
    .notEmpty()
    .withMessage('Metric value is required')
    .isNumeric()
    .withMessage('Metric value must be numeric'),
  
  body('period')
    .notEmpty()
    .withMessage('Period is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Period must be in YYYY-MM-DD format'),
  
  body('branchId')
    .optional()
    .isUUID()
    .withMessage('Branch ID must be a valid UUID'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  
  handleValidationErrors
];

// Dashboard configuration validation
const validateDashboardConfig = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTS_MANAGER', 'DOCTOR'])
    .withMessage('Invalid role'),
  
  body('dashboardType')
    .notEmpty()
    .withMessage('Dashboard type is required')
    .isIn(['OPERATIONAL', 'FINANCIAL', 'CLINICAL', 'HR', 'INVENTORY'])
    .withMessage('Invalid dashboard type'),
  
  body('widgets')
    .notEmpty()
    .withMessage('Widgets are required')
    .isArray()
    .withMessage('Widgets must be an array'),
  
  body('widgets.*.type')
    .notEmpty()
    .withMessage('Widget type is required')
    .isIn(['CHART', 'KPI', 'TABLE', 'GAUGE', 'MAP'])
    .withMessage('Invalid widget type'),
  
  body('widgets.*.config')
    .notEmpty()
    .withMessage('Widget config is required')
    .isObject()
    .withMessage('Widget config must be an object'),
  
  body('refreshInterval')
    .optional()
    .isInt({ min: 30, max: 3600 })
    .withMessage('Refresh interval must be between 30 and 3600 seconds'),
  
  handleValidationErrors
];

// Prediction request validation
const validatePredictionRequest = [
  body('predictionType')
    .notEmpty()
    .withMessage('Prediction type is required')
    .isIn([
      'PATIENT_LOAD',
      'PEAK_HOURS',
      'INVENTORY_SHORTAGE',
      'REVENUE_FORECAST',
      'STAFF_REQUIREMENT'
    ])
    .withMessage('Invalid prediction type'),
  
  body('timeHorizon')
    .optional()
    .isIn(['1_DAY', '1_WEEK', '1_MONTH', '3_MONTHS'])
    .withMessage('Invalid time horizon'),
  
  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object'),
  
  body('branchId')
    .optional()
    .isUUID()
    .withMessage('Branch ID must be a valid UUID'),
  
  handleValidationErrors
];

// Custom validation for date range limits
const validateDateRangeLimit = (maxDays = 365) => {
  return [
    query('startDate')
      .optional()
      .custom((startDate, { req }) => {
        if (startDate && req.query.endDate) {
          const start = new Date(startDate);
          const end = new Date(req.query.endDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > maxDays) {
            throw new Error(`Date range cannot exceed ${maxDays} days`);
          }
        }
        return true;
      }),
    
    handleValidationErrors
  ];
};

module.exports = {
  handleValidationErrors,
  validateDateRange,
  validatePagination,
  validateUUID,
  validateTenantId,
  validateBranchId,
  validateDashboardRequest,
  validateKPIRequest,
  validateReportRequest,
  validateDataIngestion,
  validateMetricSnapshot,
  validateDashboardConfig,
  validatePredictionRequest,
  validateDateRangeLimit
};