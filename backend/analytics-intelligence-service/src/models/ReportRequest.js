const mongoose = require('mongoose');

const reportRequestSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    index: true
  },
  requestedBy: {
    userId: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: ['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTS_MANAGER', 'DOCTOR']
    },
    name: String,
    email: String
  },
  reportType: {
    type: String,
    required: true,
    enum: [
      'OPERATIONAL_SUMMARY',
      'FINANCIAL_SUMMARY',
      'HR_PAYROLL_SUMMARY',
      'INVENTORY_EXPIRY',
      'PATIENT_ANALYTICS',
      'APPOINTMENT_ANALYTICS',
      'REVENUE_ANALYTICS',
      'STAFF_PERFORMANCE',
      'CLINICAL_OUTCOMES',
      'INSURANCE_ANALYTICS',
      'QUEUE_PERFORMANCE',
      'AI_DIAGNOSIS_REPORT',
      'COMPLIANCE_REPORT',
      'CUSTOM_REPORT'
    ],
    index: true
  },
  format: {
    type: String,
    enum: ['PDF', 'CSV', 'EXCEL', 'JSON'],
    default: 'PDF'
  },
  parameters: {
    startDate: Date,
    endDate: Date,
    branchIds: [String],
    departmentIds: [String],
    doctorIds: [String],
    patientIds: [String],
    includeCharts: {
      type: Boolean,
      default: true
    },
    includeDetails: {
      type: Boolean,
      default: true
    },
    groupBy: {
      type: String,
      enum: ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR', 'DOCTOR', 'DEPARTMENT', 'BRANCH']
    },
    filters: Map,
    customFields: [String]
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
    index: true
  },
  scheduledAt: {
    type: Date,
    index: true
  },
  startedAt: Date,
  completedAt: Date,
  processingDuration: Number, // milliseconds
  fileInfo: {
    fileName: String,
    filePath: String,
    fileSize: Number, // bytes
    downloadUrl: String,
    expiresAt: Date,
    downloadCount: {
      type: Number,
      default: 0
    },
    lastDownloadedAt: Date
  },
  reportData: {
    summary: {
      totalRecords: Number,
      dateRange: {
        start: Date,
        end: Date
      },
      generatedAt: Date,
      dataFreshness: Date
    },
    sections: [{
      name: String,
      type: {
        type: String,
        enum: ['TABLE', 'CHART', 'KPI', 'TEXT', 'IMAGE']
      },
      data: mongoose.Schema.Types.Mixed,
      metadata: Map
    }],
    charts: [{
      type: {
        type: String,
        enum: ['LINE', 'BAR', 'PIE', 'AREA', 'SCATTER', 'GAUGE']
      },
      title: String,
      data: mongoose.Schema.Types.Mixed,
      config: Map
    }],
    kpis: [{
      name: String,
      value: mongoose.Schema.Types.Mixed,
      unit: String,
      trend: {
        direction: {
          type: String,
          enum: ['UP', 'DOWN', 'STABLE']
        },
        percentage: Number,
        comparison: String
      }
    }]
  },
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed,
    stackTrace: String
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  nextRetryAt: Date,
  metadata: {
    requestSource: {
      type: String,
      enum: ['WEB_UI', 'API', 'SCHEDULED', 'WEBHOOK']
    },
    userAgent: String,
    ipAddress: String,
    correlationId: String,
    sessionId: String
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringConfig: {
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']
    },
    dayOfWeek: Number, // 0-6 for weekly
    dayOfMonth: Number, // 1-31 for monthly
    time: String, // HH:MM format
    timezone: String,
    nextRun: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  sharing: {
    isShared: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      userId: String,
      role: String,
      permissions: [String], // ['VIEW', 'DOWNLOAD', 'SHARE']
      sharedAt: Date,
      sharedBy: String
    }],
    publicLink: {
      enabled: {
        type: Boolean,
        default: false
      },
      token: String,
      expiresAt: Date,
      accessCount: {
        type: Number,
        default: 0
      }
    }
  },
  tags: [String],
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'reportrequests'
});

// Compound indexes for efficient queries
reportRequestSchema.index({ tenantId: 1, reportType: 1, createdAt: -1 });
reportRequestSchema.index({ tenantId: 1, 'requestedBy.userId': 1, createdAt: -1 });
reportRequestSchema.index({ status: 1, priority: 1, createdAt: 1 });
reportRequestSchema.index({ scheduledAt: 1, status: 1 });
reportRequestSchema.index({ 'recurringConfig.nextRun': 1, 'recurringConfig.isActive': 1 });

// TTL index for automatic cleanup (configurable retention)
reportRequestSchema.index({ 
  'fileInfo.expiresAt': 1 
}, { 
  expireAfterSeconds: 0 // Expire when expiresAt is reached
});

// Virtual for processing time
reportRequestSchema.virtual('processingTime').get(function() {
  if (this.startedAt && this.completedAt) {
    return this.completedAt - this.startedAt;
  }
  return null;
});

// Virtual for file size formatted
reportRequestSchema.virtual('formattedFileSize').get(function() {
  if (!this.fileInfo?.fileSize) return null;
  
  const bytes = this.fileInfo.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Instance methods
reportRequestSchema.methods.startProcessing = function() {
  this.status = 'PROCESSING';
  this.startedAt = new Date();
  return this.save();
};

reportRequestSchema.methods.completeProcessing = function(fileInfo, reportData = null) {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  this.processingDuration = this.completedAt - this.startedAt;
  this.fileInfo = {
    ...this.fileInfo,
    ...fileInfo,
    expiresAt: new Date(Date.now() + (parseInt(process.env.REPORT_RETENTION_DAYS) || 30) * 24 * 60 * 60 * 1000)
  };
  
  if (reportData) {
    this.reportData = reportData;
  }
  
  return this.save();
};

reportRequestSchema.methods.failProcessing = function(error) {
  this.status = 'FAILED';
  this.completedAt = new Date();
  this.processingDuration = this.completedAt - this.startedAt;
  this.error = {
    code: error.code || 'PROCESSING_ERROR',
    message: error.message || 'Report processing failed',
    details: error.details || null,
    stackTrace: error.stack || null
  };
  return this.save();
};

reportRequestSchema.methods.cancel = function(reason = 'User cancelled') {
  this.status = 'CANCELLED';
  this.completedAt = new Date();
  this.error = {
    code: 'CANCELLED',
    message: reason
  };
  return this.save();
};

reportRequestSchema.methods.canRetry = function() {
  return this.retryCount < 3 && this.status === 'FAILED';
};

reportRequestSchema.methods.scheduleRetry = function(delayMinutes = 10) {
  if (this.canRetry()) {
    this.retryCount += 1;
    this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    this.status = 'PENDING';
    this.error = null;
    return this.save();
  }
  return Promise.resolve(this);
};

reportRequestSchema.methods.incrementDownload = function() {
  if (!this.fileInfo) this.fileInfo = {};
  this.fileInfo.downloadCount = (this.fileInfo.downloadCount || 0) + 1;
  this.fileInfo.lastDownloadedAt = new Date();
  return this.save();
};

reportRequestSchema.methods.shareWith = function(userId, role, permissions = ['VIEW'], sharedBy) {
  if (!this.sharing) this.sharing = { isShared: false, sharedWith: [] };
  
  // Remove existing share for this user
  this.sharing.sharedWith = this.sharing.sharedWith.filter(share => share.userId !== userId);
  
  // Add new share
  this.sharing.sharedWith.push({
    userId,
    role,
    permissions,
    sharedAt: new Date(),
    sharedBy
  });
  
  this.sharing.isShared = true;
  return this.save();
};

reportRequestSchema.methods.generatePublicLink = function(expirationHours = 24) {
  if (!this.sharing) this.sharing = {};
  
  this.sharing.publicLink = {
    enabled: true,
    token: require('crypto').randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000),
    accessCount: 0
  };
  
  return this.save();
};

reportRequestSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

// Static methods
reportRequestSchema.statics.findByTenant = function(tenantId, options = {}) {
  const query = { tenantId, isArchived: false };
  
  if (options.reportType) query.reportType = options.reportType;
  if (options.status) query.status = options.status;
  if (options.requestedBy) query['requestedBy.userId'] = options.requestedBy;
  if (options.branchId) query.branchId = options.branchId;
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

reportRequestSchema.statics.getPendingReports = function(limit = 100) {
  return this.find({
    status: 'PENDING',
    isArchived: false,
    $or: [
      { scheduledAt: { $exists: false } },
      { scheduledAt: { $lte: new Date() } }
    ]
  })
  .sort({ priority: 1, createdAt: 1 })
  .limit(limit);
};

reportRequestSchema.statics.getReportStats = function(tenantId, dateRange = {}) {
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
          reportType: '$reportType',
          status: '$status'
        },
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$processingDuration' },
        totalFileSize: { $sum: '$fileInfo.fileSize' },
        totalDownloads: { $sum: '$fileInfo.downloadCount' }
      }
    },
    {
      $group: {
        _id: '$_id.reportType',
        statusBreakdown: {
          $push: {
            status: '$_id.status',
            count: '$count',
            avgProcessingTime: '$avgProcessingTime',
            totalFileSize: '$totalFileSize',
            totalDownloads: '$totalDownloads'
          }
        },
        totalReports: { $sum: '$count' }
      }
    },
    { $sort: { totalReports: -1 } }
  ]);
};

reportRequestSchema.statics.getRecurringReports = function() {
  return this.find({
    isRecurring: true,
    'recurringConfig.isActive': true,
    'recurringConfig.nextRun': { $lte: new Date() },
    isArchived: false
  })
  .sort({ 'recurringConfig.nextRun': 1 });
};

reportRequestSchema.statics.getUserReports = function(tenantId, userId, options = {}) {
  const query = {
    tenantId,
    'requestedBy.userId': userId,
    isArchived: false
  };
  
  if (options.status) query.status = options.status;
  if (options.reportType) query.reportType = options.reportType;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .select('reportId reportType status createdAt completedAt fileInfo.fileName fileInfo.fileSize');
};

reportRequestSchema.statics.getExpiredReports = function() {
  return this.find({
    'fileInfo.expiresAt': { $lte: new Date() },
    status: 'COMPLETED',
    isArchived: false
  });
};

reportRequestSchema.statics.getPopularReports = function(tenantId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: startDate },
        status: 'COMPLETED',
        isArchived: false
      }
    },
    {
      $group: {
        _id: '$reportType',
        requestCount: { $sum: 1 },
        totalDownloads: { $sum: '$fileInfo.downloadCount' },
        avgProcessingTime: { $avg: '$processingDuration' },
        uniqueUsers: { $addToSet: '$requestedBy.userId' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { requestCount: -1 } },
    { $limit: 10 }
  ]);
};

module.exports = mongoose.model('ReportRequest', reportRequestSchema);