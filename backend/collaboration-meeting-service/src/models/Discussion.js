const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema({
  discussionId: {
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
  collaborationId: {
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
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  discussionType: {
    type: String,
    enum: ['COMMENT', 'QUESTION', 'SUGGESTION', 'CONCERN'],
    default: 'COMMENT'
  },
  parentDiscussionId: {
    type: String,
    default: null,
    index: true
  },
  meetingId: {
    type: String,
    default: null,
    index: true
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    userId: String,
    name: String,
    role: String
  }],
  reactions: [{
    userId: String,
    name: String,
    reaction: {
      type: String,
      enum: ['LIKE', 'HELPFUL', 'AGREE', 'DISAGREE']
    },
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['ACTIVE', 'EDITED', 'DELETED'],
    default: 'ACTIVE'
  },
  editHistory: [{
    editedAt: {
      type: Date,
      default: Date.now
    },
    previousContent: String,
    editReason: String
  }],
  metadata: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    tags: [String],
    readBy: [{
      userId: String,
      readAt: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true,
  collection: 'discussions'
});

// Indexes for performance
discussionSchema.index({ tenantId: 1, caseId: 1 });
discussionSchema.index({ collaborationId: 1, createdAt: -1 });
discussionSchema.index({ 'author.userId': 1 });
discussionSchema.index({ parentDiscussionId: 1 });
discussionSchema.index({ meetingId: 1 });
discussionSchema.index({ status: 1 });

// Virtual for reply count
discussionSchema.virtual('replyCount', {
  ref: 'Discussion',
  localField: 'discussionId',
  foreignField: 'parentDiscussionId',
  count: true
});

// Method to check if user can edit
discussionSchema.methods.canUserEdit = function(userId, userRole) {
  // Author can edit their own comments
  if (this.author.userId === userId) {
    return true;
  }
  
  // Doctors can edit any comment in their collaborations
  if (userRole === 'DOCTOR') {
    return true;
  }
  
  return false;
};

// Method to add reaction
discussionSchema.methods.addReaction = function(userId, userName, reaction) {
  const existingReactionIndex = this.reactions.findIndex(r => r.userId === userId);
  
  if (existingReactionIndex >= 0) {
    // Update existing reaction
    this.reactions[existingReactionIndex].reaction = reaction;
    this.reactions[existingReactionIndex].reactedAt = new Date();
  } else {
    // Add new reaction
    this.reactions.push({
      userId,
      name: userName,
      reaction,
      reactedAt: new Date()
    });
  }
};

// Method to remove reaction
discussionSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.userId !== userId);
};

// Method to mark as read
discussionSchema.methods.markAsRead = function(userId) {
  const existingReadIndex = this.metadata.readBy.findIndex(r => r.userId === userId);
  
  if (existingReadIndex === -1) {
    this.metadata.readBy.push({
      userId,
      readAt: new Date()
    });
  }
};

// Method to edit content
discussionSchema.methods.editContent = function(newContent, editReason = '') {
  // Store edit history
  this.editHistory.push({
    editedAt: new Date(),
    previousContent: this.content,
    editReason
  });
  
  // Update content
  this.content = newContent;
  this.status = 'EDITED';
};

// Static method to find discussions by case
discussionSchema.statics.findByCaseId = function(caseId, tenantId, options = {}) {
  const query = {
    caseId,
    tenantId,
    status: { $ne: 'DELETED' }
  };
  
  if (options.parentOnly) {
    query.parentDiscussionId = null;
  }
  
  if (options.meetingId) {
    query.meetingId = options.meetingId;
  }
  
  return this.find(query)
    .sort({ createdAt: options.sortOrder === 'desc' ? -1 : 1 })
    .limit(options.limit || 100)
    .populate('replyCount');
};

// Static method to find discussion thread
discussionSchema.statics.findThread = function(parentDiscussionId, tenantId) {
  return this.find({
    $or: [
      { discussionId: parentDiscussionId },
      { parentDiscussionId: parentDiscussionId }
    ],
    tenantId,
    status: { $ne: 'DELETED' }
  }).sort({ createdAt: 1 });
};

// Pre-save middleware
discussionSchema.pre('save', function(next) {
  // Extract mentions from content
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(this.content)) !== null) {
    mentions.push(match[1]);
  }
  
  // Note: In a real implementation, you'd resolve usernames to user IDs
  // this.mentions = await resolveUserMentions(mentions);
  
  next();
});

module.exports = mongoose.model('Discussion', discussionSchema);