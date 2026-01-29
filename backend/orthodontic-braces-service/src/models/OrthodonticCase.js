const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orthodonticCaseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  appointmentId: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  orthotistId: {
    type: String,
    default: null,
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
  caseType: {
    type: String,
    enum: ['BRACES', 'ALIGNERS', 'RETAINERS'],
    required: true
  },
  status: {
    type: String,
    enum: [
      'CREATED',
      'RECEIVED',
      'IN_REVIEW',
      'IN_FABRICATION',
      'QUALITY_CHECK',
      'READY',
      'DELIVERED'
    ],
    default: 'CREATED',
    required: true
  },
  priority: {
    type: String,
    enum: ['NORMAL', 'URGENT'],
    default: 'NORMAL',
    required: true
  },
  doctorNotes: {
    type: String,
    required: true
  },
  orthotistNotes: {
    type: String,
    default: ''
  },
  estimatedDeliveryDate: {
    type: Date,
    default: null
  },
  actualDeliveryDate: {
    type: Date,
    default: null
  },
  fabricationDetails: {
    applianceType: {
      type: String,
      default: ''
    },
    material: {
      type: String,
      default: ''
    },
    internalNotes: {
      type: String,
      default: ''
    }
  },
  issues: [{
    issueId: {
      type: String,
      default: uuidv4
    },
    type: {
      type: String,
      enum: ['INCOMPLETE_MEASUREMENTS', 'MATERIAL_ISSUES', 'CLARIFICATION_NEEDED', 'OTHER'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    reportedBy: {
      type: String,
      required: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
      default: 'OPEN'
    },
    resolution: {
      type: String,
      default: ''
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  }],
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: String,
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    }
  }],
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'orthodontic_cases'
});

// Indexes for performance
orthodonticCaseSchema.index({ tenantId: 1, branchId: 1 });
orthodonticCaseSchema.index({ patientId: 1, tenantId: 1 });
orthodonticCaseSchema.index({ doctorId: 1, tenantId: 1 });
orthodonticCaseSchema.index({ orthotistId: 1, tenantId: 1 });
orthodonticCaseSchema.index({ status: 1, tenantId: 1 });
orthodonticCaseSchema.index({ createdAt: -1 });

// Pre-save middleware to add status history
orthodonticCaseSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this.updatedBy,
      changedAt: new Date()
    });
  }
  next();
});

// Virtual for case age in days
orthodonticCaseSchema.virtual('caseAgeInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to check if case is overdue
orthodonticCaseSchema.methods.isOverdue = function() {
  if (!this.estimatedDeliveryDate) return false;
  return new Date() > this.estimatedDeliveryDate && this.status !== 'DELIVERED';
};

// Method to get current issue count
orthodonticCaseSchema.methods.getOpenIssueCount = function() {
  return this.issues.filter(issue => issue.status === 'OPEN').length;
};

// Static method to find cases by filters
orthodonticCaseSchema.statics.findByFilters = function(filters) {
  const query = {};
  
  if (filters.tenantId) query.tenantId = filters.tenantId;
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.patientId) query.patientId = filters.patientId;
  if (filters.doctorId) query.doctorId = filters.doctorId;
  if (filters.orthotistId) query.orthotistId = filters.orthotistId;
  if (filters.status) query.status = filters.status;
  if (filters.caseType) query.caseType = filters.caseType;
  if (filters.priority) query.priority = filters.priority;
  
  return this.find(query);
};

module.exports = mongoose.model('OrthodonticCase', orthodonticCaseSchema);