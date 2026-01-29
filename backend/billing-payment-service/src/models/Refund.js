const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  refundId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  refundNumber: {
    type: String,
    required: true,
    unique: true
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
  invoiceId: {
    type: String,
    required: true,
    index: true
  },
  paymentId: {
    type: String,
    required: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  originalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  refundAmount: {
    type: Number,
    required: true,
    min: 0
  },
  refundType: {
    type: String,
    required: true,
    enum: ['FULL', 'PARTIAL', 'BILLING_CORRECTION']
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'REQUESTED'
  },
  requestedBy: {
    type: String,
    required: true
  },
  requestedByRole: {
    type: String,
    required: true,
    enum: ['CASHIER', 'BILLING_OFFICER', 'ACCOUNTS_MANAGER']
  },
  approvedBy: {
    type: String
  },
  approvedByRole: {
    type: String,
    enum: ['ACCOUNTS_MANAGER']
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: String
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  gatewayRefundId: {
    type: String
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  refundMethod: {
    type: String,
    enum: ['ORIGINAL_PAYMENT_METHOD', 'CASH', 'BANK_TRANSFER', 'CHEQUE'],
    default: 'ORIGINAL_PAYMENT_METHOD'
  },
  bankDetails: {
    accountNumber: { type: String },
    ifscCode: { type: String },
    accountHolderName: { type: String },
    bankName: { type: String }
  },
  chequeDetails: {
    chequeNumber: { type: String },
    chequeDate: { type: Date },
    bankName: { type: String }
  },
  notes: {
    type: String,
    trim: true
  },
  approvalNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
refundSchema.index({ tenantId: 1, branchId: 1 });
refundSchema.index({ patientId: 1, createdAt: -1 });
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ invoiceId: 1 });
refundSchema.index({ paymentId: 1 });
refundSchema.index({ approvedBy: 1, approvedAt: -1 });

// Virtual for formatted refund number
refundSchema.virtual('formattedRefundNumber').get(function() {
  return `REF-${this.refundNumber}`;
});

// Virtual for processing time
refundSchema.virtual('processingDays').get(function() {
  if (!this.completedAt) return null;
  const diffTime = this.completedAt - this.createdAt;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for approval time
refundSchema.virtual('approvalDays').get(function() {
  if (!this.approvedAt) return null;
  const diffTime = this.approvedAt - this.createdAt;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static method to generate refund number
refundSchema.statics.generateRefundNumber = async function(tenantId, branchId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  const prefix = `${year}${month}`;
  
  // Find the last refund number for this month
  const lastRefund = await this.findOne({
    tenantId,
    branchId,
    refundNumber: { $regex: `^${prefix}` }
  }).sort({ refundNumber: -1 });
  
  let sequence = 1;
  if (lastRefund) {
    const lastSequence = parseInt(lastRefund.refundNumber.slice(-6));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${String(sequence).padStart(6, '0')}`;
};

// Instance method to approve refund
refundSchema.methods.approve = function(userId, notes = '') {
  this.status = 'APPROVED';
  this.approvedBy = userId;
  this.approvedByRole = 'ACCOUNTS_MANAGER';
  this.approvedAt = new Date();
  this.approvalNotes = notes;
  return this.save();
};

// Instance method to reject refund
refundSchema.methods.reject = function(userId, reason) {
  this.status = 'REJECTED';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Instance method to mark as processing
refundSchema.methods.markProcessing = function() {
  this.status = 'PROCESSING';
  this.processedAt = new Date();
  return this.save();
};

// Instance method to mark as completed
refundSchema.methods.markCompleted = function(gatewayRefundId = null, gatewayResponse = null) {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  
  if (gatewayRefundId) {
    this.gatewayRefundId = gatewayRefundId;
  }
  
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse;
  }
  
  return this.save();
};

// Instance method to mark as failed
refundSchema.methods.markFailed = function(reason, gatewayResponse = null) {
  this.status = 'FAILED';
  this.rejectionReason = reason;
  
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse;
  }
  
  return this.save();
};

// Instance method to check if refund can be approved
refundSchema.methods.canApprove = function() {
  return this.status === 'REQUESTED';
};

// Instance method to check if refund can be processed
refundSchema.methods.canProcess = function() {
  return this.status === 'APPROVED';
};

// Instance method to check if refund is pending approval
refundSchema.methods.isPendingApproval = function() {
  return this.status === 'REQUESTED';
};

module.exports = mongoose.model('Refund', refundSchema);