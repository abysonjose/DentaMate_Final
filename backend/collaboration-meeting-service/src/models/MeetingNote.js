const mongoose = require('mongoose');

const meetingNoteSchema = new mongoose.Schema({
  noteId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  meetingId: {
    type: String,
    required: true,
    index: true
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
    required: true
  },
  author: {
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
  noteContent: {
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000
    },
    noteType: {
      type: String,
      enum: ['GENERAL', 'ACTION_ITEM', 'DECISION', 'FOLLOW_UP', 'SUMMARY'],
      default: 'GENERAL'
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    }
  },
  keyPoints: [{
    point: {
      type: String,
      required: true,
      maxlength: 500
    },
    category: {
      type: String,
      enum: ['DISCUSSION', 'DECISION', 'ACTION', 'CONCERN', 'RECOMMENDATION']
    },
    assignedTo: {
      userId: String,
      name: String,
      role: String
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING'
    }
  }],
  actionItems: [{
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    assignedTo: {
      userId: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      role: String
    },
    dueDate: {
      type: Date,
      required: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'],
      default: 'PENDING'
    },
    completedAt: Date,
    completedBy: {
      userId: String,
      name: String
    }
  }],
  decisions: [{
    decision: {
      type: String,
      required: true,
      maxlength: 500
    },
    rationale: String,
    decidedBy: {
      userId: String,
      name: String,
      role: String
    },
    impact: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    implementationDate: Date
  }],
  followUps: [{
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    scheduledDate: Date,
    assignedTo: {
      userId: String,
      name: String,
      role: String
    },
    followUpType: {
      type: String,
      enum: ['APPOINTMENT', 'CALL', 'EMAIL', 'MEETING', 'REVIEW']
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED'
    }
  }],
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      userId: String,
      name: String
    }
  }],
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PARTICIPANTS_ONLY', 'DOCTORS_ONLY', 'PRIVATE'],
    default: 'PARTICIPANTS_ONLY'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT'
  },
  metadata: {
    isTemplate: {
      type: Boolean,
      default: false
    },
    templateName: String,
    tags: [String],
    version: {
      type: Number,
      default: 1
    },
    lastEditedBy: {
      userId: String,
      name: String,
      editedAt: Date
    }
  }
}, {
  timestamps: true,
  collection: 'meeting_notes'
});

// Indexes for performance
meetingNoteSchema.index({ tenantId: 1, meetingId: 1 });
meetingNoteSchema.index({ caseId: 1, tenantId: 1 });
meetingNoteSchema.index({ 'author.userId': 1 });
meetingNoteSchema.index({ status: 1 });
meetingNoteSchema.index({ 'noteContent.noteType': 1 });
meetingNoteSchema.index({ createdAt: -1 });

// Virtual for total action items
meetingNoteSchema.virtual('totalActionItems').get(function() {
  return this.actionItems.length;
});

// Virtual for pending action items
meetingNoteSchema.virtual('pendingActionItems').get(function() {
  return this.actionItems.filter(item => item.status === 'PENDING' || item.status === 'IN_PROGRESS').length;
});

// Virtual for overdue action items
meetingNoteSchema.virtual('overdueActionItems').get(function() {
  const now = new Date();
  return this.actionItems.filter(item => 
    (item.status === 'PENDING' || item.status === 'IN_PROGRESS') && 
    item.dueDate < now
  ).length;
});

// Method to check if user can view
meetingNoteSchema.methods.canUserView = function(userId, userRole) {
  switch (this.visibility) {
    case 'PUBLIC':
      return true;
    case 'PRIVATE':
      return this.author.userId === userId;
    case 'DOCTORS_ONLY':
      return userRole === 'DOCTOR' || userRole === 'SPECIALIST';
    case 'PARTICIPANTS_ONLY':
    default:
      // Would need to check meeting participants in real implementation
      return true;
  }
};

// Method to check if user can edit
meetingNoteSchema.methods.canUserEdit = function(userId, userRole) {
  // Author can always edit
  if (this.author.userId === userId) {
    return true;
  }
  
  // Meeting organizer can edit
  // Would need to check meeting organizer in real implementation
  
  // Doctors can edit notes in their cases
  if (userRole === 'DOCTOR') {
    return true;
  }
  
  return false;
};

// Method to add action item
meetingNoteSchema.methods.addActionItem = function(actionItem) {
  this.actionItems.push({
    ...actionItem,
    status: 'PENDING'
  });
  this.metadata.lastEditedBy = {
    userId: actionItem.assignedBy?.userId,
    name: actionItem.assignedBy?.name,
    editedAt: new Date()
  };
};

// Method to update action item status
meetingNoteSchema.methods.updateActionItemStatus = function(actionItemId, status, completedBy = null) {
  const actionItem = this.actionItems.id(actionItemId);
  if (actionItem) {
    actionItem.status = status;
    if (status === 'COMPLETED' && completedBy) {
      actionItem.completedAt = new Date();
      actionItem.completedBy = completedBy;
    }
    return true;
  }
  return false;
};

// Method to add decision
meetingNoteSchema.methods.addDecision = function(decision) {
  this.decisions.push(decision);
};

// Method to add follow-up
meetingNoteSchema.methods.addFollowUp = function(followUp) {
  this.followUps.push({
    ...followUp,
    status: 'SCHEDULED'
  });
};

// Static method to find notes by meeting
meetingNoteSchema.statics.findByMeetingId = function(meetingId, tenantId, options = {}) {
  const query = {
    meetingId,
    tenantId
  };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.noteType) {
    query['noteContent.noteType'] = options.noteType;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to find notes by case
meetingNoteSchema.statics.findByCaseId = function(caseId, tenantId, options = {}) {
  const query = {
    caseId,
    tenantId,
    status: { $ne: 'ARCHIVED' }
  };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

// Static method to find overdue action items
meetingNoteSchema.statics.findOverdueActionItems = function(tenantId, userId = null) {
  const now = new Date();
  const matchQuery = {
    tenantId,
    'actionItems.dueDate': { $lt: now },
    'actionItems.status': { $in: ['PENDING', 'IN_PROGRESS'] }
  };
  
  if (userId) {
    matchQuery['actionItems.assignedTo.userId'] = userId;
  }
  
  return this.aggregate([
    { $match: matchQuery },
    { $unwind: '$actionItems' },
    {
      $match: {
        'actionItems.dueDate': { $lt: now },
        'actionItems.status': { $in: ['PENDING', 'IN_PROGRESS'] }
      }
    },
    {
      $group: {
        _id: '$_id',
        noteId: { $first: '$noteId' },
        meetingId: { $first: '$meetingId' },
        caseId: { $first: '$caseId' },
        overdueItems: { $push: '$actionItems' }
      }
    }
  ]);
};

// Pre-save middleware
meetingNoteSchema.pre('save', function(next) {
  // Update overdue action items
  const now = new Date();
  this.actionItems.forEach(item => {
    if ((item.status === 'PENDING' || item.status === 'IN_PROGRESS') && item.dueDate < now) {
      item.status = 'OVERDUE';
    }
  });
  
  // Update version if content changed
  if (this.isModified('noteContent') || this.isModified('keyPoints') || 
      this.isModified('actionItems') || this.isModified('decisions')) {
    this.metadata.version += 1;
  }
  
  next();
});

module.exports = mongoose.model('MeetingNote', meetingNoteSchema);