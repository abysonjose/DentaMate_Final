const mongoose = require('mongoose');

const diagnosticAIResultSchema = new mongoose.Schema({
  resultId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  uploadId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    required: true,
    index: true
  },
  aiServiceVersion: {
    type: String,
    required: true
  },
  analysisType: {
    type: String,
    required: true,
    enum: ['CAVITY_DETECTION', 'BONE_LOSS_ANALYSIS', 'XRAY_ANALYSIS', 'ANOMALY_DETECTION', 'MEASUREMENT']
  },
  status: {
    type: String,
    required: true,
    enum: ['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PROCESSING',
    index: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  findings: [{
    type: {
      type: String,
      required: true,
      enum: ['CAVITY', 'BONE_LOSS', 'FRACTURE', 'ANOMALY', 'NORMAL', 'ARTIFACT']
    },
    location: {
      tooth: String,
      quadrant: String,
      surface: String,
      coordinates: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    },
    severity: {
      type: String,
      enum: ['MILD', 'MODERATE', 'SEVERE', 'CRITICAL']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    description: String,
    measurements: {
      area: Number,
      depth: Number,
      volume: Number,
      unit: String
    }
  }],
  heatmapUrl: String, // XAI heatmap visualization
  annotatedImageUrl: String, // Image with AI annotations
  processingMetrics: {
    processingTime: Number, // milliseconds
    modelVersion: String,
    gpuUsed: Boolean,
    memoryUsed: Number,
    cpuTime: Number
  },
  qualityAssessment: {
    imageQuality: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR']
    },
    artifacts: [String],
    recommendations: [String]
  },
  reviewStatus: {
    type: String,
    enum: ['PENDING_REVIEW', 'REVIEWED', 'APPROVED', 'REJECTED'],
    default: 'PENDING_REVIEW',
    index: true
  },
  reviewedBy: {
    type: String,
    index: true
  },
  reviewedAt: Date,
  reviewNotes: String,
  errorDetails: {
    errorCode: String,
    errorMessage: String,
    stackTrace: String
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
diagnosticAIResultSchema.index({ tenantId: 1, orderId: 1, status: 1 });
diagnosticAIResultSchema.index({ tenantId: 1, branchId: 1, analysisType: 1 });
diagnosticAIResultSchema.index({ uploadId: 1, analysisType: 1 });
diagnosticAIResultSchema.index({ reviewStatus: 1, reviewedBy: 1 });

// Virtual for order details
diagnosticAIResultSchema.virtual('order', {
  ref: 'DiagnosticOrder',
  localField: 'orderId',
  foreignField: 'orderId',
  justOne: true
});

// Virtual for upload details
diagnosticAIResultSchema.virtual('upload', {
  ref: 'DiagnosticUpload',
  localField: 'uploadId',
  foreignField: 'uploadId',
  justOne: true
});

// Static methods
diagnosticAIResultSchema.statics.findByOrder = function(orderId, filters = {}) {
  return this.find({ orderId, isActive: true, ...filters });
};

diagnosticAIResultSchema.statics.findByTenant = function(tenantId, filters = {}) {
  return this.find({ tenantId, isActive: true, ...filters });
};

diagnosticAIResultSchema.statics.findPendingReview = function(tenantId, branchId = null) {
  const query = {
    tenantId,
    reviewStatus: 'PENDING_REVIEW',
    status: 'COMPLETED',
    isActive: true
  };
  
  if (branchId) {
    query.branchId = branchId;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

diagnosticAIResultSchema.statics.getAnalyticsData = function(tenantId, branchId, dateRange) {
  const matchStage = {
    tenantId,
    isActive: true,
    createdAt: {
      $gte: dateRange.start,
      $lte: dateRange.end
    }
  };
  
  if (branchId) {
    matchStage.branchId = branchId;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          analysisType: '$analysisType',
          status: '$status'
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        avgProcessingTime: { $avg: '$processingMetrics.processingTime' }
      }
    },
    {
      $group: {
        _id: '$_id.analysisType',
        statusBreakdown: {
          $push: {
            status: '$_id.status',
            count: '$count',
            avgConfidence: '$avgConfidence',
            avgProcessingTime: '$avgProcessingTime'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

// Instance methods
diagnosticAIResultSchema.methods.markAsReviewed = function(reviewedBy, reviewNotes = '', approved = true) {
  this.reviewStatus = approved ? 'APPROVED' : 'REJECTED';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewNotes = reviewNotes;
  return this.save();
};

diagnosticAIResultSchema.methods.updateStatus = function(status, errorDetails = null) {
  this.status = status;
  if (errorDetails) {
    this.errorDetails = errorDetails;
  }
  return this.save();
};

diagnosticAIResultSchema.methods.addFinding = function(finding) {
  this.findings.push(finding);
  return this.save();
};

diagnosticAIResultSchema.methods.getSummary = function() {
  const summary = {
    resultId: this.resultId,
    orderId: this.orderId,
    analysisType: this.analysisType,
    status: this.status,
    confidence: this.confidence,
    findingsCount: this.findings.length,
    reviewStatus: this.reviewStatus,
    createdAt: this.createdAt
  };
  
  if (this.findings.length > 0) {
    summary.criticalFindings = this.findings.filter(f => f.severity === 'CRITICAL').length;
    summary.severeFindings = this.findings.filter(f => f.severity === 'SEVERE').length;
    summary.avgFindingConfidence = this.findings.reduce((sum, f) => sum + (f.confidence || 0), 0) / this.findings.length;
  }
  
  return summary;
};

module.exports = mongoose.model('DiagnosticAIResult', diagnosticAIResultSchema);