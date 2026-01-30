const mongoose = require('mongoose');

const caseCollaborationSchema = new mongoose.Schema({
  collaborationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  caseId: {
    type: String,
    required: true,
    index: true
  },
  patientId: {
    type: String,
    required: true
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
  sharedBy: {
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    }
  },
  sharedWith: [{
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    permissions: {
      type: String,
      enum: ['VIEW_ONLY', 'COMMENT'],
      default: 'VIEW_ONLY'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'REVOKED'],
      default: 'APPROVED'
    }
  }],
  caseDetails: {
    title: {
      type: String,
      required: true
    },
    description: String,
    specialty: String,
    urgency: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    }
  },
  collaborationStatus: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
    default: 'ACTIVE'
  },
  metadata: {
    totalComments: {
      type: Number,
      default: 0
    },
    totalMeetings: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  collection: 'case_collaborations'
});

// Indexes for performance
caseCollaborationSchema.index({ tenantId: 1, branchId: 1 });
caseCollaborationSchema.index({ caseId: 1, tenantId: 1 });
caseCollaborationSchema.index({ 'sharedBy.userId': 1 });
caseCollaborationSchema.index({ 'sharedWith.userId': 1 });
caseCollaborationSchema.index({ collaborationStatus: 1 });
caseCollaborationSchema.index({ createdAt: -1 });

// Virtual for active participants
caseCollaborationSchema.virtual('activeParticipants').get(function() {
  return this.sharedWith.filter(participant => participant.status === 'APPROVED');
});

// Method to check if user has access
caseCollaborationSchema.methods.hasUserAccess = function(userId) {
  if (this.sharedBy.userId === userId) {
    return { hasAccess: true, permissions: 'OWNER' };
  }
  
  const participant = this.sharedWith.find(p => p.userId === userId && p.status === 'APPROVED');
  if (participant) {
    return { hasAccess: true, permissions: participant.permissions };
  }
  
  return { hasAccess: false, permissions: null };
};

// Method to add participant
caseCollaborationSchema.methods.addParticipant = function(userDetails, permissions = 'VIEW_ONLY') {
  const existingIndex = this.sharedWith.findIndex(p => p.userId === userDetails.userId);
  
  if (existingIndex >= 0) {
    // Update existing participant
    this.sharedWith[existingIndex].permissions = permissions;
    this.sharedWith[existingIndex].status = 'APPROVED';
    this.sharedWith[existingIndex].sharedAt = new Date();
  } else {
    // Add new participant
    this.sharedWith.push({
      userId: userDetails.userId,
      name: userDetails.name,
      role: userDetails.role,
      permissions,
      status: 'APPROVED'
    });
  }
  
  this.metadata.lastActivity = new Date();
};

// Method to remove participant
caseCollaborationSchema.methods.removeParticipant = function(userId) {
  this.sharedWith = this.sharedWith.filter(p => p.userId !== userId);
  this.metadata.lastActivity = new Date();
};

// Method to update permissions
caseCollaborationSchema.methods.updatePermissions = function(userId, permissions) {
  const participant = this.sharedWith.find(p => p.userId === userId);
  if (participant) {
    participant.permissions = permissions;
    this.metadata.lastActivity = new Date();
    return true;
  }
  return false;
};

// Static method to find collaborations by user
caseCollaborationSchema.statics.findByUser = function(userId, tenantId, options = {}) {
  const query = {
    tenantId,
    $or: [
      { 'sharedBy.userId': userId },
      { 'sharedWith.userId': userId, 'sharedWith.status': 'APPROVED' }
    ]
  };
  
  if (options.status) {
    query.collaborationStatus = options.status;
  }
  
  return this.find(query)
    .sort({ 'metadata.lastActivity': -1 })
    .limit(options.limit || 50);
};

// Pre-save middleware
caseCollaborationSchema.pre('save', function(next) {
  if (this.isModified('sharedWith') || this.isModified('metadata')) {
    this.metadata.lastActivity = new Date();
  }
  next();
});

module.exports = mongoose.model('CaseCollaboration', caseCollaborationSchema);