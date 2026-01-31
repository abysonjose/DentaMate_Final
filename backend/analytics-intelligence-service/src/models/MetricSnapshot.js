const mongoose = require('mongoose');

const metricSnapshotSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    index: true
  },
  metric: {
    type: String,
    required: true,
    enum: [
      'DAILY_REVENUE',
      'WEEKLY_REVENUE',
      'MONTHLY_REVENUE',
      'PATIENT_FOOTFALL',
      'APPOINTMENT_COUNT',
      'APPOINTMENT_COMPLETION_RATE',
      'APPOINTMENT_CANCELLATION_RATE',
      'AVERAGE_WAIT_TIME',
      'PEAK_HOUR_UTILIZATION',
      'STAFF_UTILIZATION',
      'DOCTOR_UTILIZATION',
      'ROOM_UTILIZATION',
      'INVENTORY_TURNOVER',
      'MEDICINE_CONSUMPTION',
      'INSURANCE_APPROVAL_RATE',
      'INSURANCE_CLAIM_VALUE',
      'PATIENT_SATISFACTION',
      'TREATMENT_SUCCESS_RATE',
      'LAB_TEST_COUNT',
      'AI_DIAGNOSIS_ACCURACY',
      'QUEUE_EFFICIENCY',
      'TOKEN_PROCESSING_TIME',
      'PAYROLL_COST',
      'STAFF_ATTENDANCE_RATE',
      'OVERTIME_HOURS',
      'BILLING_COLLECTION_RATE',
      'OUTSTANDING_PAYMENTS',
      'EXPENSE_RATIO',
      'PROFIT_MARGIN'
    ],
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Can be number, object, or array
    required: true
  },
  unit: {
    type: String,
    enum: ['COUNT', 'PERCENTAGE', 'CURRENCY', 'TIME_MINUTES', 'TIME_HOURS', 'RATIO'],
    default: 'COUNT'
  },
  period: {
    type: Date,
    required: true,
    index: true
  },
  periodType: {
    type: String,
    enum: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
    default: 'DAILY',
    index: true
  },
  calculationMethod: {
    type: String,
    enum: ['SUM', 'AVERAGE', 'COUNT', 'PERCENTAGE', 'RATIO', 'MEDIAN', 'MAX', 'MIN'],
    default: 'SUM'
  },
  sourceData: {
    services: [String], // Which services contributed to this metric
    recordCount: Number,
    lastUpdated: Date
  },
  breakdown: {
    type: Map,
    of: mongoose.Schema.Types.Mixed // For detailed breakdowns (by department, doctor, etc.)
  },
  metadata: {
    calculatedAt: {
      type: Date,
      default: Date.now
    },
    calculationDuration: Number, // milliseconds
    dataFreshness: Date, // When source data was last updated
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    },
    tags: [String],
    notes: String
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'metricsnapshots'
});

// Compound indexes for efficient queries
metricSnapshotSchema.index({ tenantId: 1, branchId: 1, metric: 1, period: -1 });
metricSnapshotSchema.index({ tenantId: 1, metric: 1, periodType: 1, period: -1 });
metricSnapshotSchema.index({ metric: 1, period: -1, isActive: 1 });
metricSnapshotSchema.index({ tenantId: 1, period: -1, isActive: 1 });

// TTL index for automatic cleanup (configurable retention)
metricSnapshotSchema.index({ 
  createdAt: 1 
}, { 
  expireAfterSeconds: parseInt(process.env.DATA_RETENTION_MONTHS || 12) * 30 * 24 * 60 * 60 
});

// Virtual for formatted value
metricSnapshotSchema.virtual('formattedValue').get(function() {
  switch (this.unit) {
    case 'CURRENCY':
      return typeof this.value === 'number' ? `$${this.value.toFixed(2)}` : this.value;
    case 'PERCENTAGE':
      return typeof this.value === 'number' ? `${this.value.toFixed(1)}%` : this.value;
    case 'TIME_MINUTES':
      return typeof this.value === 'number' ? `${this.value} min` : this.value;
    case 'TIME_HOURS':
      return typeof this.value === 'number' ? `${this.value} hrs` : this.value;
    default:
      return this.value;
  }
});

// Instance methods
metricSnapshotSchema.methods.updateValue = function(newValue, metadata = {}) {
  this.value = newValue;
  this.metadata = {
    ...this.metadata,
    ...metadata,
    calculatedAt: new Date()
  };
  this.version += 1;
  return this.save();
};

metricSnapshotSchema.methods.addBreakdown = function(key, value) {
  if (!this.breakdown) {
    this.breakdown = new Map();
  }
  this.breakdown.set(key, value);
  return this.save();
};

metricSnapshotSchema.methods.isStale = function(maxAgeMinutes = 60) {
  const now = new Date();
  const ageMinutes = (now - this.metadata.calculatedAt) / (1000 * 60);
  return ageMinutes > maxAgeMinutes;
};

// Static methods
metricSnapshotSchema.statics.findByTenantAndMetric = function(tenantId, metric, options = {}) {
  const query = { tenantId, metric, isActive: true };
  
  if (options.branchId) query.branchId = options.branchId;
  if (options.periodType) query.periodType = options.periodType;
  if (options.startDate || options.endDate) {
    query.period = {};
    if (options.startDate) query.period.$gte = options.startDate;
    if (options.endDate) query.period.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ period: -1 })
    .limit(options.limit || 100);
};

metricSnapshotSchema.statics.getLatestMetrics = function(tenantId, metrics, branchId = null) {
  const matchStage = { 
    tenantId, 
    metric: { $in: metrics }, 
    isActive: true 
  };
  
  if (branchId) matchStage.branchId = branchId;

  return this.aggregate([
    { $match: matchStage },
    { $sort: { period: -1 } },
    {
      $group: {
        _id: '$metric',
        latestSnapshot: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestSnapshot' }
    }
  ]);
};

metricSnapshotSchema.statics.getTrendData = function(tenantId, metric, days = 30, branchId = null) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchStage = {
    tenantId,
    metric,
    period: { $gte: startDate },
    isActive: true
  };

  if (branchId) matchStage.branchId = branchId;

  return this.find(matchStage)
    .sort({ period: 1 })
    .select('period value unit metadata.calculatedAt');
};

metricSnapshotSchema.statics.getAggregatedMetrics = function(tenantId, metrics, groupBy = 'day', branchId = null) {
  const matchStage = { 
    tenantId, 
    metric: { $in: metrics }, 
    isActive: true 
  };
  
  if (branchId) matchStage.branchId = branchId;

  let dateGrouping;
  switch (groupBy) {
    case 'hour':
      dateGrouping = {
        year: { $year: '$period' },
        month: { $month: '$period' },
        day: { $dayOfMonth: '$period' },
        hour: { $hour: '$period' }
      };
      break;
    case 'week':
      dateGrouping = {
        year: { $year: '$period' },
        week: { $week: '$period' }
      };
      break;
    case 'month':
      dateGrouping = {
        year: { $year: '$period' },
        month: { $month: '$period' }
      };
      break;
    default: // day
      dateGrouping = {
        year: { $year: '$period' },
        month: { $month: '$period' },
        day: { $dayOfMonth: '$period' }
      };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          ...dateGrouping,
          metric: '$metric'
        },
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
        count: { $sum: 1 },
        maxValue: { $max: '$value' },
        minValue: { $min: '$value' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]);
};

metricSnapshotSchema.statics.compareMetrics = function(tenantId, metric, currentPeriod, previousPeriod, branchId = null) {
  const matchStage = { tenantId, metric, isActive: true };
  if (branchId) matchStage.branchId = branchId;

  return this.aggregate([
    { $match: matchStage },
    {
      $facet: {
        current: [
          { $match: { period: { $gte: currentPeriod.start, $lte: currentPeriod.end } } },
          { $group: { _id: null, value: { $sum: '$value' }, count: { $sum: 1 } } }
        ],
        previous: [
          { $match: { period: { $gte: previousPeriod.start, $lte: previousPeriod.end } } },
          { $group: { _id: null, value: { $sum: '$value' }, count: { $sum: 1 } } }
        ]
      }
    }
  ]);
};

metricSnapshotSchema.statics.getBranchComparison = function(tenantId, metric, period, branchIds = []) {
  const matchStage = { tenantId, metric, period, isActive: true };
  if (branchIds.length > 0) matchStage.branchId = { $in: branchIds };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$branchId',
        value: { $sum: '$value' },
        count: { $sum: 1 },
        avgValue: { $avg: '$value' }
      }
    },
    { $sort: { value: -1 } }
  ]);
};

module.exports = mongoose.model('MetricSnapshot', metricSnapshotSchema);