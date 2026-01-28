const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema({
  escalationId: {
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
  raisedBy: {
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
  escalationType: {
    type: String,
    enum: [
      'ABNORMAL_VITALS',
      'PATIENT_DISCOMFORT',
      'EMERGENCY_SITUATION',
      'MEDICATION_REACTION',
      'EQUIPMENT_MALFUNCTION',
      'PATIENT_UNRESPONSIVE',
      'BLEEDING_EXCESSIVE',
      'ALLERGIC_REACTION',
      'PAIN_MANAGEMENT',
      'OTHER'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
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
  relatedVitalsId: {
    type: String,
    index: true
  },
  relatedCareNoteId: {
    type: String,
    index: true
  },
  targetRecipients: [{
    userId: String,
    userName: String,
    userRole: String,
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationSentAt: Date
  }],
  status: {
    type: String,
    enum: ['RAISED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
    default: 'RAISED',
    index: true
  },
  acknowledgedBy: {
    userId: String,
    userName: String,
    userRole: String,
    acknowledgedAt: Date
  },
  resolvedBy: {
    userId: String,
    userName: String,
    userRole: String,
    resolvedAt: Date
  },
  resolutionNotes: {
    type: String,
    maxlength: 1000
  },
  actionsTaken: [{
    action: String,
    takenBy: {
      userId: String,
      userName: String,
      userRole: String
    },
    takenAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  followUpNotes: String,
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedBy: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
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
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'escalations'
});

// Compound indexes for efficient queries
escalationSchema.index({ tenantId: 1, branchId: 1, status: 1, timestamp: -1 });
escalationSchema.index({ tenantId: 1, appointmentId: 1, timestamp: -1 });
escalationSchema.index({ tenantId: 1, patientId: 1, timestamp: -1 });
escalationSchema.index({ tenantId: 1, escalationType: 1, severity: 1, timestamp: -1 });
escalationSchema.index({ tenantId: 1, 'raisedBy.userId': 1, timestamp: -1 });
escalationSchema.index({ tenantId: 1, 'targetRecipients.userId': 1, status: 1 });

// Pre-save middleware to update lastUpdated
escalationSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

// Static method to find active escalations
escalationSchema.statics.findActive = function(tenantId, branchId) {
  return this.find({
    tenantId,
    branchId,
    status: { $in: ['RAISED', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
    isDeleted: false
  }).sort({ severity: -1, timestamp: -1 });
};

// Static method to find escalations by appointment
escalationSchema.statics.findByAppointment = function(tenantId, appointmentId) {
  return this.find({
    tenantId,
    appointmentId,
    isDeleted: false
  }).sort({ timestamp: -1 });
};

// Static method to find escalations for a user
escalationSchema.statics.findForUser = function(tenantId, userId, status = null) {
  const query = {
    tenantId,
    'targetRecipients.userId': userId,
    isDeleted: false
  };

  if (status) {
    query.status = status;
  }

  return this.find(query).sort({ severity: -1, timestamp: -1 });
};

// Method to acknowledge escalation
escalationSchema.methods.acknowledge = function(userId, userName, userRole) {
  this.status = 'ACKNOWLEDGED';
  this.acknowledgedBy = {
    userId,
    userName,
    userRole,
    acknowledgedAt: new Date()
  };
  return this.save();
};

// Method to resolve escalation
escalationSchema.methods.resolve = function(userId, userName, userRole, resolutionNotes) {
  this.status = 'RESOLVED';
  this.resolvedBy = {
    userId,
    userName,
    userRole,
    resolvedAt: new Date()
  };
  this.resolutionNotes = resolutionNotes;
  return this.save();
};

// Method to add action taken
escalationSchema.methods.addAction = function(action, userId, userName, userRole, notes) {
  this.actionsTaken.push({
    action,
    takenBy: {
      userId,
      userName,
      userRole
    },
    takenAt: new Date(),
    notes
  });
  return this.save();
};

module.exports = mongoose.model('Escalation', escalationSchema);