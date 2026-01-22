const mongoose = require('mongoose');

const queueAuditSchema = new mongoose.Schema({
  tokenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token',
    required: true
  },
  queueId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: [
      'TOKEN_GENERATED',
      'TOKEN_CHECKED_IN',
      'TOKEN_CALLED',
      'TOKEN_SKIPPED',
      'TOKEN_COMPLETED',
      'TOKEN_NO_SHOW',
      'QUEUE_PAUSED',
      'QUEUE_RESUMED',
      'QUEUE_REORDERED',
      'PRIORITY_INSERTED'
    ],
    required: true
  },
  performedBy: {
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
  previousState: {
    type: mongoose.Schema.Types.Mixed
  },
  newState: {
    type: mongoose.Schema.Types.Mixed
  },
  reason: {
    type: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  branchId: {
    type: String,
    required: true
  },
  tenantId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
queueAuditSchema.index({ tokenId: 1, timestamp: -1 });
queueAuditSchema.index({ queueId: 1, timestamp: -1 });
queueAuditSchema.index({ branchId: 1, tenantId: 1, timestamp: -1 });
queueAuditSchema.index({ 'performedBy.userId': 1, timestamp: -1 });
queueAuditSchema.index({ action: 1, timestamp: -1 });

// Static methods
queueAuditSchema.statics.logAction = function(data) {
  const audit = new this(data);
  return audit.save();
};

queueAuditSchema.statics.getTokenHistory = function(tokenId) {
  return this.find({ tokenId })
    .sort({ timestamp: 1 })
    .populate('tokenId', 'tokenNumber patientName');
};

queueAuditSchema.statics.getQueueHistory = function(queueId, startDate, endDate) {
  const query = { queueId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .populate('tokenId', 'tokenNumber patientName');
};

queueAuditSchema.statics.getUserActions = function(userId, startDate, endDate) {
  const query = { 'performedBy.userId': userId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .populate('tokenId', 'tokenNumber patientName');
};

queueAuditSchema.statics.getComplianceReport = function(branchId, tenantId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        branchId,
        tenantId,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          userId: '$performedBy.userId',
          userName: '$performedBy.userName'
        },
        count: { $sum: 1 },
        lastAction: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

module.exports = mongoose.model('QueueAudit', queueAuditSchema);