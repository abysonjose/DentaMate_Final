const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const measurementSchema = new mongoose.Schema({
  measurementId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  caseId: {
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
  type: {
    type: String,
    enum: ['DENTAL_IMPRESSION', 'INTRAORAL_SCAN', 'XRAY_REFERENCE', 'PHOTO', 'OTHER'],
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'INCOMPLETE'],
    default: 'PENDING',
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  version: {
    type: Number,
    default: 1,
    required: true
  },
  isLatestVersion: {
    type: Boolean,
    default: true,
    required: true
  },
  previousVersionId: {
    type: String,
    default: null
  },
  uploadedBy: {
    type: String,
    required: true
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  metadata: {
    scannerType: {
      type: String,
      default: ''
    },
    resolution: {
      type: String,
      default: ''
    },
    captureDate: {
      type: Date,
      default: null
    },
    technicalNotes: {
      type: String,
      default: ''
    }
  },
  auditLog: [{
    action: {
      type: String,
      enum: ['UPLOADED', 'APPROVED', 'REJECTED', 'UPDATED', 'REPLACED'],
      required: true
    },
    performedBy: {
      type: String,
      required: true
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    }
  }]
}, {
  timestamps: true,
  collection: 'measurements'
});

// Indexes for performance
measurementSchema.index({ caseId: 1, tenantId: 1 });
measurementSchema.index({ tenantId: 1, branchId: 1 });
measurementSchema.index({ uploadedBy: 1, tenantId: 1 });
measurementSchema.index({ status: 1, tenantId: 1 });
measurementSchema.index({ isLatestVersion: 1, caseId: 1 });
measurementSchema.index({ createdAt: -1 });

// Pre-save middleware to handle versioning
measurementSchema.pre('save', async function(next) {
  if (this.isNew) {
    // For new measurements, check if there are existing measurements for the same case and type
    const existingCount = await this.constructor.countDocuments({
      caseId: this.caseId,
      type: this.type,
      tenantId: this.tenantId
    });
    
    if (existingCount > 0) {
      // Mark previous versions as not latest
      await this.constructor.updateMany(
        {
          caseId: this.caseId,
          type: this.type,
          tenantId: this.tenantId,
          isLatestVersion: true
        },
        { isLatestVersion: false }
      );
      
      this.version = existingCount + 1;
    }
    
    // Add upload audit log
    this.auditLog.push({
      action: 'UPLOADED',
      performedBy: this.uploadedBy,
      performedAt: new Date()
    });
  }
  
  next();
});

// Method to approve measurement
measurementSchema.methods.approve = function(reviewedBy, reviewNotes = '') {
  this.status = 'APPROVED';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewNotes = reviewNotes;
  
  this.auditLog.push({
    action: 'APPROVED',
    performedBy: reviewedBy,
    performedAt: new Date(),
    notes: reviewNotes
  });
  
  return this.save();
};

// Method to reject measurement
measurementSchema.methods.reject = function(reviewedBy, reviewNotes = '') {
  this.status = 'REJECTED';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.reviewNotes = reviewNotes;
  
  this.auditLog.push({
    action: 'REJECTED',
    performedBy: reviewedBy,
    performedAt: new Date(),
    notes: reviewNotes
  });
  
  return this.save();
};

// Static method to get latest measurements for a case
measurementSchema.statics.getLatestForCase = function(caseId, tenantId) {
  return this.find({
    caseId,
    tenantId,
    isLatestVersion: true
  }).sort({ createdAt: -1 });
};

// Static method to get measurement history
measurementSchema.statics.getHistory = function(caseId, type, tenantId) {
  return this.find({
    caseId,
    type,
    tenantId
  }).sort({ version: -1 });
};

// Virtual for file size in MB
measurementSchema.virtual('fileSizeInMB').get(function() {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

module.exports = mongoose.model('Measurement', measurementSchema);