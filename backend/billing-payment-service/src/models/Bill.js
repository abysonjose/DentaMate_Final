const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    required: true,
    enum: ['CONSULTATION', 'PROCEDURE', 'DIAGNOSTIC', 'MEDICATION', 'OTHER']
  },
  itemId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxPercent: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const billSchema = new mongoose.Schema({
  billId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  billNumber: {
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
  items: [billItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalTax: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['DRAFT', 'GENERATED', 'CANCELLED'],
    default: 'DRAFT'
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
billSchema.index({ tenantId: 1, branchId: 1 });
billSchema.index({ patientId: 1, createdAt: -1 });
billSchema.index({ appointmentId: 1 });
billSchema.index({ status: 1, createdAt: -1 });
billSchema.index({ billNumber: 1 }, { unique: true });

// Pre-save middleware to calculate totals
billSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalDiscount = this.items.reduce((sum, item) => sum + item.discountAmount, 0);
    this.totalTax = this.items.reduce((sum, item) => sum + item.taxAmount, 0);
    this.totalAmount = this.subtotal - this.totalDiscount + this.totalTax;
  }
  next();
});

// Virtual for formatted bill number
billSchema.virtual('formattedBillNumber').get(function() {
  return `BILL-${this.billNumber}`;
});

// Static method to generate bill number
billSchema.statics.generateBillNumber = async function(tenantId, branchId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const prefix = `${year}${month}${day}`;
  
  // Find the last bill number for today
  const lastBill = await this.findOne({
    tenantId,
    branchId,
    billNumber: { $regex: `^${prefix}` }
  }).sort({ billNumber: -1 });
  
  let sequence = 1;
  if (lastBill) {
    const lastSequence = parseInt(lastBill.billNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

// Instance method to cancel bill
billSchema.methods.cancel = function(userId, reason) {
  this.status = 'CANCELLED';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

// Instance method to check if bill can be modified
billSchema.methods.canModify = function() {
  return this.status === 'DRAFT';
};

module.exports = mongoose.model('Bill', billSchema);