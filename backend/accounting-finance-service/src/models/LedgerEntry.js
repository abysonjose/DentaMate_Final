const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  entryId: {
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
  debitAccount: {
    type: String,
    required: true,
    enum: [
      'CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'EQUIPMENT',
      'PREPAID_EXPENSES', 'OTHER_ASSETS', 'GOODWILL'
    ]
  },
  creditAccount: {
    type: String,
    required: true,
    enum: [
      'REVENUE', 'ACCOUNTS_PAYABLE', 'ACCRUED_EXPENSES', 'UNEARNED_REVENUE',
      'LOANS_PAYABLE', 'EQUITY', 'RETAINED_EARNINGS', 'OTHER_LIABILITIES'
    ]
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
    validate: {
      validator: function(value) {
        // Ensure amount has maximum 2 decimal places
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
  reference: {
    type: String,
    required: true,
    index: true
  },
  referenceService: {
    type: String,
    required: true,
    enum: [
      'billing-payment-service',
      'insurance-claims-service',
      'payroll-hr-service',
      'manual-entry'
    ]
  },
  period: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(value) {
        // Format: YYYY-MM
        return /^\d{4}-\d{2}$/.test(value);
      },
      message: 'Period must be in YYYY-MM format'
    }
  },
  financialYear: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(value) {
        // Format: YYYY-YYYY (e.g., 2026-2027)
        return /^\d{4}-\d{4}$/.test(value);
      },
      message: 'Financial year must be in YYYY-YYYY format'
    }
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  isPosted: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  isReversed: {
    type: Boolean,
    default: false,
    index: true
  },
  reversalEntryId: {
    type: String,
    default: null,
    index: true
  },
  department: {
    type: String,
    enum: [
      'GENERAL_DENTISTRY', 'ORTHODONTICS', 'ORAL_SURGERY', 
      'PERIODONTICS', 'ENDODONTICS', 'PEDIATRIC_DENTISTRY',
      'PROSTHODONTICS', 'ORAL_PATHOLOGY', 'ADMINISTRATION'
    ]
  },
  doctorId: {
    type: String,
    index: true
  },
  patientId: {
    type: String,
    index: true
  },
  treatmentType: {
    type: String,
    enum: [
      'CONSULTATION', 'CLEANING', 'FILLING', 'EXTRACTION', 
      'ROOT_CANAL', 'CROWN', 'BRIDGE', 'IMPLANT', 
      'ORTHODONTIC_TREATMENT', 'SURGERY', 'OTHER'
    ]
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
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
      enum: ['CREATED', 'POSTED', 'REVERSED', 'MODIFIED'],
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
    }
  }]
}, {
  timestamps: true,
  collection: 'ledger_entries'
});

// Compound indexes for efficient queries
ledgerEntrySchema.index({ tenantId: 1, branchId: 1, period: 1 });
ledgerEntrySchema.index({ tenantId: 1, branchId: 1, date: -1 });
ledgerEntrySchema.index({ tenantId: 1, branchId: 1, isPosted: 1 });
ledgerEntrySchema.index({ tenantId: 1, branchId: 1, debitAccount: 1, creditAccount: 1 });
ledgerEntrySchema.index({ tenantId: 1, branchId: 1, doctorId: 1, date: -1 });
ledgerEntrySchema.index({ tenantId: 1, branchId: 1, department: 1, date: -1 });

// Pre-save middleware
ledgerEntrySchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate entryId if not provided
    if (!this.entryId) {
      this.entryId = `LE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Set financial year based on date
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
    
    // Set period if not provided
    if (!this.period) {
      const date = new Date(this.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      this.period = `${year}-${month}`;
    }
    
    // Add creation audit log
    this.auditLog.push({
      action: 'CREATED',
      userId: this.createdBy,
      timestamp: new Date(),
      details: {
        amount: this.amount,
        debitAccount: this.debitAccount,
        creditAccount: this.creditAccount
      }
    });
  }
  
  this.updatedAt = new Date();
  next();
});

// Instance methods
ledgerEntrySchema.methods.post = function(userId) {
  if (this.isPosted) {
    throw new Error('Entry is already posted');
  }
  
  this.isPosted = true;
  this.auditLog.push({
    action: 'POSTED',
    userId: userId,
    timestamp: new Date()
  });
  
  return this.save();
};

ledgerEntrySchema.methods.reverse = function(userId, reversalReason) {
  if (!this.isPosted) {
    throw new Error('Cannot reverse unposted entry');
  }
  
  if (this.isReversed) {
    throw new Error('Entry is already reversed');
  }
  
  this.isReversed = true;
  this.auditLog.push({
    action: 'REVERSED',
    userId: userId,
    timestamp: new Date(),
    details: { reason: reversalReason }
  });
  
  return this.save();
};

// Static methods
ledgerEntrySchema.statics.getTrialBalance = async function(tenantId, branchId, period) {
  const pipeline = [
    {
      $match: {
        tenantId,
        branchId,
        period,
        isPosted: true,
        isReversed: false
      }
    },
    {
      $group: {
        _id: null,
        totalDebits: {
          $sum: {
            $cond: [
              { $in: ['$debitAccount', ['CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'EQUIPMENT', 'PREPAID_EXPENSES', 'OTHER_ASSETS', 'GOODWILL']] },
              '$amount',
              0
            ]
          }
        },
        totalCredits: {
          $sum: {
            $cond: [
              { $in: ['$creditAccount', ['REVENUE', 'ACCOUNTS_PAYABLE', 'ACCRUED_EXPENSES', 'UNEARNED_REVENUE', 'LOANS_PAYABLE', 'EQUITY', 'RETAINED_EARNINGS', 'OTHER_LIABILITIES']] },
              '$amount',
              0
            ]
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || { totalDebits: 0, totalCredits: 0 };
};

ledgerEntrySchema.statics.getAccountBalance = async function(tenantId, branchId, account, period) {
  const pipeline = [
    {
      $match: {
        tenantId,
        branchId,
        period,
        isPosted: true,
        isReversed: false,
        $or: [
          { debitAccount: account },
          { creditAccount: account }
        ]
      }
    },
    {
      $group: {
        _id: null,
        debitTotal: {
          $sum: {
            $cond: [{ $eq: ['$debitAccount', account] }, '$amount', 0]
          }
        },
        creditTotal: {
          $sum: {
            $cond: [{ $eq: ['$creditAccount', account] }, '$amount', 0]
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  if (!result[0]) return 0;
  
  const { debitTotal, creditTotal } = result[0];
  
  // Asset and expense accounts have debit balances
  const debitAccounts = ['CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'EQUIPMENT', 'PREPAID_EXPENSES', 'OTHER_ASSETS', 'GOODWILL'];
  
  if (debitAccounts.includes(account)) {
    return debitTotal - creditTotal;
  } else {
    return creditTotal - debitTotal;
  }
};

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);