const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  paymentNumber: {
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
  billId: {
    type: String,
    required: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  mode: {
    type: String,
    required: true,
    enum: ['CASH', 'UPI', 'CARD', 'WALLET', 'BANK_TRANSFER', 'CHEQUE']
  },
  status: {
    type: String,
    required: true,
    enum: ['INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'],
    default: 'INITIATED'
  },
  transactionId: {
    type: String,
    index: true
  },
  gatewayPaymentId: {
    type: String,
    index: true
  },
  gatewayOrderId: {
    type: String
  },
  gatewaySignature: {
    type: String
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  paymentDetails: {
    cardLast4: { type: String },
    cardType: { type: String },
    bankName: { type: String },
    upiId: { type: String },
    chequeNumber: { type: String },
    chequeDate: { type: Date },
    bankReference: { type: String }
  },
  receivedBy: {
    type: String,
    required: true
  },
  receivedByRole: {
    type: String,
    required: true,
    enum: ['CASHIER']
  },
  processedAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundStatus: {
    type: String,
    enum: ['NONE', 'PARTIAL', 'FULL'],
    default: 'NONE'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
paymentSchema.index({ tenantId: 1, branchId: 1 });
paymentSchema.index({ patientId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ mode: 1, status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ gatewayPaymentId: 1 });

// Virtual for formatted payment number
paymentSchema.virtual('formattedPaymentNumber').get(function() {
  return `PAY-${this.paymentNumber}`;
});

// Virtual for net amount after refunds
paymentSchema.virtual('netAmount').get(function() {
  return this.amount - this.refundAmount;
});

// Virtual for payment method display
paymentSchema.virtual('paymentMethodDisplay').get(function() {
  switch (this.mode) {
    case 'CASH': return 'Cash';
    case 'UPI': return `UPI${this.paymentDetails?.upiId ? ` (${this.paymentDetails.upiId})` : ''}`;
    case 'CARD': return `Card${this.paymentDetails?.cardLast4 ? ` ending ${this.paymentDetails.cardLast4}` : ''}`;
    case 'WALLET': return 'Digital Wallet';
    case 'BANK_TRANSFER': return 'Bank Transfer';
    case 'CHEQUE': return `Cheque${this.paymentDetails?.chequeNumber ? ` #${this.paymentDetails.chequeNumber}` : ''}`;
    default: return this.mode;
  }
});

// Static method to generate payment number
paymentSchema.statics.generatePaymentNumber = async function(tenantId, branchId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const prefix = `${year}${month}${day}`;
  
  // Find the last payment number for today
  const lastPayment = await this.findOne({
    tenantId,
    branchId,
    paymentNumber: { $regex: `^${prefix}` }
  }).sort({ paymentNumber: -1 });
  
  let sequence = 1;
  if (lastPayment) {
    const lastSequence = parseInt(lastPayment.paymentNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

// Instance method to mark payment as successful
paymentSchema.methods.markSuccess = function(transactionDetails = {}) {
  this.status = 'SUCCESS';
  this.processedAt = new Date();
  
  if (transactionDetails.transactionId) {
    this.transactionId = transactionDetails.transactionId;
  }
  
  if (transactionDetails.gatewayResponse) {
    this.gatewayResponse = transactionDetails.gatewayResponse;
  }
  
  return this.save();
};

// Instance method to mark payment as failed
paymentSchema.methods.markFailed = function(reason, gatewayResponse = null) {
  this.status = 'FAILED';
  this.processedAt = new Date();
  this.failureReason = reason;
  
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse;
  }
  
  return this.save();
};

// Instance method to process refund
paymentSchema.methods.processRefund = function(refundAmount) {
  this.refundAmount += refundAmount;
  
  if (this.refundAmount >= this.amount) {
    this.refundStatus = 'FULL';
    this.status = 'REFUNDED';
  } else {
    this.refundStatus = 'PARTIAL';
  }
  
  return this.save();
};

// Instance method to check if payment can be refunded
paymentSchema.methods.canRefund = function() {
  return this.status === 'SUCCESS' && this.refundAmount < this.amount;
};

// Instance method to check if payment is successful
paymentSchema.methods.isSuccessful = function() {
  return this.status === 'SUCCESS';
};

module.exports = mongoose.model('Payment', paymentSchema);