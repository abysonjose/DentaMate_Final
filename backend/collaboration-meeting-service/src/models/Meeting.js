const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  meetingId: {
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
  organizer: {
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
  meetingDetails: {
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: {
      type: String,
      maxlength: 1000
    },
    agenda: [String],
    meetingType: {
      type: String,
      enum: ['VIRTUAL', 'IN_PERSON', 'HYBRID'],
      default: 'VIRTUAL'
    },
    specialty: String,
    urgency: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    }
  },
  schedule: {
    scheduledAt: {
      type: Date,
      required: true,
      index: true
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
      min: 15,
      max: 240 // 4 hours max
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    endTime: Date
  },
  participants: [{
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
    invitedAt: {
      type: Date,
      default: Date.now
    },
    responseStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE'],
      default: 'PENDING'
    },
    joinedAt: Date,
    leftAt: Date,
    isRequired: {
      type: Boolean,
      default: false
    }
  }],
  meetingAccess: {
    accessToken: String,
    joinUrl: String,
    meetingPassword: String,
    webrtcConfig: {
      stunServers: [String],
      turnServers: [{
        urls: String,
        username: String,
        credential: String
      }]
    }
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'],
    default: 'SCHEDULED'
  },
  actualTiming: {
    startedAt: Date,
    endedAt: Date,
    actualDuration: Number // in minutes
  },
  recordings: [{
    recordingId: String,
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    duration: Number,
    recordedAt: Date,
    recordedBy: {
      userId: String,
      name: String
    }
  }],
  reminders: [{
    reminderType: {
      type: String,
      enum: ['EMAIL', 'SMS', 'PUSH', 'IN_APP']
    },
    reminderTime: Date, // When to send reminder
    sentAt: Date,
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING'
    }
  }],
  metadata: {
    totalNotes: {
      type: Number,
      default: 0
    },
    totalDiscussions: {
      type: Number,
      default: 0
    },
    isRecorded: {
      type: Boolean,
      default: false
    },
    maxParticipants: {
      type: Number,
      default: 10
    },
    tags: [String]
  }
}, {
  timestamps: true,
  collection: 'meetings'
});

// Indexes for performance
meetingSchema.index({ tenantId: 1, branchId: 1 });
meetingSchema.index({ caseId: 1, tenantId: 1 });
meetingSchema.index({ 'organizer.userId': 1 });
meetingSchema.index({ 'participants.userId': 1 });
meetingSchema.index({ 'schedule.scheduledAt': 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ createdAt: -1 });

// Virtual for active participants
meetingSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => p.responseStatus === 'ACCEPTED');
});

// Virtual for meeting duration in hours
meetingSchema.virtual('durationHours').get(function() {
  return this.schedule.duration / 60;
});

// Method to check if user can join
meetingSchema.methods.canUserJoin = function(userId) {
  const participant = this.participants.find(p => p.userId === userId);
  
  if (!participant) {
    return { canJoin: false, reason: 'Not invited to meeting' };
  }
  
  if (participant.responseStatus === 'DECLINED') {
    return { canJoin: false, reason: 'Meeting invitation declined' };
  }
  
  if (this.status !== 'SCHEDULED' && this.status !== 'IN_PROGRESS') {
    return { canJoin: false, reason: 'Meeting is not active' };
  }
  
  const now = new Date();
  const meetingStart = new Date(this.schedule.scheduledAt);
  const meetingEnd = new Date(meetingStart.getTime() + (this.schedule.duration * 60000));
  
  // Allow joining 15 minutes before and during the meeting
  const joinWindow = new Date(meetingStart.getTime() - (15 * 60000));
  
  if (now < joinWindow) {
    return { canJoin: false, reason: 'Meeting has not started yet' };
  }
  
  if (now > meetingEnd) {
    return { canJoin: false, reason: 'Meeting has ended' };
  }
  
  return { canJoin: true, participant };
};

// Method to add participant
meetingSchema.methods.addParticipant = function(userDetails, isRequired = false) {
  const existingIndex = this.participants.findIndex(p => p.userId === userDetails.userId);
  
  if (existingIndex >= 0) {
    // Update existing participant
    this.participants[existingIndex].isRequired = isRequired;
    this.participants[existingIndex].responseStatus = 'PENDING';
  } else {
    // Add new participant
    this.participants.push({
      userId: userDetails.userId,
      name: userDetails.name,
      role: userDetails.role,
      isRequired,
      responseStatus: 'PENDING'
    });
  }
};

// Method to update participant response
meetingSchema.methods.updateParticipantResponse = function(userId, responseStatus) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.responseStatus = responseStatus;
    return true;
  }
  return false;
};

// Method to join meeting
meetingSchema.methods.joinMeeting = function(userId) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.joinedAt = new Date();
    if (participant.responseStatus === 'PENDING') {
      participant.responseStatus = 'ACCEPTED';
    }
    
    // Update meeting status if first participant
    if (this.status === 'SCHEDULED') {
      this.status = 'IN_PROGRESS';
      this.actualTiming.startedAt = new Date();
    }
    
    return true;
  }
  return false;
};

// Method to leave meeting
meetingSchema.methods.leaveMeeting = function(userId) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant && participant.joinedAt) {
    participant.leftAt = new Date();
    return true;
  }
  return false;
};

// Method to complete meeting
meetingSchema.methods.completeMeeting = function() {
  this.status = 'COMPLETED';
  this.actualTiming.endedAt = new Date();
  
  if (this.actualTiming.startedAt) {
    const duration = (this.actualTiming.endedAt - this.actualTiming.startedAt) / (1000 * 60);
    this.actualTiming.actualDuration = Math.round(duration);
  }
};

// Static method to find upcoming meetings
meetingSchema.statics.findUpcoming = function(userId, tenantId, hours = 24) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
  
  return this.find({
    tenantId,
    'participants.userId': userId,
    'schedule.scheduledAt': {
      $gte: now,
      $lte: futureTime
    },
    status: { $in: ['SCHEDULED', 'IN_PROGRESS'] }
  }).sort({ 'schedule.scheduledAt': 1 });
};

// Static method to find meetings by case
meetingSchema.statics.findByCaseId = function(caseId, tenantId, options = {}) {
  const query = {
    caseId,
    tenantId
  };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ 'schedule.scheduledAt': -1 })
    .limit(options.limit || 50);
};

// Pre-save middleware
meetingSchema.pre('save', function(next) {
  // Calculate end time
  if (this.schedule.scheduledAt && this.schedule.duration) {
    this.schedule.endTime = new Date(
      this.schedule.scheduledAt.getTime() + (this.schedule.duration * 60000)
    );
  }
  
  // Generate access token if not exists
  if (!this.meetingAccess.accessToken) {
    this.meetingAccess.accessToken = require('crypto').randomBytes(32).toString('hex');
  }
  
  next();
});

module.exports = mongoose.model('Meeting', meetingSchema);