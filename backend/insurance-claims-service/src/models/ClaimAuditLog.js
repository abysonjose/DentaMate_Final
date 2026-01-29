const mongoose = require('mongoose');

const claimAuditLogSchema = new mongoose.Schema({
  auditId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  claimId: {
    type: String,
    required: true,
    ref: 'InsuranceClaim',
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'CLAIM_CREATED',
      'CLAIM_UPDATED',
      'STATUS_CHANGED',
      'DOCUMENT_UPLOADED',
      'DOCUMENT_REMOVED',
      'CLAIM_SUBMITTED',
      'CLAIM_RESUBMITTED',
      'APPROVAL_RECEIVED',
      'REJECTION_RECEIVED',
      'SETTLEMENT_RECORDED',
      'CLAIM_CANCELLED',
      'FOLLOW_UP_ADDED',
      'NOTES_UPDATED'
    ],
    required: true
  },
  performedBy: {
    userId: {
      type: String,
      required: true
    },
    userRole: String,
    userName: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  changes: {
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  },
  description: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  }
}, {
  timestamps: false,
  collection: 'claim_audit_logs'
});

// Indexes for performance
claimAuditLogSchema.index({ claimId: 1, timestamp: -1 });
claimAuditLogSchema.index({ tenantId: 1, branchId: 1, timestamp: -1 });
claimAuditLogSchema.index({ action: 1, timestamp: -1 });
claimAuditLogSchema.index({ 'performedBy.userId': 1, timestamp: -1 });

module.exports = mongoose.model('ClaimAuditLog', claimAuditLogSchema);