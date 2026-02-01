const mongoose = require('mongoose');

// Audit Summary Schema for aggregated metrics
const auditSummarySchema = new mongoose.Schema({
  // Summary Identification
  summaryId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Tenant Context
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  branchId: {
    type: String,
    index: true
  },
  
  // Time Period
  periodType: {
    type: String,
    required: true,
    enum: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
    index: true
  },
  
  periodStart: {
    type: Date,
    required: true,
    index: true
  },
  
  periodEnd: {
    type: Date,
    required: true,
    index: true
  },
  
  // Event Counts by Category
  eventCounts: {
    security: { type: Number, default: 0 },
    clinical: { type: Number, default: 0 },
    financial: { type: Number, default: 0 },
    hrPayroll: { type: Number, default: 0 },
    saasGovernance: { type: Number, default: 0 },
    system: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // Event Counts by Action
  actionCounts: {
    create: { type: Number, default: 0 },
    update: { type: Number, default: 0 },
    delete: { type: Number, default: 0 },
    view: { type: Number, default: 0 },
    approve: { type: Number, default: 0 },
    reject: { type: Number, default: 0 },
    login: { type: Number, default: 0 },
    logout: { type: Number, default: 0 },
    export: { type: Number, default: 0 },
    import: { type: Number, default: 0 }
  },
  
  // Event Counts by Severity
  severityCounts: {
    low: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    critical: { type: Number, default: 0 }
  },
  
  // Top Actors (most active users)
  topActors: [{
    actorId: String,
    actorRole: String,
    eventCount: Number
  }],
  
  // Service Activity
  serviceActivity: [{
    serviceName: String,
    eventCount: Number
  }],
  
  // Critical Events Summary
  criticalEvents: {
    count: { type: Number, default: 0 },
    types: [String]
  },
  
  // Compliance Metrics
  complianceMetrics: {
    integrityChecksPerformed: { type: Number, default: 0 },
    integrityIssuesFound: { type: Number, default: 0 },
    retentionPolicyViolations: { type: Number, default: 0 }
  },
  
  // Generation Metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  generatedBy: {
    type: String,
    default: 'audit-logging-service'
  }
}, {
  timestamps: true,
  collection: 'audit_summaries'
});

// Compound indexes for efficient querying
auditSummarySchema.index({ tenantId: 1, periodType: 1, periodStart: -1 });
auditSummarySchema.index({ tenantId: 1, branchId: 1, periodStart: -1 });

// Static methods for summary operations
auditSummarySchema.statics.findByPeriod = function(tenantId, periodType, startDate, endDate) {
  return this.find({
    tenantId,
    periodType,
    periodStart: { $gte: startDate },
    periodEnd: { $lte: endDate }
  }).sort({ periodStart: -1 });
};

auditSummarySchema.statics.getLatestSummary = function(tenantId, periodType, branchId = null) {
  const query = { tenantId, periodType };
  if (branchId) query.branchId = branchId;
  
  return this.findOne(query).sort({ periodStart: -1 });
};

module.exports = mongoose.model('AuditSummary', auditSummarySchema);