const mongoose = require('mongoose');

const claimDocumentSchema = new mongoose.Schema({
  documentId: {
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
  documentType: {
    type: String,
    enum: [
      'invoice',
      'treatment_summary',
      'diagnostic_report',
      'xray',
      'prescription',
      'lab_report',
      'supporting_document',
      'correspondence',
      'policy_document',
      'other'
    ],
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalFileName: String,
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileHash: String,
  version: {
    type: Number,
    default: 1
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'verified', 'rejected', 'archived'],
    default: 'uploaded'
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  verifiedBy: String,
  verifiedAt: Date,
  rejectionReason: String,
  metadata: {
    description: String,
    tags: [String],
    externalReference: String
  }
}, {
  timestamps: true,
  collection: 'claim_documents'
});

// Indexes
claimDocumentSchema.index({ claimId: 1, documentType: 1 });
claimDocumentSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model('ClaimDocument', claimDocumentSchema);