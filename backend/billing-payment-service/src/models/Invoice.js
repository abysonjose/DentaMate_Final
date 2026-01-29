const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  invoiceNumber: {
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
  billId: {
    type: String,
    required: true,
    index: true
  },
  appointmentId: {
    type: String,
    required: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  doctorId: {
    type: String,
    required: true
  },
  patientDetails: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String }
  },
  clinicDetails: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    gstNumber: { type: String },
    licenseNumber: { type: String }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  balanceAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['GENERATED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED'],
    default: 'GENERATED'
  },
  dueDate: {
    type: Date,
    required: true
  },
  pdfPath: {
    type: String
  },
  pdfGenerated: {
    type: Boolean,
    default: false
  },
  paymentTerms: {
    type: String,
    default: 'Payment due immediately'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdByRole: {
    type: String,
    required: true,
    enum: ['BILLING_OFFICER']
  },
  lastPaymentDate: {
    type: Date
  },
  cancelledBy: {
    type: String
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
invoiceSchema.index({ tenantId: 1, branchId: 1 });
invoiceSchema.index({ patientId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ billId: 1 });

// Pre-save middleware to calculate balance
invoiceSchema.pre('save', function(next) {
  this.balanceAmount = this.totalAmount - this.paidAmount;
  
  // Update status based on payment
  if (this.paidAmount === 0) {
    this.status = 'GENERATED';
  } else if (this.paidAmount < this.totalAmount) {
    this.status = 'PARTIALLY_PAID';
  } else if (this.paidAmount >= this.totalAmount) {
    this.status = 'PAID';
  }
  
  next();
});

// Virtual for formatted invoice number
invoiceSchema.virtual('formattedInvoiceNumber').get(function() {
  return `INV-${this.invoiceNumber}`;
});

// Virtual for overdue status
invoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'PAID' && new Date() > this.dueDate;
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  const diffTime = new Date() - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function(tenantId, branchId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  const prefix = `${year}${month}`;
  
  // Find the last invoice number for this month
  const lastInvoice = await this.findOne({
    tenantId,
    branchId,
    invoiceNumber: { $regex: `^${prefix}` }
  }).sort({ invoiceNumber: -1 });
  
  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-6));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${String(sequence).padStart(6, '0')}`;
};

// Instance method to record payment
invoiceSchema.methods.recordPayment = function(amount, paymentId) {
  this.paidAmount += amount;
  this.lastPaymentDate = new Date();
  
  // Update status
  if (this.paidAmount >= this.totalAmount) {
    this.status = 'PAID';
  } else {
    this.status = 'PARTIALLY_PAID';
  }
  
  return this.save();
};

// Instance method to cancel invoice
invoiceSchema.methods.cancel = function(userId, reason) {
  this.status = 'CANCELLED';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

// Instance method to check if invoice can be paid
invoiceSchema.methods.canAcceptPayment = function() {
  return ['GENERATED', 'PARTIALLY_PAID'].includes(this.status) && this.balanceAmount > 0;
};

// Instance method to check if invoice can be cancelled
invoiceSchema.methods.canCancel = function() {
  return ['GENERATED', 'PARTIALLY_PAID'].includes(this.status);
};

module.exports = mongoose.model('Invoice', invoiceSchema);