const mongoose = require('mongoose');

const wardMonitoringSchema = new mongoose.Schema({
  monitoringId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  appointmentId: {
    type: String,
    required: true,
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
  roomId: {
    type: String,
    required: true,
    index: true
  },
  chairId: {
    type: String,
    index: true
  },
  assignedNurse: {
    userId: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: true
    }
  },
  assignedDoctor: {
    userId: String,
    userName: String
  },
  patientStatus: {
    type: String,
    enum: [
      'WAITING',
      'IN_PREPARATION',
      'READY_FOR_CONSULTATION',
      'IN_CONSULTATION',
      'PROCEDURE_IN_PROGRESS',
      'POST_PROCEDURE_MONITORING',
      'RECOVERY',
      'READY_FOR_DISCHARGE',
      'DISCHARGED',
      'TRANSFERRED'
    ],
    required: true,
    default: 'WAITING'
  },
  careLevel: {
    type: String,
    enum: ['ROUTINE', 'ENHANCED', 'INTENSIVE', 'CRITICAL'],
    default: 'ROUTINE'
  },
  statusHistory: [{
    status: String,
    changedBy: {
      userId: String,
      userName: String,
      userRole: String
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  currentLocation: {
    area: {
      type: String,
      enum: ['WAITING_AREA', 'PREPARATION_ROOM', 'TREATMENT_ROOM', 'RECOVERY_AREA', 'DISCHARGE_AREA']
    },
    roomNumber: String,
    chairNumber: String,
    bedNumber: String
  },
  vitalsSummary: {
    lastRecorded: Date,
    isAbnormal: {
      type: Boolean,
      default: false
    },
    abnormalCount: {
      type: Number,
      default: 0
    }
  },
  alerts: [{
    alertType: {
      type: String,
      enum: ['VITALS_OVERDUE', 'ABNORMAL_VITALS', 'PATIENT_CALL', 'MEDICATION_DUE', 'DISCHARGE_READY']
    },
    message: String,
    severity: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: Date,
    resolvedBy: String
  }],
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  actualStartTime: Date,
  estimatedEndTime: Date,
  actualEndTime: Date,
  delayReason: String,
  specialInstructions: [{
    instruction: String,
    addedBy: {
      userId: String,
      userName: String,
      userRole: String
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL'
    }
  }],
  nursingTasks: [{
    taskId: String,
    taskType: String,
    description: String,
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING'
    },
    assignedTo: String,
    dueTime: Date,
    completedAt: Date,
    notes: String
  }],
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'ward_monitoring'
});

// Compound indexes for efficient queries
wardMonitoringSchema.index({ tenantId: 1, branchId: 1, isActive: 1, patientStatus: 1 });
wardMonitoringSchema.index({ tenantId: 1, roomId: 1, isActive: 1 });
wardMonitoringSchema.index({ tenantId: 1, 'assignedNurse.userId': 1, isActive: 1 });
wardMonitoringSchema.index({ tenantId: 1, 'assignedDoctor.userId': 1, isActive: 1 });
wardMonitoringSchema.index({ tenantId: 1, careLevel: 1, isActive: 1 });

// Pre-save middleware to update lastUpdated and manage status history
wardMonitoringSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }

  // If patient status changed, add to history
  if (this.isModified('patientStatus') && !this.isNew) {
    this.statusHistory.push({
      status: this.patientStatus,
      changedAt: new Date()
    });
  }

  next();
});

// Static method to find active monitoring by branch
wardMonitoringSchema.statics.findActiveByBranch = function(tenantId, branchId) {
  return this.find({
    tenantId,
    branchId,
    isActive: true
  }).sort({ careLevel: -1, timestamp: 1 });
};

// Static method to find monitoring by room
wardMonitoringSchema.statics.findByRoom = function(tenantId, roomId) {
  return this.find({
    tenantId,
    roomId,
    isActive: true
  }).sort({ timestamp: 1 });
};

// Static method to find monitoring by nurse
wardMonitoringSchema.statics.findByNurse = function(tenantId, nurseId) {
  return this.find({
    tenantId,
    'assignedNurse.userId': nurseId,
    isActive: true
  }).sort({ careLevel: -1, timestamp: 1 });
};

// Method to update patient status
wardMonitoringSchema.methods.updateStatus = function(newStatus, changedBy, notes) {
  this.patientStatus = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedBy,
    changedAt: new Date(),
    notes
  });
  return this.save();
};

// Method to add alert
wardMonitoringSchema.methods.addAlert = function(alertType, message, severity = 'MODERATE') {
  this.alerts.push({
    alertType,
    message,
    severity,
    isActive: true,
    createdAt: new Date()
  });
  return this.save();
};

// Method to resolve alert
wardMonitoringSchema.methods.resolveAlert = function(alertIndex, resolvedBy) {
  if (this.alerts[alertIndex]) {
    this.alerts[alertIndex].isActive = false;
    this.alerts[alertIndex].resolvedAt = new Date();
    this.alerts[alertIndex].resolvedBy = resolvedBy;
  }
  return this.save();
};

// Method to add nursing task
wardMonitoringSchema.methods.addNursingTask = function(taskType, description, assignedTo, dueTime, priority = 'NORMAL') {
  const taskId = require('uuid').v4();
  this.nursingTasks.push({
    taskId,
    taskType,
    description,
    assignedTo,
    dueTime,
    status: 'PENDING'
  });
  return this.save();
};

// Method to update task status
wardMonitoringSchema.methods.updateTaskStatus = function(taskId, status, notes) {
  const task = this.nursingTasks.find(t => t.taskId === taskId);
  if (task) {
    task.status = status;
    task.notes = notes;
    if (status === 'COMPLETED') {
      task.completedAt = new Date();
    }
  }
  return this.save();
};

module.exports = mongoose.model('WardMonitoring', wardMonitoringSchema);