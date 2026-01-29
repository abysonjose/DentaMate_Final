const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expenseId: {
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
  category: {
    type: String,
    required: true,
    enum: [
      'EQUIPMENT', 'SUPPLIES', 'UTILITIES', 'RENT', 'INSURANCE',
      'MARKETING', 'PROFESSIONAL_SERVICES', 'MAINTENANCE',
      'STAFF_TRAINING', 'OFFICE_SUPPLIES', 'TECHNOLOGY',
      'TRAVEL', 'MEALS', 'OTHER'
    ],
    index: true
  },
  subcategory: {
    type: String,
    maxlength: 100
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
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  vendor: {
    name: {
      type: String,
      required: true,
      maxlength: 200
    },
    contactInfo: {
      email: String,
      phone: String,
      address: String
    },
    vendorId: String
  },
  invoiceNumber: {
    type: String,
    maxlength: 100,
    index: true
  },
  purchaseOrderNumber: {
    type: String,
    maxlength: 100
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'OTHER'],
    default: 'BANK_TRANSFER'
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  paymentDate: {
    type: Date
  },
  dueDate: {
    type: Date,
    index: true
  },
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_REVIEW'],
    default: 'PENDING',
    index: true
  },
  approvedBy: {
    userId: String,
    userName: String,
    approvalDate: Date,
    comments: String
  },
  department: {
    type: String,
    enum: [
      'GENERAL_DENTISTRY', 'ORTHODONTICS', 'ORAL_SURGERY', 
      'PERIODONTICS', 'ENDODONTICS', 'PEDIATRIC_DENTISTRY',
      'PROSTHODONTICS', 'ORAL_PATHOLOGY', 'ADMINISTRATION',
      'FACILITIES', 'IT', 'MARKETING', 'HR'
    ]
  },
  isTaxDeductible: {
    type: Boolean,
    default: true
  },
  taxCategory: {
    type: String,
    enum: ['BUSINESS_EXPENSE', 'CAPITAL_EXPENDITURE', 'NON_DEDUCTIBLE'],
    default: 'BUSINESS_EXPENSE'
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
    required: function() { return this.isRecurring; }
  },
  nextRecurringDate: {
    type: Date,
    required: function() { return this.isRecurring; }
  },
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
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
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: String,
      required: true
    }
  }],
  tags: [{
    type: String,
    maxlength: 50
  }],
  notes: {
    type: String,
    maxlength: 1000
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
      enum: ['CREATED', 'UPDATED', 'APPROVED', 'REJECTED', 'PAID', 'POSTED_TO_LEDGER'],
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
  collection: 'expenses'
});

// Compound indexes
expenseSchema.index({ tenantId: 1, branchId: 1, date: -1 });
expenseSchema.index({ tenantId: 1, branchId: 1, category: 1, date: -1 });
expenseSchema.index({ tenantId: 1, branchId: 1, approvalStatus: 1 });
expenseSchema.index({ tenantId: 1, branchId: 1, paymentStatus: 1 });
expenseSchema.index({ tenantId: 1, branchId: 1, period: 1 });
expenseSchema.index({ tenantId: 1, branchId: 1, vendor: 1 });

// Pre-save middleware
expenseSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate expenseId if not provided
    if (!this.expenseId) {
      this.expenseId = `EXP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    
    // Add creation audit log
    this.auditLog.push({
      action: 'CREATED',
      userId: this.createdBy,
      timestamp: new Date(),
      details: {
        amount: this.amount,
        category: this.category,
        vendor: this.vendor.name
      }
    });
  }
  
  this.updatedAt = new Date();
  next();
});

// Instance methods
expenseSchema.methods.approve = function(userId, userName, comments) {
  if (this.approvalStatus === 'APPROVED') {
    throw new Error('Expense is already approved');
  }
  
  this.approvalStatus = 'APPROVED';
  this.approvedBy = {
    userId,
    userName,
    approvalDate: new Date(),
    comments
  };
  
  this.auditLog.push({
    action: 'APPROVED',
    userId,
    timestamp: new Date(),
    comments
  });
  
  return this.save();
};

expenseSchema.methods.reject = function(userId, comments) {
  if (this.approvalStatus === 'REJECTED') {
    throw new Error('Expense is already rejected');
  }
  
  this.approvalStatus = 'REJECTED';
  this.auditLog.push({
    action: 'REJECTED',
    userId,
    timestamp: new Date(),
    comments
  });
  
  return this.save();
};

expenseSchema.methods.markAsPaid = function(userId, paymentDate, paymentMethod) {
  this.paymentStatus = 'PAID';
  this.paymentDate = paymentDate || new Date();
  if (paymentMethod) {
    this.paymentMethod = paymentMethod;
  }
  
  this.auditLog.push({
    action: 'PAID',
    userId,
    timestamp: new Date(),
    details: {
      paymentDate: this.paymentDate,
      paymentMethod: this.paymentMethod
    }
  });
  
  return this.save();
};

expenseSchema.methods.postToLedger = function(ledgerEntryId, userId) {
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

// Static methods
expenseSchema.statics.getExpenseSummary = async function(tenantId, branchId, period) {
  const pipeline = [
    {
      $match: {
        tenantId,
        branchId,
        period,
        approvalStatus: 'APPROVED'
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

expenseSchema.statics.getPendingApprovals = async function(tenantId, branchId) {
  return await this.find({
    tenantId,
    branchId,
    approvalStatus: 'PENDING'
  }).sort({ createdAt: 1 });
};

expenseSchema.statics.getOverduePayments = async function(tenantId, branchId) {
  const today = new Date();
  return await this.find({
    tenantId,
    branchId,
    paymentStatus: { $in: ['PENDING', 'PARTIALLY_PAID'] },
    dueDate: { $lt: today }
  }).sort({ dueDate: 1 });
};

module.exports = mongoose.model('Expense', expenseSchema);