const mongoose = require('mongoose');

const diagnosticUploadSchema = new mongoose.Schema({
  uploadId: {
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
  fileName: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf', 'application/dicom']
  },
  fileSize: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true,
    index: true
  },
  uploadedByRole: {
    type: String,
    required: true,
    enum: ['LAB_STAFF', 'DOCTOR', 'NURSE', 'SYSTEM']
  },
  category: {
    type: String,
    required: true,
    enum: ['IMAGE', 'REPORT', 'SCAN', 'DOCUMENT'],
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  isLatestVersion: {
    type: Boolean,
    default: true,
    index: true
  },
  replacedBy: {
    type: String, // uploadId of the replacement file
    index: true
  },
  replaces: {
    type: String, // uploadId of the file being replaced
    index: true
  },
  metadata: {
    dimensions: {
      width: Number,
      height: Number
    },
    resolution: {
      x: Number,
      y: Number,
      unit: String
    },
    colorSpace: String,
    compression: String,
    equipment: {
      manufacturer: String,
      model: String,
      serialNumber: String
    },
    acquisitionParameters: {
      kvp: Number,
      mas: Number,
      exposureTime: Number,
      filterType: String
    }
  },
  processingStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
    index: true
  },
  aiAnalysisStatus: {
    type: String,
    enum: ['NOT_SENT', 'SENT', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'NOT_SENT',
    index: true
  },
  aiAnalysisId: {
    type: String,
    index: true
  },
  checksums: {
    md5: String,
    sha256: String
  },
  accessLog: [{
    accessedBy: {
      type: String,
      required: true
    },
    accessedByRole: {
      type: String,
      required: true
    },
    accessType: {
      type: String,
      enum: ['VIEW', 'DOWNLOAD', 'SHARE'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  deletedBy: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
diagnosticUploadSchema.index({ tenantId: 1, orderId: 1, isLatestVersion: 1 });
diagnosticUploadSchema.index({ tenantId: 1, branchId: 1, uploadedBy: 1 });
diagnosticUploadSchema.index({ orderId: 1, category: 1, isActive: 1 });
diagnosticUploadSchema.index({ aiAnalysisStatus: 1, processingStatus: 1 });

// Virtual for order details
diagnosticUploadSchema.virtual('order', {
  ref: 'DiagnosticOrder',
  localField: 'orderId',
  foreignField: 'orderId',
  justOne: true
});

// Static methods
diagnosticUploadSchema.statics.findByOrder = function(orderId, includeDeleted = false) {
  const query = { orderId, isActive: true };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  return this.find(query).sort({ version: -1, createdAt: -1 });
};

diagnosticUploadSchema.statics.findLatestByOrder = function(orderId) {
  return this.find({ 
    orderId, 
    isActive: true, 
    isDeleted: false, 
    isLatestVersion: true 
  }).sort({ createdAt: -1 });
};

diagnosticUploadSchema.statics.findByTenant = function(tenantId, filters = {}) {
  return this.find({ 
    tenantId, 
    isActive: true, 
    isDeleted: false, 
    ...filters 
  });
};

diagnosticUploadSchema.statics.findPendingAIAnalysis = function() {
  return this.find({
    aiAnalysisStatus: 'NOT_SENT',
    processingStatus: 'COMPLETED',
    category: 'IMAGE',
    isActive: true,
    isDeleted: false,
    isLatestVersion: true
  });
};

// Instance methods
diagnosticUploadSchema.methods.logAccess = function(accessedBy, accessedByRole, accessType, metadata = {}) {
  this.accessLog.push({
    accessedBy,
    accessedByRole,
    accessType,
    timestamp: new Date(),
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });
  return this.save();
};

diagnosticUploadSchema.methods.markAsReplaced = function(replacementUploadId) {
  this.isLatestVersion = false;
  this.replacedBy = replacementUploadId;
  return this.save();
};

diagnosticUploadSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

diagnosticUploadSchema.methods.updateAIAnalysisStatus = function(status, analysisId = null) {
  this.aiAnalysisStatus = status;
  if (analysisId) {
    this.aiAnalysisId = analysisId;
  }
  return this.save();
};

// Pre-save middleware
diagnosticUploadSchema.pre('save', function(next) {
  // If this is a new version, mark previous versions as not latest
  if (this.isNew && this.replaces) {
    this.constructor.updateOne(
      { uploadId: this.replaces },
      { isLatestVersion: false, replacedBy: this.uploadId }
    ).exec();
  }
  next();
});

module.exports = mongoose.model('DiagnosticUpload', diagnosticUploadSchema);