const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  queueId: {
    type: String,
    required: true,
    unique: true
  },
  branchId: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  departmentId: {
    type: String,
    required: true
  },
  departmentName: {
    type: String,
    required: true
  },
  tenantId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'CLOSED'],
    default: 'ACTIVE'
  },
  currentTokenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token'
  },
  currentTokenNumber: {
    type: String
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  completedTokens: {
    type: Number,
    default: 0
  },
  waitingTokens: {
    type: Number,
    default: 0
  },
  averageConsultationTime: {
    type: Number, // in minutes
    default: 15
  },
  estimatedWaitTime: {
    type: Number, // in minutes
    default: 0
  },
  lastTokenCalledAt: {
    type: Date
  },
  pausedAt: {
    type: Date
  },
  pauseReason: {
    type: String
  },
  settings: {
    allowWalkIns: {
      type: Boolean,
      default: true
    },
    maxWalkInsPerHour: {
      type: Number,
      default: 10
    },
    consultationTimeBuffer: {
      type: Number, // in minutes
      default: 5
    },
    autoSkipTimeout: {
      type: Number, // in minutes
      default: 10
    }
  },
  statistics: {
    todayAppointments: {
      type: Number,
      default: 0
    },
    todayWalkIns: {
      type: Number,
      default: 0
    },
    todayNoShows: {
      type: Number,
      default: 0
    },
    todaySkipped: {
      type: Number,
      default: 0
    },
    averageWaitTime: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
queueSchema.index({ branchId: 1, doctorId: 1 });
queueSchema.index({ tenantId: 1, branchId: 1 });
queueSchema.index({ status: 1, updatedAt: -1 });

// Virtual for queue efficiency
queueSchema.virtual('efficiency').get(function() {
  if (this.totalTokens === 0) return 100;
  return Math.round((this.completedTokens / this.totalTokens) * 100);
});

// Methods
queueSchema.methods.pause = function(reason) {
  this.status = 'PAUSED';
  this.pausedAt = new Date();
  this.pauseReason = reason;
  return this.save();
};

queueSchema.methods.resume = function() {
  this.status = 'ACTIVE';
  this.pausedAt = null;
  this.pauseReason = null;
  return this.save();
};

queueSchema.methods.updateCurrentToken = function(tokenId, tokenNumber) {
  this.currentTokenId = tokenId;
  this.currentTokenNumber = tokenNumber;
  this.lastTokenCalledAt = new Date();
  return this.save();
};

queueSchema.methods.updateStatistics = function(stats) {
  Object.keys(stats).forEach(key => {
    if (this.statistics[key] !== undefined) {
      this.statistics[key] = stats[key];
    }
  });
  return this.save();
};

queueSchema.methods.calculateWaitTime = function(position) {
  const baseTime = this.averageConsultationTime + this.settings.consultationTimeBuffer;
  return Math.max(0, (position - 1) * baseTime);
};

// Static methods
queueSchema.statics.findOrCreateQueue = async function(branchId, doctorId, doctorName, departmentId, departmentName, tenantId) {
  const queueId = `${branchId}_${doctorId}`;
  
  let queue = await this.findOne({ queueId });
  
  if (!queue) {
    queue = new this({
      queueId,
      branchId,
      doctorId,
      doctorName,
      departmentId,
      departmentName,
      tenantId
    });
    await queue.save();
  }
  
  return queue;
};

queueSchema.statics.getActiveQueues = function(branchId, tenantId) {
  return this.find({
    branchId,
    tenantId,
    status: 'ACTIVE'
  }).sort({ updatedAt: -1 });
};

queueSchema.statics.getDailyStatistics = async function(branchId, tenantId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.aggregate([
    {
      $match: {
        branchId,
        tenantId,
        updatedAt: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalQueues: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
        totalCompleted: { $sum: '$completedTokens' },
        totalWaiting: { $sum: '$waitingTokens' },
        avgWaitTime: { $avg: '$statistics.averageWaitTime' },
        totalAppointments: { $sum: '$statistics.todayAppointments' },
        totalWalkIns: { $sum: '$statistics.todayWalkIns' },
        totalNoShows: { $sum: '$statistics.todayNoShows' }
      }
    }
  ]);
};

module.exports = mongoose.model('Queue', queueSchema);