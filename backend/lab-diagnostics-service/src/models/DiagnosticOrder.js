const mongoose = require('mongoose');

const diagnosticOrderSchema = new mongoose.Schema({
  orderId: {
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
    required: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  appointmentId: {
    type: String,
    required: true,
    index: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  testType: {
    type: String,
    required: true,
    enum: ['XRAY', 'CBCT', 'MRI', 'DENTAL_SCAN', 'PANORAMIC', 'BITEWING', 'PERIAPICAL', 'CEPHALOMETRIC'],
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['NORMAL', 'URGENT', 'STAT'],
    default: 'NORMAL',
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'CREATED',
    index: true
  },
  assignedLabStaffId: {
    type: String,
    index: true
  },
  doctorNotes: {
    type: String,
    maxlength: 1000
  },
  labNotes: {
    type: String,
    maxlength: 1000
  },
  estimatedCompletionTime: {
    type: Date
  },
  actualCompletionTime: {
    type: Date
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    updatedBy: {
      type: String,
      required: true
    },
    notes: String
  }],
  metadata: {
    bodyPart: String,
    technique: String,
    contrast: Boolean,
    specialInstructions: String
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

// Compound indexes for efficient queries
diagnosticOrderSchema.index({ tenantId: 1, branchId: 1, status: 1 });
diagnosticOrderSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });
diagnosticOrderSchema.index({ tenantId: 1, doctorId: 1, createdAt: -1 });
diagnosticOrderSchema.index({ tenantId: 1, assignedLabStaffId: 1, status: 1 });
diagnosticOrderSchema.index({ appointmentId: 1, testType: 1 });

// Virtual for uploads
diagnosticOrderSchema.virtual('uploads', {
  ref: 'DiagnosticUpload',
  localField: 'orderId',
  foreignField: 'orderId'
});

// Virtual for AI results
diagnosticOrderSchema.virtual('aiResults', {
  ref: 'DiagnosticAIResult',
  localField: 'orderId',
  foreignField: 'orderId'
});

// Pre-save middleware to update status history
diagnosticOrderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this.modifiedBy || 'system',
      notes: this.statusChangeNotes
    });
  }
  next();
});

// Static methods
diagnosticOrderSchema.statics.findByTenant = function(tenantId, filters = {}) {
  return this.find({ tenantId, isActive: true, ...filters });
};

diagnosticOrderSchema.statics.findByBranch = function(tenantId, branchId, filters = {}) {
  return this.find({ tenantId, branchId, isActive: true, ...filters });
};

diagnosticOrderSchema.statics.findByPatient = function(tenantId, patientId, filters = {}) {
  return this.find({ tenantId, patientId, isActive: true, ...filters });
};

diagnosticOrderSchema.statics.findByDoctor = function(tenantId, doctorId, filters = {}) {
  return this.find({ tenantId, doctorId, isActive: true, ...filters });
};

diagnosticOrderSchema.statics.findWorklist = function(tenantId, branchId, labStaffId = null) {
  const query = {
    tenantId,
    branchId,
    isActive: true,
    status: { $in: ['CREATED', 'ASSIGNED', 'IN_PROGRESS'] }
  };
  
  if (labStaffId) {
    query.assignedLabStaffId = labStaffId;
  }
  
  return this.find(query).sort({ priority: -1, createdAt: 1 });
};

// Instance methods
diagnosticOrderSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '') {
  this.status = newStatus;
  this.modifiedBy = updatedBy;
  this.statusChangeNotes = notes;
  
  if (newStatus === 'COMPLETED') {
    this.actualCompletionTime = new Date();
  }
  
  return this.save();
};

diagnosticOrderSchema.methods.assignToLabStaff = function(labStaffId, assignedBy) {
  this.assignedLabStaffId = labStaffId;
  this.status = 'ASSIGNED';
  this.modifiedBy = assignedBy;
  this.statusChangeNotes = `Assigned to lab staff: ${labStaffId}`;
  
  return this.save();
};

module.exports = mongoose.model('DiagnosticOrder', diagnosticOrderSchema);