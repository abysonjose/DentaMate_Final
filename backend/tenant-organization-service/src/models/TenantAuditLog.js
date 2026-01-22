const mongoose = require('mongoose');

const tenantAuditLogSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'TENANT_CREATED', 'TENANT_UPDATED', 'TENANT_ACTIVATED', 'TENANT_SUSPENDED', 'TENANT_DEACTIVATED',
      'BRANCH_CREATED', 'BRANCH_UPDATED', 'BRANCH_ACTIVATED', 'BRANCH_SUSPENDED',
      'CONFIG_UPDATED', 'FEATURE_FLAG_CHANGED', 'ADMIN_ASSIGNED', 'ADMIN_REMOVED',
      'SUBSCRIPTION_UPDATED', 'LIMITS_CHANGED', 'LOGIN_RECORDED'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['TENANT', 'BRANCH', 'CONFIG', 'SUBSCRIPTION', 'USER']
  },
  entityId: {
    type: String,
    required: true
  },
  performedBy: {
    userId: { type: String, required: true },
    userEmail: { type: String },
    userName: { type: String },
    userRole: { type: String }
  },
  changes: {
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    fields: [{ type: String }]
  },
  metadata: {
    ipAddress: { type: String },
    userAgent: { type: String },
    source: { type: String, enum: ['WEB', 'API', 'SYSTEM', 'MOBILE'], default: 'API' },
    requestId: { type: String },
    sessionId: { type: String }
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PARTIAL'],
    default: 'SUCCESS'
  },
  errorDetails: {
    code: { type: String },
    message: { type: String },
    stack: { type: String }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  collection: 'tenant_audit_logs'
});

// Indexes for efficient querying
tenantAuditLogSchema.index({ tenantId: 1, timestamp: -1 });
tenantAuditLogSchema.index({ branchId: 1, timestamp: -1 });
tenantAuditLogSchema.index({ action: 1, timestamp: -1 });
tenantAuditLogSchema.index({ entityType: 1, entityId: 1 });
tenantAuditLogSchema.index({ 'performedBy.userId': 1 });
tenantAuditLogSchema.index({ severity: 1, timestamp: -1 });
tenantAuditLogSchema.index({ timestamp: -1 }); // For cleanup operations

// TTL index for automatic cleanup (keep logs for 2 years)
tenantAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

// Static methods
tenantAuditLogSchema.statics.logAction = async function(auditData) {
  try {
    const log = new this(auditData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent breaking main operations
    return null;
  }
};

tenantAuditLogSchema.statics.getTenantLogs = function(tenantId, options = {}) {
  const {
    limit = 100,
    skip = 0,
    startDate,
    endDate,
    action,
    severity,
    entityType
  } = options;

  const query = { tenantId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (action) query.action = action;
  if (severity) query.severity = severity;
  if (entityType) query.entityType = entityType;

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

tenantAuditLogSchema.statics.getBranchLogs = function(branchId, options = {}) {
  const {
    limit = 100,
    skip = 0,
    startDate,
    endDate,
    action
  } = options;

  const query = { branchId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (action) query.action = action;

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

tenantAuditLogSchema.statics.getSecurityLogs = function(options = {}) {
  const {
    limit = 100,
    skip = 0,
    startDate,
    endDate,
    severity = 'HIGH'
  } = options;

  const query = { 
    severity: { $in: [severity, 'CRITICAL'] },
    action: { 
      $in: ['TENANT_SUSPENDED', 'TENANT_DEACTIVATED', 'BRANCH_SUSPENDED', 'LOGIN_FAILED'] 
    }
  };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

module.exports = mongoose.model('TenantAuditLog', tenantAuditLogSchema);