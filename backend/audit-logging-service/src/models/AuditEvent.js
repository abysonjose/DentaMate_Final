const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Audit Event Schema - Immutable by design
const auditEventSchema = new mongoose.Schema({
  // Core Event Identification
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,
    immutable: true
  },
  
  // Timestamp - Critical for audit trail
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    immutable: true,
    index: true
  },
  
  // Actor Information - Who performed the action
  actorId: {
    type: String,
    required: true,
    immutable: true,
    index: true
  },
  
  actorRole: {
    type: String,
    required: true,
    enum: [
      'PATIENT', 'DOCTOR', 'NURSE', 'HEAD_NURSE', 'ORTHOTIST',
      'LAB_STAFF', 'PHARMACIST', 'RECEPTIONIST', 'SUPPORT_STAFF',
      'BILLING_OFFICER', 'CASHIER', 'ACCOUNTANT', 'ACCOUNTS_MANAGER',
      'PAYROLL_OFFICER', 'INSURANCE_STAFF', 'HR_STAFF',
      'BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN', 'SYSTEM'
    ],
    immutable: true,
    index: true
  },
  
  // Action Information - What was done
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'],
    immutable: true,
    index: true
  },
  
  // Resource Information - What was acted upon
  resource: {
    type: {
      type: String,
      required: true,
      enum: [
        'PATIENT', 'APPOINTMENT', 'MEDICAL_RECORD', 'PRESCRIPTION',
        'INVOICE', 'PAYMENT', 'REFUND', 'INSURANCE_CLAIM',
        'INVENTORY_ITEM', 'STAFF_RECORD', 'PAYROLL', 'ATTENDANCE',
        'TENANT', 'BRANCH', 'USER_ACCOUNT', 'ROLE', 'PERMISSION',
        'AI_ANALYSIS', 'LAB_RESULT', 'QUEUE_TOKEN', 'NOTIFICATION',
        'REPORT', 'BACKUP', 'SYSTEM_CONFIG', 'LICENSE'
      ],
      immutable: true
    },
    id: {
      type: String,
      required: true,
      immutable: true
    }
  },
  
  // Tenant & Branch Context - Critical for multi-tenancy
  tenantId: {
    type: String,
    required: true,
    immutable: true,
    index: true
  },
  
  branchId: {
    type: String,
    required: false,
    immutable: true,
    index: true
  },
  
  // Source Service - Which service generated this event
  sourceService: {
    type: String,
    required: true,
    enum: [
      'auth-identity-service', 'tenant-organization-service',
      'appointment-scheduling-service', 'token-queue-realtime-service',
      'nursing-care-service', 'orthodontic-braces-service',
      'lab-diagnostics-service', 'ai-diagnosis-service',
      'prescription-ocr-service', 'billing-payment-service',
      'insurance-claims-service', 'accounting-finance-service',
      'payroll-hr-service', 'inventory-pharmacy-service',
      'collaboration-meeting-service', 'notification-communication-service',
      'analytics-intelligence-service', 'audit-logging-service',
      'api-gateway', 'frontend-application'
    ],
    immutable: true,
    index: true
  },
  
  // Event Category for filtering and compliance
  category: {
    type: String,
    required: true,
    enum: ['SECURITY', 'CLINICAL', 'FINANCIAL', 'HR_PAYROLL', 'SAAS_GOVERNANCE', 'SYSTEM'],
    immutable: true,
    index: true
  },
  
  // Severity Level
  severity: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
    immutable: true,
    index: true
  },
  
  // Additional Metadata
  metadata: {
    ipAddress: {
      type: String,
      immutable: true
    },
    userAgent: {
      type: String,
      immutable: true
    },
    sessionId: {
      type: String,
      immutable: true
    },
    reason: {
      type: String,
      immutable: true
    },
    additionalData: {
      type: mongoose.Schema.Types.Mixed,
      immutable: true
    }
  },
  
  // Integrity & Hash Chain (for tamper detection)
  hashChain: {
    type: String,
    immutable: true
  },
  
  previousEventHash: {
    type: String,
    immutable: true
  },
  
  // Compliance & Retention
  retentionDate: {
    type: Date,
    required: true,
    immutable: true,
    index: true
  },
  
  // Status for lifecycle management
  status: {
    type: String,
    enum: ['ACTIVE', 'ARCHIVED', 'RETENTION_EXPIRED'],
    default: 'ACTIVE',
    index: true
  }
}, {
  timestamps: { 
    createdAt: true, 
    updatedAt: false // Prevent updates to maintain immutability
  },
  collection: 'audit_events',
  strict: true,
  versionKey: false
});

// Compound Indexes for efficient querying
auditEventSchema.index({ tenantId: 1, timestamp: -1 });
auditEventSchema.index({ tenantId: 1, category: 1, timestamp: -1 });
auditEventSchema.index({ tenantId: 1, actorId: 1, timestamp: -1 });
auditEventSchema.index({ tenantId: 1, sourceService: 1, timestamp: -1 });
auditEventSchema.index({ tenantId: 1, action: 1, timestamp: -1 });
auditEventSchema.index({ tenantId: 1, severity: 1, timestamp: -1 });
auditEventSchema.index({ retentionDate: 1 }); // For retention policy cleanup

// Pre-save middleware for hash chain calculation
auditEventSchema.pre('save', async function(next) {
  if (this.isNew && process.env.ENABLE_HASH_CHAINING === 'true') {
    try {
      // Find the last event for this tenant to create hash chain
      const lastEvent = await this.constructor.findOne(
        { tenantId: this.tenantId },
        { hashChain: 1 },
        { sort: { timestamp: -1 } }
      );
      
      if (lastEvent && lastEvent.hashChain) {
        this.previousEventHash = lastEvent.hashChain;
      }
      
      // Calculate hash for this event
      const eventData = {
        eventId: this.eventId,
        timestamp: this.timestamp,
        actorId: this.actorId,
        action: this.action,
        resource: this.resource,
        tenantId: this.tenantId,
        sourceService: this.sourceService,
        previousEventHash: this.previousEventHash || ''
      };
      
      this.hashChain = crypto
        .createHash('sha256')
        .update(JSON.stringify(eventData))
        .digest('hex');
      
      // Set retention date (7 years from creation)
      const retentionYears = parseInt(process.env.AUDIT_RETENTION_YEARS) || 7;
      this.retentionDate = new Date(Date.now() + (retentionYears * 365 * 24 * 60 * 60 * 1000));
      
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Prevent updates and deletes to maintain immutability
auditEventSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function() {
  throw new Error('Audit events are immutable and cannot be updated');
});

auditEventSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function() {
  throw new Error('Audit events are immutable and cannot be deleted');
});

// Static methods for querying
auditEventSchema.statics.findByTenant = function(tenantId, filters = {}) {
  return this.find({ tenantId, ...filters }).sort({ timestamp: -1 });
};

auditEventSchema.statics.findByActor = function(tenantId, actorId, filters = {}) {
  return this.find({ tenantId, actorId, ...filters }).sort({ timestamp: -1 });
};

auditEventSchema.statics.findByCategory = function(tenantId, category, filters = {}) {
  return this.find({ tenantId, category, ...filters }).sort({ timestamp: -1 });
};

auditEventSchema.statics.findByDateRange = function(tenantId, startDate, endDate, filters = {}) {
  return this.find({
    tenantId,
    timestamp: { $gte: startDate, $lte: endDate },
    ...filters
  }).sort({ timestamp: -1 });
};

// Method to verify hash chain integrity
auditEventSchema.statics.verifyIntegrity = async function(tenantId, limit = 1000) {
  const events = await this.find({ tenantId })
    .sort({ timestamp: 1 })
    .limit(limit)
    .select('eventId hashChain previousEventHash timestamp');
  
  let isValid = true;
  const issues = [];
  
  for (let i = 1; i < events.length; i++) {
    const currentEvent = events[i];
    const previousEvent = events[i - 1];
    
    if (currentEvent.previousEventHash !== previousEvent.hashChain) {
      isValid = false;
      issues.push({
        eventId: currentEvent.eventId,
        issue: 'Hash chain broken',
        timestamp: currentEvent.timestamp
      });
    }
  }
  
  return { isValid, issues, eventsChecked: events.length };
};

module.exports = mongoose.model('AuditEvent', auditEventSchema);