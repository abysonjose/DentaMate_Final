const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    index: true
  },
  recipientId: {
    type: String,
    required: true,
    index: true
  },
  recipientType: {
    type: String,
    required: true,
    enum: ['PATIENT', 'DOCTOR', 'NURSE', 'HEAD_NURSE', 'ORTHOTIST', 'LAB_STAFF', 
           'PHARMACIST', 'RECEPTIONIST', 'SUPPORT_STAFF', 'BILLING_OFFICER', 
           'CASHIER', 'ACCOUNTANT', 'PAYROLL_OFFICER', 'HR_STAFF', 'BRANCH_ADMIN', 
           'CENTRAL_ADMIN', 'SAAS_ADMIN']
  },
  channel: {
    type: String,
    required: true,
    enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'],
    index: true
  },
  templateCode: {
    type: String,
    required: true,
    index: true
  },
  subject: {
    type: String,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  variables: {
    type: Map,
    of: String,
    default: new Map()
  },
  status: {
    type: String,
    required: true,
    enum: ['QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED'],
    default: 'QUEUED',
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
    index: true
  },
  scheduledAt: {
    type: Date,
    index: true
  },
  sentAt: {
    type: Date,
    index: true
  },
  deliveredAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 5
  },
  errorMessage: {
    type: String,
    maxlength: 1000
  },
  externalId: {
    type: String,
    index: true
  },
  externalStatus: {
    type: String
  },
  deliveryDetails: {
    provider: String,
    providerMessageId: String,
    providerStatus: String,
    deliveryTime: Date,
    errorCode: String,
    errorDescription: String
  },
  metadata: {
    sourceService: {
      type: String,
      required: true
    },
    eventType: String,
    entityId: String,
    correlationId: String,
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Indexes for performance
notificationSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, channel: 1, status: 1 });
notificationSchema.index({ scheduledAt: 1, status: 1 });
notificationSchema.index({ status: 1, retryCount: 1, createdAt: 1 });

// TTL index for automatic cleanup (90 days)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Virtual for formatted variables
notificationSchema.virtual('formattedVariables').get(function() {
  const vars = {};
  for (let [key, value] of this.variables) {
    vars[key] = value;
  }
  return vars;
});

// Instance methods
notificationSchema.methods.markAsSent = function(externalId, providerDetails = {}) {
  this.status = 'SENT';
  this.sentAt = new Date();
  this.externalId = externalId;
  if (providerDetails.provider) {
    this.deliveryDetails.provider = providerDetails.provider;
  }
  if (providerDetails.providerMessageId) {
    this.deliveryDetails.providerMessageId = providerDetails.providerMessageId;
  }
  return this.save();
};

notificationSchema.methods.markAsDelivered = function(deliveryDetails = {}) {
  this.status = 'DELIVERED';
  this.deliveredAt = new Date();
  if (deliveryDetails.deliveryTime) {
    this.deliveryDetails.deliveryTime = deliveryDetails.deliveryTime;
  }
  if (deliveryDetails.providerStatus) {
    this.deliveryDetails.providerStatus = deliveryDetails.providerStatus;
  }
  return this.save();
};

notificationSchema.methods.markAsFailed = function(errorMessage, errorDetails = {}) {
  this.status = 'FAILED';
  this.failedAt = new Date();
  this.errorMessage = errorMessage;
  if (errorDetails.errorCode) {
    this.deliveryDetails.errorCode = errorDetails.errorCode;
  }
  if (errorDetails.errorDescription) {
    this.deliveryDetails.errorDescription = errorDetails.errorDescription;
  }
  return this.save();
};

notificationSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.status = this.retryCount >= this.maxRetries ? 'FAILED' : 'QUEUED';
  if (this.status === 'FAILED') {
    this.failedAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.canRetry = function() {
  return this.retryCount < this.maxRetries && this.status === 'FAILED';
};

// Static methods
notificationSchema.statics.findByTenant = function(tenantId, options = {}) {
  const query = { tenantId };
  if (options.status) query.status = options.status;
  if (options.channel) query.channel = options.channel;
  if (options.recipientId) query.recipientId = options.recipientId;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

notificationSchema.statics.getStatusCounts = function(tenantId, dateRange = {}) {
  const match = { tenantId };
  if (dateRange.start || dateRange.end) {
    match.createdAt = {};
    if (dateRange.start) match.createdAt.$gte = dateRange.start;
    if (dateRange.end) match.createdAt.$lte = dateRange.end;
  }

  return this.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
};

notificationSchema.statics.getChannelStats = function(tenantId, dateRange = {}) {
  const match = { tenantId };
  if (dateRange.start || dateRange.end) {
    match.createdAt = {};
    if (dateRange.start) match.createdAt.$gte = dateRange.start;
    if (dateRange.end) match.createdAt.$lte = dateRange.end;
  }

  return this.aggregate([
    { $match: match },
    { 
      $group: { 
        _id: { channel: '$channel', status: '$status' }, 
        count: { $sum: 1 } 
      } 
    },
    { $sort: { '_id.channel': 1, '_id.status': 1 } }
  ]);
};

module.exports = mongoose.model('Notification', notificationSchema);