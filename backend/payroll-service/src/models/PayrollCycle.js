const mongoose = require('mongoose');

const payrollCycleSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'processing', 'completed', 'finalized'],
    default: 'draft',
    index: true
  },
  totalEmployees: {
    type: Number,
    default: 0
  },
  processedEmployees: {
    type: Number,
    default: 0
  },
  totalPayroll: {
    type: Number,
    default: 0
  },
  totalAllowances: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  netPayroll: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    maxlength: 500
  },
  processingStartedAt: {
    type: Date
  },
  processingCompletedAt: {
    type: Date
  },
  finalizedAt: {
    type: Date
  },
  finalizedBy: {
    type: String
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    processingErrors: [{
      employeeId: String,
      error: String,
      timestamp: Date
    }],
    processingWarnings: [{
      employeeId: String,
      warning: String,
      timestamp: Date
    }],
    auditLog: [{
      action: String,
      performedBy: String,
      timestamp: Date,
      details: mongoose.Schema.Types.Mixed
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
payrollCycleSchema.index({ tenantId: 1, month: 1, year: 1 }, { unique: true });
payrollCycleSchema.index({ tenantId: 1, status: 1 });
payrollCycleSchema.index({ tenantId: 1, createdAt: -1 });

// Virtual for completion percentage
payrollCycleSchema.virtual('completionPercentage').get(function() {
  if (this.totalEmployees === 0) return 0;
  return Math.round((this.processedEmployees / this.totalEmployees) * 100);
});

// Virtual for period display
payrollCycleSchema.virtual('periodDisplay').get(function() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[this.month - 1]} ${this.year}`;
});

// Pre-save middleware
payrollCycleSchema.pre('save', function(next) {
  // Validate date range
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Update net payroll
  this.netPayroll = this.totalPayroll - this.totalDeductions + this.totalAllowances;
  
  next();
});

// Static methods
payrollCycleSchema.statics.findByTenant = function(tenantId) {
  return this.find({ tenantId, isDeleted: false }).sort({ createdAt: -1 });
};

payrollCycleSchema.statics.findCurrentCycle = function(tenantId) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  return this.findOne({
    tenantId,
    month: currentMonth,
    year: currentYear,
    isDeleted: false
  });
};

payrollCycleSchema.statics.findActiveCycles = function(tenantId) {
  return this.find({
    tenantId,
    status: { $in: ['draft', 'processing', 'completed'] },
    isDeleted: false
  }).sort({ createdAt: -1 });
};

// Instance methods
payrollCycleSchema.methods.canProcess = function() {
  return this.status === 'draft';
};

payrollCycleSchema.methods.canFinalize = function() {
  return this.status === 'completed';
};

payrollCycleSchema.methods.addAuditLog = function(action, performedBy, details = {}) {
  this.metadata.auditLog.push({
    action,
    performedBy,
    timestamp: new Date(),
    details
  });
};

payrollCycleSchema.methods.addProcessingError = function(employeeId, error) {
  this.metadata.processingErrors.push({
    employeeId,
    error,
    timestamp: new Date()
  });
};

payrollCycleSchema.methods.addProcessingWarning = function(employeeId, warning) {
  this.metadata.processingWarnings.push({
    employeeId,
    warning,
    timestamp: new Date()
  });
};

module.exports = mongoose.model('PayrollCycle', payrollCycleSchema);