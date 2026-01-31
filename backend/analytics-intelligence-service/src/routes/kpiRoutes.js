const express = require('express');
const router = express.Router();
const KPIService = require('../services/KPIService');
const { 
  authenticateToken, 
  validateAnalyticsAccess, 
  validateDataScope,
  validateBranchAccess 
} = require('../middleware/auth');
const { 
  validateKPIRequest,
  validateDateRange,
  validatePagination,
  validateBranchId 
} = require('../middleware/validation');
const logger = require('../utils/logger');

const kpiService = new KPIService();

// Get KPIs
router.get('/',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validateKPIRequest,
  validateDateRange,
  async (req, res) => {
    try {
      const {
        metrics = [],
        period = 'today',
        branchId,
        refresh = false
      } = req.query;

      // Validate branch access
      if (branchId && req.dataScope.level === 'BRANCH' && !req.dataScope.branchIds.includes(branchId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Branch not accessible'
        });
      }

      // Parse metrics array if it's a string
      const metricsArray = Array.isArray(metrics) ? metrics : 
                          typeof metrics === 'string' ? metrics.split(',') : [];

      const result = await kpiService.getKPIs(req.tenantId, {
        branchId: branchId || (req.dataScope.level === 'BRANCH' ? req.branchId : undefined),
        metrics: metricsArray,
        period,
        refresh: refresh === 'true',
        role: req.role,
        startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
      });

      logger.info('KPIs retrieved successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        role: req.role,
        metricsCount: metricsArray.length,
        period,
        branchId,
        category: 'kpi'
      });

      res.json(result);

    } catch (error) {
      logger.error('Error retrieving KPIs', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        query: req.query,
        category: 'kpi'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve KPIs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get specific KPI
router.get('/:metric',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validateDateRange,
  async (req, res) => {
    try {
      const { metric } = req.params;
      const {
        branchId,
        refresh = false,
        startDate,
        endDate
      } = req.query;

      // Validate branch access
      if (branchId && req.dataScope.level === 'BRANCH' && !req.dataScope.branchIds.includes(branchId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Branch not accessible'
        });
      }

      const result = await kpiService.getKPI(req.tenantId, metric, {
        branchId: branchId || (req.dataScope.level === 'BRANCH' ? req.branchId : undefined),
        refresh: refresh === 'true',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });

      logger.info('KPI retrieved successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        metric,
        branchId,
        category: 'kpi'
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error retrieving KPI', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        metric: req.params.metric,
        category: 'kpi'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve KPI',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get KPI trend data
router.get('/:metric/trend',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const { metric } = req.params;
      const {
        branchId,
        days = 30
      } = req.query;

      // Validate branch access
      if (branchId && req.dataScope.level === 'BRANCH' && !req.dataScope.branchIds.includes(branchId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Branch not accessible'
        });
      }

      const result = await kpiService.getTrendData(req.tenantId, metric, {
        branchId: branchId || (req.dataScope.level === 'BRANCH' ? req.branchId : undefined),
        days: parseInt(days)
      });

      logger.info('KPI trend data retrieved successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        metric,
        days,
        branchId,
        category: 'kpi'
      });

      res.json(result);

    } catch (error) {
      logger.error('Error retrieving KPI trend data', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        metric: req.params.metric,
        category: 'kpi'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve KPI trend data'
      });
    }
  }
);

// Compare KPI between periods
router.post('/:metric/compare',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const { metric } = req.params;
      const {
        currentPeriod,
        previousPeriod,
        branchId
      } = req.body;

      if (!currentPeriod || !previousPeriod) {
        return res.status(400).json({
          success: false,
          message: 'Both current and previous periods are required'
        });
      }

      // Validate branch access
      if (branchId && req.dataScope.level === 'BRANCH' && !req.dataScope.branchIds.includes(branchId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Branch not accessible'
        });
      }

      const result = await kpiService.compareKPIs(
        req.tenantId,
        metric,
        {
          start: new Date(currentPeriod.start),
          end: new Date(currentPeriod.end)
        },
        {
          start: new Date(previousPeriod.start),
          end: new Date(previousPeriod.end)
        },
        branchId || (req.dataScope.level === 'BRANCH' ? req.branchId : undefined)
      );

      logger.info('KPI comparison completed successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        metric,
        currentPeriod,
        previousPeriod,
        branchId,
        category: 'kpi'
      });

      res.json(result);

    } catch (error) {
      logger.error('Error comparing KPIs', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        metric: req.params.metric,
        category: 'kpi'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to compare KPIs'
      });
    }
  }
);

// Get available metrics for role
router.get('/available/metrics',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const availableMetrics = {
        'SAAS_ADMIN': [
          'DAILY_REVENUE',
          'WEEKLY_REVENUE',
          'MONTHLY_REVENUE',
          'PATIENT_FOOTFALL',
          'APPOINTMENT_COUNT',
          'APPOINTMENT_COMPLETION_RATE',
          'STAFF_UTILIZATION',
          'INSURANCE_APPROVAL_RATE'
        ],
        'CENTRAL_ADMIN': [
          'DAILY_REVENUE',
          'WEEKLY_REVENUE',
          'MONTHLY_REVENUE',
          'PATIENT_FOOTFALL',
          'APPOINTMENT_COUNT',
          'APPOINTMENT_COMPLETION_RATE',
          'APPOINTMENT_CANCELLATION_RATE',
          'AVERAGE_WAIT_TIME',
          'STAFF_UTILIZATION',
          'DOCTOR_UTILIZATION',
          'INSURANCE_APPROVAL_RATE',
          'BILLING_COLLECTION_RATE',
          'OUTSTANDING_PAYMENTS',
          'INVENTORY_TURNOVER',
          'MEDICINE_CONSUMPTION'
        ],
        'BRANCH_ADMIN': [
          'DAILY_REVENUE',
          'PATIENT_FOOTFALL',
          'APPOINTMENT_COUNT',
          'APPOINTMENT_COMPLETION_RATE',
          'APPOINTMENT_CANCELLATION_RATE',
          'AVERAGE_WAIT_TIME',
          'QUEUE_EFFICIENCY',
          'TOKEN_PROCESSING_TIME',
          'STAFF_UTILIZATION',
          'DOCTOR_UTILIZATION',
          'STAFF_ATTENDANCE_RATE',
          'BILLING_COLLECTION_RATE',
          'INVENTORY_TURNOVER'
        ],
        'ACCOUNTS_MANAGER': [
          'DAILY_REVENUE',
          'WEEKLY_REVENUE',
          'MONTHLY_REVENUE',
          'BILLING_COLLECTION_RATE',
          'OUTSTANDING_PAYMENTS',
          'INSURANCE_APPROVAL_RATE',
          'INSURANCE_CLAIM_VALUE',
          'EXPENSE_RATIO',
          'PROFIT_MARGIN'
        ],
        'DOCTOR': [
          'APPOINTMENT_COUNT',
          'APPOINTMENT_COMPLETION_RATE',
          'PATIENT_SATISFACTION',
          'TREATMENT_SUCCESS_RATE'
        ]
      };

      const metrics = availableMetrics[req.role] || [];

      res.json({
        success: true,
        data: {
          role: req.role,
          metrics: metrics.map(metric => ({
            name: metric,
            displayName: metric.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            category: this.getMetricCategory(metric)
          }))
        }
      });

    } catch (error) {
      logger.error('Error retrieving available metrics', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        role: req.role,
        category: 'kpi'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available metrics'
      });
    }
  }
);

// Get KPI summary for dashboard
router.get('/summary/dashboard',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const {
        branchId,
        period = 'today'
      } = req.query;

      // Get default metrics for role
      const defaultMetrics = kpiService.getDefaultMetrics(req.role);

      const result = await kpiService.getKPIs(req.tenantId, {
        branchId: branchId || (req.dataScope.level === 'BRANCH' ? req.branchId : undefined),
        metrics: defaultMetrics,
        period,
        role: req.role
      });

      // Format for dashboard display
      const summary = Object.entries(result.data).map(([metric, data]) => ({
        metric,
        displayName: metric.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        value: data.value,
        unit: data.unit,
        formattedValue: this.formatKPIValue(data.value, data.unit),
        trend: data.trend,
        category: this.getMetricCategory(metric),
        lastUpdated: data.metadata?.calculatedAt
      }));

      logger.info('KPI summary retrieved successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        role: req.role,
        metricsCount: summary.length,
        period,
        branchId,
        category: 'kpi'
      });

      res.json({
        success: true,
        data: {
          summary,
          period: result.period,
          generatedAt: result.generatedAt
        }
      });

    } catch (error) {
      logger.error('Error retrieving KPI summary', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        category: 'kpi'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve KPI summary'
      });
    }
  }
);

// Helper methods
function getMetricCategory(metric) {
  const categories = {
    'DAILY_REVENUE': 'Financial',
    'WEEKLY_REVENUE': 'Financial',
    'MONTHLY_REVENUE': 'Financial',
    'PATIENT_FOOTFALL': 'Operational',
    'APPOINTMENT_COUNT': 'Operational',
    'APPOINTMENT_COMPLETION_RATE': 'Operational',
    'APPOINTMENT_CANCELLATION_RATE': 'Operational',
    'AVERAGE_WAIT_TIME': 'Operational',
    'QUEUE_EFFICIENCY': 'Operational',
    'TOKEN_PROCESSING_TIME': 'Operational',
    'STAFF_UTILIZATION': 'HR',
    'DOCTOR_UTILIZATION': 'HR',
    'STAFF_ATTENDANCE_RATE': 'HR',
    'BILLING_COLLECTION_RATE': 'Financial',
    'OUTSTANDING_PAYMENTS': 'Financial',
    'INSURANCE_APPROVAL_RATE': 'Financial',
    'INSURANCE_CLAIM_VALUE': 'Financial',
    'INVENTORY_TURNOVER': 'Inventory',
    'MEDICINE_CONSUMPTION': 'Inventory',
    'PATIENT_SATISFACTION': 'Clinical',
    'TREATMENT_SUCCESS_RATE': 'Clinical',
    'LAB_TEST_COUNT': 'Clinical',
    'AI_DIAGNOSIS_ACCURACY': 'Clinical',
    'PAYROLL_COST': 'HR',
    'OVERTIME_HOURS': 'HR',
    'EXPENSE_RATIO': 'Financial',
    'PROFIT_MARGIN': 'Financial'
  };

  return categories[metric] || 'Other';
}

function formatKPIValue(value, unit) {
  if (value === null || value === undefined) return 'N/A';

  switch (unit) {
    case 'CURRENCY':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    case 'PERCENTAGE':
      return `${value.toFixed(1)}%`;
    case 'TIME_MINUTES':
      return `${value} min`;
    case 'TIME_HOURS':
      return `${value} hrs`;
    case 'RATIO':
      return value.toFixed(2);
    default:
      return typeof value === 'number' ? value.toLocaleString() : value;
  }
}

module.exports = router;