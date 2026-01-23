const mongoose = require('mongoose');

const labResultSchema = new mongoose.Schema({
  // Reference Information
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabRequest',
    required: true,
    index: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabTest',
    required: true
  },
  testName: {
    type: String,
    required: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  
  // Result Data
  value: {
    type: String,
    required: true
  },
  numericValue: Number, // For numeric results to enable range comparisons
  unit: String,
  referenceRange: {
    min: Number,
    max: Number,
    text: String // For non-numeric ranges like "Negative", "Positive"
  },
  
  // Result Status
  status: {
    type: String,
    enum: ['normal', 'abnormal', 'critical', 'pending', 'invalid'],
    required: true,
    index: true
  },
  interpretation: {
    type: String,
    enum: ['normal', 'low', 'high', 'critical-low', 'critical-high', 'abnormal', 'positive', 'negative']
  },
  
  // Timing
  resultDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  sampleCollectedAt: Date,
  processedAt: Date,
  
  // Quality and Validation
  qualityFlags: [{
    type: {
      type: String,
      enum: ['hemolyzed', 'lipemic', 'icteric', 'clotted', 'insufficient-sample', 'contaminated']
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    impact: String
  }],
  
  // Staff Information
  technician: {
    id: String,
    name: String,
    credentials: String
  },
  reviewedBy: {
    id: String,
    name: String,
    credentials: String
  },
  reviewedAt: Date,
  
  // Clinical Significance
  flagged: {
    type: Boolean,
    default: false,
    index: true
  },
  criticalValue: {
    type: Boolean,
    default: false,
    index: true
  },
  deltaCheck: {
    previousValue: String,
    previousDate: Date,
    percentChange: Number,
    significant: Boolean
  },
  
  // Notes and Comments
  notes: String,
  technicalNotes: String, // Internal lab notes
  clinicalNotes: String,  // Notes for doctor
  
  // Attachments
  attachments: [{
    fileName: String,
    fileType: String,
    filePath: String,
    fileSize: Number,
    uploadedAt: Date,
    uploadedBy: String
  }],
  
  // AI Analysis
  aiAnalysis: {
    analysisId: String,
    confidence: Number,
    findings: [String],
    recommendations: [String],
    processedAt: Date,
    modelVersion: String
  },
  
  // Communication
  notifications: [{
    type: {
      type: String,
      enum: ['result-ready', 'critical-result', 'abnormal-result', 'review-required']
    },
    recipient: String,
    sentAt: Date,
    readAt: Date,
    acknowledged: Boolean
  }],
  
  // Audit Trail
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: String,
  
  // Validation and Approval
  validationStatus: {
    type: String,
    enum: ['pending', 'validated', 'rejected', 'requires-review'],
    default: 'pending'
  },
  validatedBy: {
    id: String,
    name: String,
    timestamp: Date
  },
  
  // External Integration
  externalResultId: String,
  instrumentId: String,
  instrumentName: String,
  methodUsed: String,
  
  // Metadata
  version: {
    type: Number,
    default: 1
  },
  isAmended: {
    type: Boolean,
    default: false
  },
  amendmentReason: String,
  originalResultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabResult'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
labResultSchema.index({ tenantId: 1, patientId: 1, resultDate: -1 });
labResultSchema.index({ doctorId: 1, status: 1, resultDate: -1 });
labResultSchema.index({ requestId: 1, testId: 1 });
labResultSchema.index({ criticalValue: 1, flagged: 1 });
labResultSchema.index({ validationStatus: 1, createdAt: -1 });

// Virtual for age of result
labResultSchema.virtual('ageInHours').get(function() {
  return Math.floor((new Date() - this.resultDate) / (1000 * 60 * 60));
});

// Virtual for turnaround time
labResultSchema.virtual('turnaroundTime').get(function() {
  if (!this.sampleCollectedAt) return null;
  return Math.floor((this.resultDate - this.sampleCollectedAt) / (1000 * 60 * 60));
});

// Virtual for critical alert status
labResultSchema.virtual('requiresImmediateAttention').get(function() {
  return this.criticalValue || (this.status === 'abnormal' && this.flagged);
});

// Pre-save middleware
labResultSchema.pre('save', function(next) {
  // Auto-flag critical values
  if (this.status === 'critical') {
    this.criticalValue = true;
    this.flagged = true;
  }
  
  // Set interpretation based on reference range
  if (this.numericValue && this.referenceRange && this.referenceRange.min && this.referenceRange.max) {
    if (this.numericValue < this.referenceRange.min) {
      this.interpretation = 'low';
    } else if (this.numericValue > this.referenceRange.max) {
      this.interpretation = 'high';
    } else {
      this.interpretation = 'normal';
    }
  }
  
  next();
});

// Static methods
labResultSchema.statics.getCriticalResults = function(tenantId, timeframe = 24) {
  const cutoffTime = new Date(Date.now() - (timeframe * 60 * 60 * 1000));
  
  return this.find({
    tenantId,
    criticalValue: true,
    resultDate: { $gte: cutoffTime },
    'notifications.acknowledged': { $ne: true }
  }).populate('requestId', 'patientName doctorName');
};

labResultSchema.statics.getPatientResults = function(patientId, tenantId, filters = {}) {
  const query = { patientId, tenantId };
  
  if (filters.testName) query.testName = new RegExp(filters.testName, 'i');
  if (filters.dateFrom) query.resultDate = { $gte: new Date(filters.dateFrom) };
  if (filters.dateTo) {
    query.resultDate = query.resultDate || {};
    query.resultDate.$lte = new Date(filters.dateTo);
  }
  if (filters.status) query.status = filters.status;
  
  return this.find(query)
    .populate('requestId', 'doctorName appointmentId')
    .sort({ resultDate: -1 })
    .limit(filters.limit || 100);
};

labResultSchema.statics.getTrendData = function(patientId, testName, tenantId, months = 12) {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  
  return this.find({
    patientId,
    testName,
    tenantId,
    resultDate: { $gte: cutoffDate },
    numericValue: { $exists: true }
  })
  .select('numericValue resultDate unit')
  .sort({ resultDate: 1 });
};

module.exports = mongoose.model('LabResult', labResultSchema);