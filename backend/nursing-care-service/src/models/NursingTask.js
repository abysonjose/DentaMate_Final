const mongoose = require('mongoose');

const nursingTaskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  appointmentId: {
    type: String,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  taskType: {
    type: String,
    enum: [
      'VITALS_RECORDING',
      'MEDICATION_ADMINISTRATION',
      'PATIENT_PREPARATION',
      'POST_PROCEDURE_MONITORING',
      'WOUND_CARE',
      'PATIENT_EDUCATION',
      'EQUIPMENT_SETUP',
      'DISCHARGE_PREPARATION',
      'FOLLOW_UP_SCHEDULING',
      'DOCUMENTATION',
      'OTHER'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
    index: true
  },
  status: {
    type: String,
    enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'],
    default: 'ASSIGNED',
    index: true
  },
  assignedBy: {
    userId: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    }
  },
  assignedTo: {
    userId: {
      type: String,
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    }
  },
  dueDateTime: {
    type: Date,
    required: true,
    index: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 15
  },
  actualStartTime: Date,
  actualEndTime: Date,
  completionNotes: {
    type: String,
    maxlength: 500
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  relatedVitalsId: {
    type: String,
    index: true
  },
  relatedCareNoteId: {
    type: String,
    index: true
  },
  dependencies: [{
    taskId: String,
    description: String
  }],
  recurrence: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['HOURLY', 'EVERY_2_HOURS', 'EVERY_4_HOURS', 'DAILY', 'WEEKLY']
    },
    nextDueDate: Date,
    endDate: Date
  },
  reminders: [{
    reminderTime: Date,
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderType: {
      type: String,
      enum: ['EMAIL', 'SMS', 'PUSH_NOTIFICATION', 'IN_APP']
    }
  }],
  qualityChecks: [{
    checkType: String,
    checkDescription: String,
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedBy: String,
    completedAt: Date,
    notes: String
  }],
  escalationRules: {
    escalateAfterMinutes: {
      type: Number,
      default: 30
    },
    escalateTo: [{
      userId: String,
      userName: String,
      userRole: String
    }],
    isEscalated: {
      type: Boolean,
      default: false
    },
    escalatedAt: Date
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'nursing_tasks'
});

// Compound indexes for efficient queries
nursingTaskSchema.index({ tenantId: 1, branchId: 1, status: 1, dueDateTime: 1 });
nursingTaskSchema.index({ tenantId: 1, 'assignedTo.userId': 1, status: 1, dueDateTime: 1 });
nursingTaskSchema.index({ tenantId: 1, patientId: 1, status: 1, dueDateTime: 1 });
nursingTaskSchema.index({ tenantId: 1, taskType: 1, status: 1, dueDateTime: 1 });
nursingTaskSchema.index({ tenantId: 1, priority: 1, status: 1, dueDateTime: 1 });

// Pre-save middleware to update lastUpdated and check for overdue tasks
nursingTaskSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }

  // Check if task is overdue
  if (this.status === 'ASSIGNED' && this.dueDateTime < new Date()) {
    this.status = 'OVERDUE';
  }

  next();
});

// Static method to find tasks by nurse
nursingTaskSchema.statics.findByNurse = function(tenantId, nurseId, status = null) {
  const query = {
    tenantId,
    'assignedTo.userId': nurseId,
    isDeleted: false
  };

  if (status) {
    query.status = status;
  }

  return this.find(query).sort({ priority: -1, dueDateTime: 1 });
};

// Static method to find tasks by patient
nursingTaskSchema.statics.findByPatient = function(tenantId, patientId, status = null) {
  const query = {
    tenantId,
    patientId,
    isDeleted: false
  };

  if (status) {
    query.status = status;
  }

  return this.find(query).sort({ dueDateTime: 1 });
};

// Static method to find overdue tasks
nursingTaskSchema.statics.findOverdue = function(tenantId, branchId = null) {
  const query = {
    tenantId,
    status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
    dueDateTime: { $lt: new Date() },
    isDeleted: false
  };

  if (branchId) {
    query.branchId = branchId;
  }

  return this.find(query).sort({ priority: -1, dueDateTime: 1 });
};

// Static method to find tasks due soon
nursingTaskSchema.statics.findDueSoon = function(tenantId, branchId, minutesAhead = 30) {
  const now = new Date();
  const soonTime = new Date(now.getTime() + (minutesAhead * 60000));

  return this.find({
    tenantId,
    branchId,
    status: 'ASSIGNED',
    dueDateTime: { $gte: now, $lte: soonTime },
    isDeleted: false
  }).sort({ dueDateTime: 1 });
};

// Method to start task
nursingTaskSchema.methods.startTask = function() {
  this.status = 'IN_PROGRESS';
  this.actualStartTime = new Date();
  return this.save();
};

// Method to complete task
nursingTaskSchema.methods.completeTask = function(completionNotes, attachments = []) {
  this.status = 'COMPLETED';
  this.actualEndTime = new Date();
  this.completionNotes = completionNotes;
  if (attachments.length > 0) {
    this.attachments = [...this.attachments, ...attachments];
  }
  return this.save();
};

// Method to cancel task
nursingTaskSchema.methods.cancelTask = function(reason) {
  this.status = 'CANCELLED';
  this.completionNotes = reason;
  return this.save();
};

// Method to add quality check
nursingTaskSchema.methods.addQualityCheck = function(checkType, checkDescription) {
  this.qualityChecks.push({
    checkType,
    checkDescription,
    isCompleted: false
  });
  return this.save();
};

// Method to complete quality check
nursingTaskSchema.methods.completeQualityCheck = function(checkIndex, completedBy, notes) {
  if (this.qualityChecks[checkIndex]) {
    this.qualityChecks[checkIndex].isCompleted = true;
    this.qualityChecks[checkIndex].completedBy = completedBy;
    this.qualityChecks[checkIndex].completedAt = new Date();
    this.qualityChecks[checkIndex].notes = notes;
  }
  return this.save();
};

module.exports = mongoose.model('NursingTask', nursingTaskSchema);