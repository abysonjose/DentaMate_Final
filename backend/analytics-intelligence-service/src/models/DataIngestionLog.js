const mongoose = require('mongoose');

const dataIngestionLogSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    index: true
  },
  sourceService: {
    type: String,
    required: true,
    enum: [
      'appointment-scheduling-service',
      'billing-payment-service',
      'lab-diagnostics-service',
      'payroll-hr-service',
      'inventory-pharmacy-service',
      'token-queue-realtime-service',
      'nursing-care-service',
      'ai-diagnosis-service',
      'insurance-claims-service',
      'accounting-finance-service',
      'collaboration-meeting-service',
      'notification-communication-service'
    ],
    index: true
  },
  dataType: {
    type: String,
    required: true,
    enum: [
      'APPOINTMENT',
      'BILLING',
      'LAB_RESULT',
      'PAYROLL',
      'INVENTORY',
      'QUEUE_TOKEN',
      'NURSING_RECORD',
      'AI_DIAGNOSIS',
      'INSURANCE_CLAIM',
      'FINANCIAL_TRANSACTION',
      'COLLABORATION',
      'NOTIFICATION'
    ],
    index: true
  },
  batchId: {
    type: String,
    index: true
  },
  recordCount: {
    type: Number,
    required: true,
    min: 0
  },
  processedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  errorCount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL'],
    default: 'PENDING',
    index: true
  },
  startTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  endTime: {
    type: Date,
    index: true
  },
  processingDuration: {
    type: Number // milliseconds
  },
  dataSchema: {
    version: String,
    fields: [String],
    validationRules: Map
  },
  summary: {
    totalRecords: Number,
    validRecords: Number,
    invalidRecords: Number,
    duplicateRecords: Number,
    newRecords: Number,
    updatedRecords: Number
  },
  errors: [{
    recordIndex: Number,
    field: String,
    errorType: {
      type: String,
      enum: ['VALIDATION', 'DUPLICATE', 'MISSING_FIELD', 'INVALID_FORMAT', 'BUSINESS_RULE']
    },
    errorMessage: String,
    recordData: mongoose.Schema.Types.Mixed
  }],
  metrics: {
    recordsPerSecond: Number,
    memoryUsage: Number,
    cpuUsage: Number
  },
  metadata: {
    sourceVersion: String,
    apiEndpoint: String,
    requestId: String,
    userAgent: String,
    ipAddress: String,
    correlationId: String
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  nextRetryAt: Date,
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'dataingestionlogs'
});

// Compound indexes for efficient queries
dataIngestionLogSchema.index({ tenantId: 1, sourceService: 1, createdAt: -1 });
dataIngestionLogSchema.index({ tenantId: 1, dataType: 1, status: 1 });
dataIngestionLogSchema.index({ status: 1, createdAt: -1 });
dataIngestionLogSchema.index({ batchId: 1, status: 1 });
dataIngestionLogSchema.index({ sourceService: 1, status: 1, createdAt: -1 });

// TTL index for automatic cleanup (90 days)
dataIngestionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Virtual for success rate
dataIngestionLogSchema.virtual('successRate').get(function() {
  if (this.recordCount === 0) return 0;
  return ((this.processedCount - this.errorCount) / this.recordCount) * 100;
});

// Virtual for processing rate
dataIngestionLogSchema.virtual('processingRate').get(function() {
  if (!this.processingDuration || this.processingDuration === 0) return 0;
  return (this.processedCount / (this.processingDuration / 1000)); // records per second
});

// Instance methods
dataIngestionLogSchema.methods.startProcessing = function() {
  this.status = 'PROCESSING';
  this.startTime = new Date();
  return this.save();
};

dataIngestionLogSchema.methods.completeProcessing = function(summary = {}) {
  this.status = this.errorCount > 0 ? 'PARTIAL' : 'COMPLETED';
  this.endTime = new Date();
  this.processingDuration = this.endTime - this.startTime;
  this.summary = { ...this.summary, ...summary };
  
  // Calculate metrics
  this.metrics = {
    recordsPerSecond: this.processingRate,
    memoryUsage: process.memoryUsage().heapUsed,
    cpuUsage: process.cpuUsage().user
  };
  
  return this.save();
};

dataIngestionLogSchema.methods.failProcessing = function(error) {
  this.status = 'FAILED';
  this.endTime = new Date();
  this.processingDuration = this.endTime - this.startTime;
  
  if (error) {
    this.errors.push({
      errorType: 'PROCESSING',
      errorMessage: error.message || error,
      recordData: null
    });
  }
  
  return this.save();
};

dataIngestionLogSchema.methods.addError = function(recordIndex, field, errorType, errorMessage, recordData = null) {
  this.errors.push({
    recordIndex,
    field,
    errorType,
    errorMessage,
    recordData
  });
  this.errorCount += 1;
  return this.save();
};

dataIngestionLogSchema.methods.incrementProcessed = function() {
  this.processedCount += 1;
  return this.save();
};

dataIngestionLogSchema.methods.canRetry = function() {
  return this.retryCount < 3 && this.status === 'FAILED';
};

dataIngestionLogSchema.methods.scheduleRetry = function(delayMinutes = 5) {
  if (this.canRetry()) {
    this.retryCount += 1;
    this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    this.status = 'PENDING';
    return this.save();
  }
  return Promise.resolve(this);
};

dataIngestionLogSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

// Static methods
dataIngestionLogSchema.statics.findByTenant = function(tenantId, options = {}) {
  const query = { tenantId, isArchived: false };
  
  if (options.sourceService) query.sourceService = options.sourceService;
  if (options.dataType) query.dataType = options.dataType;
  if (options.status) query.status = options.status;
  if (options.batchId) query.batchId = options.batchId;
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

dataIngestionLogSchema.statics.getIngestionStats = function(tenantId, dateRange = {}) {
  const matchStage = { tenantId, isArchived: false };
  
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) matchStage.createdAt.$gte = dateRange.start;
    if (dateRange.end) matchStage.createdAt.$lte = dateRange.end;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          sourceService: '$sourceService',
          status: '$status'
        },
        count: { $sum: 1 },
        totalRecords: { $sum: '$recordCount' },
        totalProcessed: { $sum: '$processedCount' },
        totalErrors: { $sum: '$errorCount' },
        avgProcessingTime: { $avg: '$processingDuration' }
      }
    },
    {
      $group: {
        _id: '$_id.sourceService',
        statusBreakdown: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalRecords: '$totalRecords',
            totalProcessed: '$totalProcessed',
            totalErrors: '$totalErrors',
            avgProcessingTime: '$avgProcessingTime'
          }
        },
        totalIngestions: { $sum: '$count' },
        totalRecordsProcessed: { $sum: '$totalRecords' }
      }
    },
    { $sort: { totalRecordsProcessed: -1 } }
  ]);
};

dataIngestionLogSchema.statics.getFailedIngestions = function(tenantId, limit = 50) {
  return this.find({
    tenantId,
    status: 'FAILED',
    isArchived: false
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .select('sourceService dataType recordCount errors createdAt retryCount');
};

dataIngestionLogSchema.statics.getPendingRetries = function() {
  return this.find({
    status: 'PENDING',
    retryCount: { $gt: 0 },
    nextRetryAt: { $lte: new Date() },
    isArchived: false
  })
  .sort({ nextRetryAt: 1 });
};

dataIngestionLogSchema.statics.getIngestionTrends = function(tenantId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: startDate },
        isArchived: false
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          sourceService: '$sourceService'
        },
        ingestionCount: { $sum: 1 },
        recordCount: { $sum: '$recordCount' },
        errorCount: { $sum: '$errorCount' },
        avgProcessingTime: { $avg: '$processingDuration' }
      }
    },
    {
      $sort: {
        '_id.year': 1,
        '_id.month': 1,
        '_id.day': 1,
        '_id.sourceService': 1
      }
    }
  ]);
};

dataIngestionLogSchema.statics.getServiceHealthMetrics = function(tenantId, hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  return this.aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: startDate },
        isArchived: false
      }
    },
    {
      $group: {
        _id: '$sourceService',
        totalIngestions: { $sum: 1 },
        successfulIngestions: {
          $sum: {
            $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0]
          }
        },
        failedIngestions: {
          $sum: {
            $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0]
          }
        },
        totalRecords: { $sum: '$recordCount' },
        totalErrors: { $sum: '$errorCount' },
        avgProcessingTime: { $avg: '$processingDuration' },
        maxProcessingTime: { $max: '$processingDuration' },
        minProcessingTime: { $min: '$processingDuration' }
      }
    },
    {
      $addFields: {
        successRate: {
          $multiply: [
            { $divide: ['$successfulIngestions', '$totalIngestions'] },
            100
          ]
        },
        errorRate: {
          $multiply: [
            { $divide: ['$totalErrors', '$totalRecords'] },
            100
          ]
        }
      }
    },
    { $sort: { totalRecords: -1 } }
  ]);
};

module.exports = mongoose.model('DataIngestionLog', dataIngestionLogSchema);