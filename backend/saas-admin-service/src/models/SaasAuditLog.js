const mongoose = require('mongoose');

const saasAuditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    default: () => `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  action: {
    type: String,
    required: true,
    enum: [
      // License Management
      'LICENSE_ISSUED', 'LICENSE_RENEWED', 'LICENSE_SUSPENDED', 'LICENSE_REVOKED', 'LICENSE_REACTIVATED',
      
      // Subscription Management
      'PLAN_CREATED', 'PLAN_UPDATED', 'PLAN_DEPRECATED', 'PLAN_ACTIVATED',
      'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPGRADED', 'SUBSCRIPTION_DOWNGRADED', 'SUBSCRIPTION_CANCELLED',
      
      // Tenant Management
      'TENANT_ONBOARDED', 'TENANT_SUSPENDED', 'TENANT_REACTIVATED', 'TENANT_TERMINATED',
      'TENANT_LIMITS_UPDATED', 'TENANT_FEATURES_MODIFIED',
      
      // System Management
      'FEATURE_FLAG_CHANGED', 'MAINTENANCE_MODE_ENABLED', 'MAINTENANCE_MODE_DISABLED',
      'SYSTEM_CONFIG_UPDATED', 'GLOBAL_SETTINGS_CHANGED',
      
      // User Management
      'SAAS_ADMIN_CREATED', 'SAAS_ADMIN_REMOVED', 'CENTRAL_ADMIN_ASSIGNED', 'CENTRAL_ADMIN_REMOVED',
      
      // Billing & Revenue
      'PAYMENT_PROCESSED', 'PAYMENT_FAILED', 'REFUND_ISSUED', 'INVOICE_GENERATED',
      
      // Security & Compliance
      'SECURITY_INCIDENT', 'DATA_BREACH_DETECTED', 'COMPLIANCE_VIOLATION', 'AUDIT_REQUESTED'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['LICENSE', 'SUBSCRIPTION_PLAN', 'TENANT', 'USER', 'SYSTEM', 'PAYMENT', 'SECURITY']
  },
  entityId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    index: true // Optional for system-wide actions
  },
  performedBy: {
    userId: { type: String, required: true },
    userEmail: { type: String },
    userName: { type: String },
    userRole: { type: String, enum: ['SAAS_ADMIN', 'SYSTEM', 'API'], default: 'SAAS_ADMIN' }
  },
  changes: {
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    fields: [{ type: String }],
    summary: { type: String, maxlength: 500 }
  },
  metadata: {
    ipAddress: { type: String },
    userAgent: { type: String },
    source: { type: String, enum: ['WEB', 'API', 'SYSTEM', 'MOBILE'], default: 'WEB' },
    requestId: { type: String },
    sessionId: { type: String },
    apiVersion: { type: String },
    clientVersion: { type: String }
  },
  impact: {
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true
    },
    affectedTenants: [{ type: String }],
    affectedUsers: { type: Number, default: 0 },
    systemWideImpact: { type: Boolean, default: false },
    businessImpact: { type: String, maxlength: 200 }
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PARTIAL', 'PENDING'],
    default: 'SUCCESS',
    index: true
  },
  errorDetails: {
    code: { type: String },
    message: { type: String },
    stack: { type: String },
    retryCount: { type: Number, default: 0 }
  },
  compliance: {
    requiresNotification: { type: Boolean, default: false },
    notificationSent: { type: Boolean, default: false },
    retentionPeriod: { type: Number, default: 2555 }, // 7 years in days
    dataClassification: { 
      type: String, 
      enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'], 
      default: 'INTERNAL' 
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  collection: 'saas_audit_logs'
});

// Indexes for efficient querying
saasAuditLogSchema.index({ action: 1, timestamp: -1 });
saasAuditLogSchema.index({ entityType: 1, entityId: 1 });
saasAuditLogSchema.index({ tenantId: 1, timestamp: -1 });
saasAuditLogSchema.index({ 'performedBy.userId': 1 });
saasAuditLogSchema.index({ 'impact.severity': 1, timestamp: -1 });
saasAuditLogSchema.index({ 'impact.systemWideImpact': 1 });

// TTL Index for automatic cleanup (7 years)
saasAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 220752000 }); // 7 years

// Static methods
saasAuditLogSchema.statics.logAction = async function(logData) {
  try {
    const auditLog = new this(logData);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    throw error;
  }
};

saasAuditLogSchema.statics.getSystemWideActions = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    'impact.systemWideImpact': true,
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

saasAuditLogSchema.statics.getCriticalActions = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    'impact.severity': 'CRITICAL',
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

saasAuditLogSchema.statics.getTenantActions = function(tenantId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    tenantId,
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

// Methods
saasAuditLogSchema.methods.toPublicJSON = function() {
  const log = this.toObject();
  delete log._id;
  delete log.__v;
  // Remove sensitive information
  if (log.errorDetails && log.errorDetails.stack) {
    delete log.errorDetails.stack;
  }
  return log;
};

module.exports = mongoose.model('SaasAuditLog', saasAuditLogSchema);