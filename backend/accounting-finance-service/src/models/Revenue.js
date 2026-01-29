const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  revenueId: {
    type: String,
    required: true,
    unique: true,
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
  source: {
    type: String,
    required: true,
    enum: ['PATIENT_PAYMENT', 'INSURANCE_SETTLEMENT', 'OTHER'],
    index: true
  },
  sourceReference: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
    validate: {
      validator: function(value) {
        return Number.isInteger(value * 100);
      },
      message: 'Amount must have maximum 2 decimal places'
    }
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  period: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(value) {
        return /^\d{4}-\d{2}$/.test(value);
      },
      message: 'Period must be in YYYY-MM format'
    }
  },
  financialYear: {
    type: String,
    required: true,
    index: true
  },
  department: {
    type: String,
    required: true,
    enum: [
      'GENERAL_DENTISTRY', 'ORTHODONTICS', 'ORAL_SURGERY', 
      'PERIODONTICS', 'ENDODONTICS', 'PEDIATRIC_DENTISTRY',
      'PROSTHODONTICS', 'ORAL_PATHOLOGY', 'ADMINISTRATION'
    ],
    index: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  doctorName: {
    type: String,
    required: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  patientName: {
    type: String,
    required: true
  },
  treatmentType: {
    type: String,
    required: true,
    enum: [
      'CONSULTATION', 'CLEANING', 'FILLING', 'EXTRACTION', 
      'ROOT_CANAL', 'CROWN', 'BRIDGE', 'IMPLANT', 
      'ORTHODONTIC_TREATMENT', 'SURGERY', 'OTHER'
    ],
    index: true
  },
  treatmentCode: {
    type: String,
    maxlength: 20
  },
  invoiceId: {
    type: String,
    required: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHEQUE', 'INSURANCE', 'OTHER'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['FULL_PAYMENT', 'PARTIAL_PAYMENT', 'ADVANCE_PAYMENT'],
    required: true,
    index: true
  },
  originalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  isInsuranceClaim: {
    type: Boolean,
    default: false,
    index: true
  },
  insuranceDetails: {
    policyNumber: String,
    insuranceCompany: String,
    claimNumber: String,
    approvalNumber: String,
    settlementDate: Date
  },
  isRefunded: {
    type: Boolean,
    default: false,
    index: true
  },
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundDate: Date,
    refundReason: String
  },
  ledgerEntryId: {
    type: String,
    index: true
  },
  isPostedToLedger: {
    type: Boolean,
    default: false,
    index: true
  },
  reconciliationStatus: {
    type: String,
    enum: ['MATCHED', 'PENDING', 'FLAGGED'],
    default: 'PENDING',
    index: true
  },
  reconciliationDate: {
    type: Date
  },
  reconciliationNotes: {
    type: String,
    maxlength: 500
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  notes: {
    type: String,
    maxlength: 1000
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  auditLog: [{
    action: {
      type: String,
      enum: ['CREATED', 'UPDATED', 'POSTED_TO_LEDGER', 'RECONCILED', 'REFUNDED'],
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    comments: String
  }]
}, {
  timestamps: true,
  collection: 'revenue'
});

// Compound indexes
revenueSchema.index({ tenantId: 1, branchId: 1, date: -1 });
revenueSchema.index({ tenantId: 1, branchId: 1, department: 1, date: -1 });
revenueSchema.index({ tenantId: 1, branchId: 1, doctorId: 1, date: -1 });
revenueSchema.index({ tenantId: 1, branchId: 1, treatmentType: 1, date: -1 });
revenueSchema.index({ tenantId: 1, branchId: 1, period: 1 });
revenueSchema.index({ tenantId: 1, branchId: 1, reconciliationStatus: 1 });

// Pre-save middleware
revenueSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate revenueId if not provided
    if (!this.revenueId) {
      this.revenueId = `REV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Set period if not provided
    if (!this.period) {
      const date = new Date(this.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      this.period = `${year}-${month}`;
    }
    
    // Set financial year
    if (!this.financialYear) {
      const date = new Date(this.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const fyStartMonth = parseInt(process.env.FINANCIAL_YEAR_START_MONTH) || 4;
      
      if (month >= fyStartMonth) {
        this.financialYear = `${year}-${year + 1}`;
      } else {
        this.financialYear = `${year - 1}-${year}`;
      }
    }
    
    // Calculate net amount if not provided
    if (!this.netAmount) {
      this.netAmount = this.originalAmount - this.discountAmount + this.taxAmount;
    }
    
    // Add creation audit log
    this.auditLog.push({
      action: 'CREATED',
      userId: this.createdBy,
      timestamp: new Date(),
      details: {
        amount: this.amount,
        source: this.source,
        doctorId: this.doctorId,
        treatmentType: this.treatmentType
      }
    });
  }
  
  this.updatedAt = new Date();
  next();
});

// Instance methods
revenueSchema.methods.postToLedger = function(ledgerEntryId, userId) {
  this.isPostedToLedger = true;
  this.ledgerEntryId = ledgerEntryId;
  
  this.auditLog.push({
    action: 'POSTED_TO_LEDGER',
    userId,
    timestamp: new Date(),
    details: { ledgerEntryId }
  });
  
  return this.save();
};

revenueSchema.methods.reconcile = function(userId, notes) {
  this.reconciliationStatus = 'MATCHED';
  this.reconciliationDate = new Date();
  this.reconciliationNotes = notes;
  
  this.auditLog.push({
    action: 'RECONCILED',
    userId,
    timestamp: new Date(),
    comments: notes
  });
  
  return this.save();
};

revenueSchema.methods.flagForReview = function(userId, reason) {
  this.reconciliationStatus = 'FLAGGED';
  this.reconciliationNotes = reason;
  
  this.auditLog.push({
    action: 'RECONCILED',
    userId,
    timestamp: new Date(),
    details: { status: 'FLAGGED' },
    comments: reason
  });
  
  return this.save();
};

revenueSchema.methods.processRefund = function(refundId, refundAmount, refundReason, userId) {
  this.isRefunded = true;
  this.refundDetails = {
    refundId,
    refundAmount,
    refundDate: new Date(),
    refundReason
  };
  
  this.auditLog.push({
    action: 'REFUNDED',
    userId,
    timestamp: new Date(),
    details: {
      refundId,
      refundAmount,
      refundReason
    }
  });
  
  return this.save();
};

// Static methods
revenueSchema.statics.getRevenueSummary = async function(tenantId, branchId, period) {
  const pipeline = [
    {
      $match: {
        tenantId,
        branchId,
        period,
        isRefunded: false
      }
    },
    {
      $group: {
        _id: {
          department: '$department',
          treatmentType: '$treatmentType'
        },
        totalRevenue: { $sum: '$amount' },
        count: { $sum: 1 },
        avgRevenue: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

revenueSchema.statics.getDoctorRevenue = async function(tenantId, branchId, doctorId, period) {
  const pipeline = [
    {
      $match: {
        tenantId,
        branchId,
        doctorId,
        period,
        isRefunded: false
      }
    },
    {
      $group: {
        _id: '$treatmentType',
        totalRevenue: { $sum: '$amount' },
        count: { $sum: 1 },
        avgRevenue: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

revenueSchema.statics.getUnreconciledRevenue = async function(tenantId, branchId) {
  return await this.find({
    tenantId,
    branchId,
    reconciliationStatus: 'PENDING'
  }).sort({ date: 1 });
};

revenueSchema.statics.getRevenueByPeriod = async function(tenantId, branchId, startPeriod, endPeriod) {
  const pipeline = [
    {
      $match: {
        tenantId,
        branchId,
        period: { $gte: startPeriod, $lte: endPeriod },
        isRefunded: false
      }
    },
    {
      $group: {
        _id: '$period',
        totalRevenue: { $sum: '$amount' },
        patientPayments: {
          $sum: {
            $cond: [{ $eq: ['$source', 'PATIENT_PAYMENT'] }, '$amount', 0]
          }
        },
        insuranceSettlements: {
          $sum: {
            $cond: [{ $eq: ['$source', 'INSURANCE_SETTLEMENT'] }, '$amount', 0]
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

module.exports = mongoose.model('Revenue', revenueSchema);