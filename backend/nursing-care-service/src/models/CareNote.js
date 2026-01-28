const mongoose = require('mongoose');

const careNoteSchema = new mongoose.Schema({
  noteId: {
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
  nurseId: {
    type: String,
    required: true,
    index: true
  },
  nurseName: {
    type: String,
    required: true
  },
  noteType: {
    type: String,
    enum: [
      'PATIENT_PREPARATION',
      'CHAIRSIDE_ASSISTANCE',
      'POST_PROCEDURE_CARE',
      'MEDICATION_ADMINISTRATION',
      'PATIENT_EDUCATION',
      'DISCHARGE_INSTRUCTIONS',
      'GENERAL_OBSERVATION'
    ],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  relatedVitalsId: {
    type: String,
    index: true
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
  isPrivate: {
    type: Boolean,
    default: false // If true, only visible to nursing staff
  },
  readBy: [{
    userId: String,
    userName: String,
    userRole: String,
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    userId: String,
    userName: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'care_notes'
});

// Compound indexes for efficient queries
careNoteSchema.index({ tenantId: 1, branchId: 1, appointmentId: 1, timestamp: -1 });
careNoteSchema.index({ tenantId: 1, patientId: 1, timestamp: -1 });
careNoteSchema.index({ tenantId: 1, nurseId: 1, timestamp: -1 });
careNoteSchema.index({ tenantId: 1, noteType: 1, timestamp: -1 });
careNoteSchema.index({ tenantId: 1, priority: 1, timestamp: -1 });

// Pre-save middleware to update lastModified
careNoteSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
  }
  next();
});

// Static method to find notes by appointment
careNoteSchema.statics.findByAppointment = function(tenantId, appointmentId, includePrivate = false) {
  const query = {
    tenantId,
    appointmentId,
    isDeleted: false
  };

  if (!includePrivate) {
    query.isPrivate = false;
  }

  return this.find(query).sort({ timestamp: -1 });
};

// Static method to find notes by patient
careNoteSchema.statics.findByPatient = function(tenantId, patientId, limit = 20, includePrivate = false) {
  const query = {
    tenantId,
    patientId,
    isDeleted: false
  };

  if (!includePrivate) {
    query.isPrivate = false;
  }

  return this.find(query).sort({ timestamp: -1 }).limit(limit);
};

// Static method to find notes by nurse
careNoteSchema.statics.findByNurse = function(tenantId, nurseId, limit = 50) {
  return this.find({
    tenantId,
    nurseId,
    isDeleted: false
  }).sort({ timestamp: -1 }).limit(limit);
};

// Method to mark as read by user
careNoteSchema.methods.markAsRead = function(userId, userName, userRole) {
  const existingRead = this.readBy.find(read => read.userId === userId);
  if (!existingRead) {
    this.readBy.push({
      userId,
      userName,
      userRole,
      readAt: new Date()
    });
  }
  return this.save();
};

module.exports = mongoose.model('CareNote', careNoteSchema);