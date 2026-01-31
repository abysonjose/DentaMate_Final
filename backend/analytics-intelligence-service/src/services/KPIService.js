const MetricSnapshot = require('../models/MetricSnapshot');
const logger = require('../utils/logger');

class KPIService {
  constructor() {
    this.metricCalculators = new Map();
    this.initializeCalculators();
  }

  initializeCalculators() {
    // Revenue metrics
    this.metricCalculators.set('DAILY_REVENUE', this.calculateDailyRevenue.bind(this));
    this.metricCalculators.set('WEEKLY_REVENUE', this.calculateWeeklyRevenue.bind(this));
    this.metricCalculators.set('MONTHLY_REVENUE', this.calculateMonthlyRevenue.bind(this));
    
    // Patient metrics
    this.metricCalculators.set('PATIENT_FOOTFALL', this.calculatePatientFootfall.bind(this));
    this.metricCalculators.set('PATIENT_SATISFACTION', this.calculatePatientSatisfaction.bind(this));
    
    // Appointment metrics
    this.metricCalculators.set('APPOINTMENT_COUNT', this.calculateAppointmentCount.bind(this));
    this.metricCalculators.set('APPOINTMENT_COMPLETION_RATE', this.calculateAppointmentCompletionRate.bind(this));
    this.metricCalculators.set('APPOINTMENT_CANCELLATION_RATE', this.calculateAppointmentCancellationRate.bind(this));
    
    // Operational metrics
    this.metricCalculators.set('AVERAGE_WAIT_TIME', this.calculateAverageWaitTime.bind(this));
    this.metricCalculators.set('QUEUE_EFFICIENCY', this.calculateQueueEfficiency.bind(this));
    this.metricCalculators.set('TOKEN_PROCESSING_TIME', this.calculateTokenProcessingTime.bind(this));
    
    // Staff metrics
    this.metricCalculators.set('STAFF_UTILIZATION', this.calculateStaffUtilization.bind(this));
    this.metricCalculators.set('DOCTOR_UTILIZATION', this.calculateDoctorUtilization.bind(this));
    this.metricCalculators.set('STAFF_ATTENDANCE_RATE', this.calculateStaffAttendanceRate.bind(this));
    
    // Financial metrics
    this.metricCalculators.set('INSURANCE_APPROVAL_RATE', this.calculateInsuranceApprovalRate.bind(this));
    this.metricCalculators.set('BILLING_COLLECTION_RATE', this.calculateBillingCollectionRate.bind(this));
    this.metricCalculators.set('OUTSTANDING_PAYMENTS', this.calculateOutstandingPayments.bind(this));
    
    // Inventory metrics
    this.metricCalculators.set('INVENTORY_TURNOVER', this.calculateInventoryTurnover.bind(this));
    this.metricCalculators.set('MEDICINE_CONSUMPTION', this.calculateMedicineConsumption.bind(this));
  }

  async getKPIs(tenantId, options = {}) {
    try {
      const {
        branchId,
        metrics = [],
        period = 'today',
        refresh = false
      } = options;

      logger.info('Fetching KPIs', {
        tenantId,
        branchId,
        metrics,
        period,
        refresh,
        category: 'kpi'
      });

      let startDate, endDate;
      ({ startDate, endDate } = this.parsePeriod(period));

      const kpis = {};

      if (metrics.length === 0) {
        // Get default metrics based on role (will be passed in options)
        const defaultMetrics = this.getDefaultMetrics(options.role);
        for (const metric of defaultMetrics) {
          kpis[metric] = await this.getKPI(tenantId, metric, { branchId, startDate, endDate, refresh });
        }
      } else {
        for (const metric of metrics) {
          kpis[metric] = await this.getKPI(tenantId, metric, { branchId, startDate, endDate, refresh });
        }
      }

      return {
        success: true,
        data: kpis,
        period: { startDate, endDate },
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error fetching KPIs', {
        error: error.message,
        tenantId,
        options,
        category: 'kpi'
      });
      throw error;
    }
  }

  async getKPI(tenantId, metric, options = {}) {
    try {
      const { branchId, startDate, endDate, refresh = false } = options;

      // Check if we have cached data
      if (!refresh) {
        const cached = await this.getCachedKPI(tenantId, metric, branchId, startDate, endDate);
        if (cached) {
          return cached;
        }
      }

      // Calculate KPI
      const calculator = this.metricCalculators.get(metric);
      if (!calculator) {
        throw new Error(`Unknown metric: ${metric}`);
      }

      const result = await calculator(tenantId, { branchId, startDate, endDate });
      
      // Cache the result
      await this.cacheKPI(tenantId, metric, result, { branchId, startDate, endDate });

      return result;

    } catch (error) {
      logger.error('Error calculating KPI', {
        error: error.message,
        tenantId,
        metric,
        options,
        category: 'kpi'
      });
      throw error;
    }
  }

  async getTrendData(tenantId, metric, options = {}) {
    try {
      const { branchId, days = 30 } = options;

      const trendData = await MetricSnapshot.getTrendData(tenantId, metric, days, branchId);
      
      // Calculate trend direction and percentage change
      const trend = this.calculateTrend(trendData);

      return {
        success: true,
        data: trendData,
        trend,
        metric,
        period: `${days} days`
      };

    } catch (error) {
      logger.error('Error fetching trend data', {
        error: error.message,
        tenantId,
        metric,
        options,
        category: 'kpi'
      });
      throw error;
    }
  }

  async compareKPIs(tenantId, metric, currentPeriod, previousPeriod, branchId = null) {
    try {
      const comparison = await MetricSnapshot.compareMetrics(
        tenantId, 
        metric, 
        currentPeriod, 
        previousPeriod, 
        branchId
      );

      const result = this.processComparison(comparison);

      return {
        success: true,
        data: result,
        metric,
        periods: { current: currentPeriod, previous: previousPeriod }
      };

    } catch (error) {
      logger.error('Error comparing KPIs', {
        error: error.message,
        tenantId,
        metric,
        currentPeriod,
        previousPeriod,
        category: 'kpi'
      });
      throw error;
    }
  }

  // Metric calculation methods
  async calculateDailyRevenue(tenantId, options) {
    // This would integrate with billing service data
    // For now, return mock calculation
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 25000,
      unit: 'CURRENCY',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.95,
        dataFreshness: new Date()
      }
    };
  }

  async calculateWeeklyRevenue(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 175000,
      unit: 'CURRENCY',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.95,
        dataFreshness: new Date()
      }
    };
  }

  async calculateMonthlyRevenue(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 750000,
      unit: 'CURRENCY',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.95,
        dataFreshness: new Date()
      }
    };
  }

  async calculatePatientFootfall(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 45,
      unit: 'COUNT',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 1.0,
        dataFreshness: new Date()
      }
    };
  }

  async calculateAppointmentCount(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 38,
      unit: 'COUNT',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 1.0,
        dataFreshness: new Date()
      }
    };
  }

  async calculateAppointmentCompletionRate(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 92.5,
      unit: 'PERCENTAGE',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.98,
        dataFreshness: new Date()
      }
    };
  }

  async calculateAppointmentCancellationRate(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 7.5,
      unit: 'PERCENTAGE',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.98,
        dataFreshness: new Date()
      }
    };
  }

  async calculateAverageWaitTime(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 18.5,
      unit: 'TIME_MINUTES',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.90,
        dataFreshness: new Date()
      }
    };
  }

  async calculateQueueEfficiency(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 85.2,
      unit: 'PERCENTAGE',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.92,
        dataFreshness: new Date()
      }
    };
  }

  async calculateTokenProcessingTime(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 12.3,
      unit: 'TIME_MINUTES',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.88,
        dataFreshness: new Date()
      }
    };
  }

  async calculateStaffUtilization(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 78.5,
      unit: 'PERCENTAGE',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.85,
        dataFreshness: new Date()
      }
    };
  }

  async calculateDoctorUtilization(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 82.3,
      unit: 'PERCENTAGE',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.90,
        dataFreshness: new Date()
      }
    };
  }

  async calculateStaffAttendanceRate(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 94.2,
      unit: 'PERCENTAGE',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 1.0,
        dataFreshness: new Date()
      }
    };
  }

  async calculateInsuranceApprovalRate(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 87.6,
      unit: 'PERCENTAGE',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.95,
        dataFreshness: new Date()
      }
    };
  }

  async calculateBillingCollectionRate(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 91.8,
      unit: 'PERCENTAGE',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.98,
        dataFreshness: new Date()
      }
    };
  }

  async calculateOutstandingPayments(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 125000,
      unit: 'CURRENCY',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 1.0,
        dataFreshness: new Date()
      }
    };
  }

  async calculateInventoryTurnover(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 6.2,
      unit: 'RATIO',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.88,
        dataFreshness: new Date()
      }
    };
  }

  async calculateMedicineConsumption(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 245,
      unit: 'COUNT',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.92,
        dataFreshness: new Date()
      }
    };
  }

  async calculatePatientSatisfaction(tenantId, options) {
    const { branchId, startDate, endDate } = options;
    
    return {
      value: 4.3,
      unit: 'RATIO',
      period: startDate,
      metadata: {
        calculatedAt: new Date(),
        confidence: 0.85,
        dataFreshness: new Date()
      }
    };
  }

  // Helper methods
  parsePeriod(period) {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    return { startDate, endDate };
  }

  getDefaultMetrics(role) {
    const defaultMetrics = {
      'SAAS_ADMIN': [
        'DAILY_REVENUE',
        'PATIENT_FOOTFALL',
        'APPOINTMENT_COMPLETION_RATE',
        'STAFF_UTILIZATION'
      ],
      'CENTRAL_ADMIN': [
        'DAILY_REVENUE',
        'PATIENT_FOOTFALL',
        'APPOINTMENT_COMPLETION_RATE',
        'AVERAGE_WAIT_TIME',
        'STAFF_UTILIZATION',
        'INSURANCE_APPROVAL_RATE'
      ],
      'BRANCH_ADMIN': [
        'DAILY_REVENUE',
        'PATIENT_FOOTFALL',
        'APPOINTMENT_COMPLETION_RATE',
        'AVERAGE_WAIT_TIME',
        'STAFF_UTILIZATION',
        'QUEUE_EFFICIENCY'
      ],
      'ACCOUNTS_MANAGER': [
        'DAILY_REVENUE',
        'BILLING_COLLECTION_RATE',
        'OUTSTANDING_PAYMENTS',
        'INSURANCE_APPROVAL_RATE'
      ],
      'DOCTOR': [
        'APPOINTMENT_COUNT',
        'APPOINTMENT_COMPLETION_RATE',
        'PATIENT_SATISFACTION'
      ]
    };

    return defaultMetrics[role] || [];
  }

  async getCachedKPI(tenantId, metric, branchId, startDate, endDate) {
    try {
      const cached = await MetricSnapshot.findOne({
        tenantId,
        metric,
        branchId,
        period: { $gte: startDate, $lte: endDate },
        isActive: true
      }).sort({ createdAt: -1 });

      if (cached && !cached.isStale(30)) { // 30 minutes cache
        return {
          value: cached.value,
          unit: cached.unit,
          period: cached.period,
          metadata: cached.metadata,
          cached: true
        };
      }

      return null;
    } catch (error) {
      logger.warn('Error fetching cached KPI', {
        error: error.message,
        tenantId,
        metric,
        category: 'kpi'
      });
      return null;
    }
  }

  async cacheKPI(tenantId, metric, result, options) {
    try {
      const { branchId, startDate, endDate } = options;

      const snapshot = new MetricSnapshot({
        tenantId,
        branchId,
        metric,
        value: result.value,
        unit: result.unit,
        period: result.period || startDate,
        metadata: result.metadata
      });

      await snapshot.save();
      
      logger.debug('KPI cached successfully', {
        tenantId,
        metric,
        branchId,
        category: 'kpi'
      });

    } catch (error) {
      logger.warn('Error caching KPI', {
        error: error.message,
        tenantId,
        metric,
        category: 'kpi'
      });
    }
  }

  calculateTrend(trendData) {
    if (!trendData || trendData.length < 2) {
      return { direction: 'STABLE', percentage: 0 };
    }

    const latest = trendData[trendData.length - 1];
    const previous = trendData[trendData.length - 2];

    if (!latest || !previous || typeof latest.value !== 'number' || typeof previous.value !== 'number') {
      return { direction: 'STABLE', percentage: 0 };
    }

    const change = latest.value - previous.value;
    const percentage = previous.value !== 0 ? (change / previous.value) * 100 : 0;

    let direction = 'STABLE';
    if (Math.abs(percentage) > 1) { // Only consider significant changes
      direction = percentage > 0 ? 'UP' : 'DOWN';
    }

    return {
      direction,
      percentage: Math.round(percentage * 100) / 100
    };
  }

  processComparison(comparison) {
    if (!comparison || comparison.length === 0) {
      return { current: null, previous: null, change: null };
    }

    const result = comparison[0];
    const current = result.current && result.current.length > 0 ? result.current[0] : null;
    const previous = result.previous && result.previous.length > 0 ? result.previous[0] : null;

    let change = null;
    if (current && previous && current.value !== null && previous.value !== null) {
      const diff = current.value - previous.value;
      const percentage = previous.value !== 0 ? (diff / previous.value) * 100 : 0;
      
      change = {
        absolute: diff,
        percentage: Math.round(percentage * 100) / 100,
        direction: diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE'
      };
    }

    return { current, previous, change };
  }
}

module.exports = KPIService;