const mongoose = require('mongoose');

const labRequestTestSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabTest',
    required: true
  },
  testName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  sampleType: {
    type: String,
    enum: ['blood', 'urine', 'saliva', 'tissue', 'swab', 'other'],
    required: true
  },
  instructions: String,
  status: {
    type: String,
    enum: ['requested', 'sample-collected', 'in-progress', 'completed', 'cancelled'],
    default: 'requested'
  },
  results: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabResult'
  }],
  assignedTo: {
    type: String, // Lab staff user ID
    default: null
  },
  startedAt: Date,
  completedAt: Date
});

const labRequestSchema = new mongoose.Schema({
  // Basic Information
  patientId: {
    type: String,
    required: true,
    index: true
  },
  patientName: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  doctorName: {
    type: String,
    required: true
  },
  appointmentId: {
    type: String,
    index: true
  },
  
  // Request Details
  requestDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  tests: [labRequestTestSchema],
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine',
    index: true
  },
  status: {
    type: String,
    enum: ['requested', 'assigned', 'sample-collected', 'in-progress', 'completed', 'cancelled', 'on-hold'],
    default: 'requested',
    index: true
  },
  
  // Clinical Information
  clinicalNotes: String,
  diagnosis: String,
  symptoms: [String],
  medicalHistory: String,
  
  // Lab Information
  labId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabProvider'
  },
  labName: String,
  assignedLabStaff: {
    type: String, // Lab staff user ID
    index: true
  },
  
  // Timing
  expectedCompletionDate: Date,
  actualCompletionDate: Date,
  sampleCollectionDate: Date,
  
  // Financial
  totalCost: {
    type: Number,
    default: 0
  },
  insuranceCovered: {
    type: Boolean,
    default: false
  },
  insuranceClaimNumber: String,
  
  // Workflow
  workflowSteps: [{
    stepName: String,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'skipped']
    },
    startTime: Date,
    endTime: Date,
    assignedTo: String,
    notes: String
  }],
  
  // Quality Control
  qualityChecks: [{
    checkType: String,
    status: {
      type: String,
      enum: ['passed', 'failed', 'pending']
    },
    performedBy: String,
    performedAt: Date,
    notes: String
  }],
  
  // Communication
  notifications: [{
    type: {
      type: String,
      enum: ['status-change', 'result-ready', 'urgent-result', 'error', 'reminder']
    },
    recipient: String,
    message: String,
    sentAt: Date,
    readAt: Date
  }],
  
  // Audit Trail
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
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: String,
  
  // Metadata
  tags: [String],
  isUrgent: {
    type: Boolean,
    default: false,
    index: true
  },
  isCritical: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // External Integration
  externalLabId: String,
  externalRequestId: String,
  integrationStatus: {
    type: String,
    enum: ['pending', 'sent', 'acknowledged', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
labRequestSchema.index({ tenantId: 1, status: 1, requestDate: -1 });
labRequestSchema.index({ doctorId: 1, status: 1, requestDate: -1 });
labRequestSchema.index({ patientId: 1, requestDate: -1 });
labRequestSchema.index({ assignedLabStaff: 1, status: 1 });
labRequestSchema.index({ priority: 1, status: 1, requestDate: 1 });

// Virtual for total tests count
labRequestSchema.virtual('totalTests').get(function() {
  return this.tests.length;
});

// Virtual for completed tests count
labRequestSchema.virtual('completedTests').get(function() {
  return this.tests.filter(test => test.status === 'completed').length;
});

// Virtual for progress percentage
labRequestSchema.virtual('progressPercentage').get(function() {
  if (this.tests.length === 0) return 0;
  return Math.round((this.completedTests / this.totalTests) * 100);
});

// Virtual for overdue status
labRequestSchema.virtual('isOverdue').get(function() {
  if (!this.expectedCompletionDate) return false;
  return new Date() > this.expectedCompletionDate && this.status !== 'completed';
});

// Pre-save middleware
labRequestSchema.pre('save', function(next) {
  // Update status based on test statuses
  if (this.tests.length > 0) {
    const allCompleted = this.tests.every(test => test.status === 'completed');
    const anyInProgress = this.tests.some(test => test.status === 'in-progress');
    const anySampleCollected = this.tests.some(test => test.status === 'sample-collected');
    
    if (allCompleted && this.status !== 'completed') {
      this.status = 'completed';
      this.actualCompletionDate = new Date();
    } else if (anyInProgress && this.status === 'requested') {
      this.status = 'in-progress';
    } else if (anySampleCollected && this.status === 'requested') {
      this.status = 'sample-collected';
    }
  }
  
  // Set urgent flag based on priority
  this.isUrgent = this.priority === 'urgent' || this.priority === 'stat';
  
  next();
});

// Static methods
labRequestSchema.statics.getWorklistForLabStaff = function(labStaffId, tenantId, filters = {}) {
  const query = {
    tenantId,
    $or: [
      { assignedLabStaff: labStaffId },
      { assignedLabStaff: null, status: 'requested' }
    ]
  };
  
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.dateFrom) query.requestDate = { $gte: new Date(filters.dateFrom) };
  if (filters.dateTo) {
    query.requestDate = query.requestDate || {};
    query.requestDate.$lte = new Date(filters.dateTo);
  }
  
  return this.find(query)
    .populate('tests.results')
    .sort({ priority: -1, requestDate: -1 })
    .limit(filters.limit || 50);
};

labRequestSchema.statics.getDoctorRequests = function(doctorId, tenantId, filters = {}) {
  const query = { doctorId, tenantId };
  
  if (filters.status) query.status = filters.status;
  if (filters.patientId) query.patientId = filters.patientId;
  if (filters.dateFrom) query.requestDate = { $gte: new Date(filters.dateFrom) };
  if (filters.dateTo) {
    query.requestDate = query.requestDate || {};
    query.requestDate.$lte = new Date(filters.dateTo);
  }
  
  return this.find(query)
    .populate('tests.results')
    .sort({ requestDate: -1 })
    .limit(filters.limit || 100);
};

module.exports = mongoose.model('LabRequest', labRequestSchema);