const mongoose = require('mongoose');

const financialPeriodSchema = new mongoose.Schema({
  periodId: {
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
    index: true,
    validate: {
      validator: function(value) {
        return /^\d{4}-\d{4}$/.test(value);
      },
      message: 'Financial year must be in YYYY-YYYY format'
    }
  },
  periodType: {
    type: String,
    required: true,
    enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
    default: 'MONTHLY'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'LOCKED'],
    default: 'OPEN',
    index: true
  },
  closedDate: {
    type: Date
  },
  closedBy: {
    userId: String,
    userName: String
  },
  lockReason: {
    type: String,
    maxlength: 500
  },
  summary: {
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    totalExpenses: {
      type: Number,
      default: 0,
      min: 0
    },
    netIncome: {
      type: Number,
      default: 0
    },
    totalLedgerEntries: {
      type: Number,
      default: 0,
      min: 0
    },
    lastCalculated: {
      type: Date
    }
  },
  reconciliation: {
    isReconciled: {
      type: Boolean,
      default: false
    },
    reconciledDate: {
      type: Date
    },
    reconciledBy: {
      userId: String,
      userName: String
    },
    discrepancies: [{
      type: {
        type: String,
        enum: ['REVENUE_MISMATCH', 'EXPENSE_MISMATCH', 'LEDGER_IMBALANCE', 'OTHER']
      },
      description: String,
      amount: Number,
      resolved: {
        type: Boolean,
        default: false
      },
      resolvedDate: Date,
      resolvedBy: String
    }]
  },
  taxSummary: {
    taxableRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    deductibleExpenses: {
      type: Number,
      default: 0,
      min: 0
    },
    taxLiability: {
      type: Number,
      default: 0,
      min: 0
    },
    taxPaid: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  reports: [{
    reportType: {
      type: String,
      enum: ['TRIAL_BALANCE', 'INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW', 'TAX_SUMMARY'],
      required: true
    },
    generatedDate: {
      type: Date,
      default: Date.now
    },
    generatedBy: {
      userId: String,
      userName: String
    },
    filePath: String,
    fileSize: Number
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
      enum: ['CREATED', 'OPENED', 'CLOSED', 'LOCKED', 'UNLOCKED', 'RECONCILED', 'SUMMARY_UPDATED'],
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
  collection: 'financial_periods'
});

// Compound indexes
financialPeriodSchema.index({ tenantId: 1, branchId: 1, period: 1 }, { unique: true });
financialPeriodSchema.index({ tenantId: 1, branchId: 1, financialYear: 1 });
financialPeriodSchema.index({ tenantId: 1, branchId: 1, status: 1 });
financialPeriodSchema.index({ tenantId: 1, branchId: 1, startDate: 1, endDate: 1 });

// Pre-save middleware
financialPeriodSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate periodId if not provided
    if (!this.periodId) {
      this.periodId = `FP_${this.tenantId}_${this.branchId}_${this.period}`;
    }
    
    // Add creation audit log
    this.auditLog.push({
      action: 'CREATED',
      userId: this.createdBy,
      timestamp: new Date(),
      details: {
        period: this.period,
        periodType: this.periodType,
        startDate: this.startDate,
        endDate: this.endDate
      }
    });
  }
  
  this.updatedAt = new Date();
  next();
});

// Instance methods
financialPeriodSchema.methods.close = function(userId, userName) {
  if (this.status === 'CLOSED' || this.status === 'LOCKED') {
    throw new Error('Period is already closed or locked');
  }
  
  this.status = 'CLOSED';
  this.closedDate = new Date();
  this.closedBy = { userId, userName };
  
  this.auditLog.push({
    action: 'CLOSED',
    userId,
    timestamp: new Date(),
    details: { closedDate: this.closedDate }
  });
  
  return this.save();
};

financialPeriodSchema.methods.lock = function(userId, reason) {
  if (this.status !== 'CLOSED') {
    throw new Error('Period must be closed before locking');
  }
  
  this.status = 'LOCKED';
  this.lockReason = reason;
  
  this.auditLog.push({
    action: 'LOCKED',
    userId,
    timestamp: new Date(),
    details: { reason }
  });
  
  return this.save();
};

financialPeriodSchema.methods.unlock = function(userId, reason) {
  if (this.status !== 'LOCKED') {
    throw new Error('Period is not locked');
  }
  
  this.status = 'CLOSED';
  
  this.auditLog.push({
    action: 'UNLOCKED',
    userId,
    timestamp: new Date(),
    details: { reason }
  });
  
  return this.save();
};

financialPeriodSchema.methods.updateSummary = async function(userId) {
  const LedgerEntry = require('./LedgerEntry');
  const Revenue = require('./Revenue');
  const Expense = require('./Expense');
  
  try {
    // Calculate total revenue
    const revenueResult = await Revenue.aggregate([
      {
        $match: {
          tenantId: this.tenantId,
          branchId: this.branchId,
          period: this.period,
          isRefunded: false
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);
    
    // Calculate total expenses
    const expenseResult = await Expense.aggregate([
      {
        $match: {
          tenantId: this.tenantId,
          branchId: this.branchId,
          period: this.period,
          approvalStatus: 'APPROVED'
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' }
        }
      }
    ]);
    
    // Count ledger entries
    const ledgerCount = await LedgerEntry.countDocuments({
      tenantId: this.tenantId,
      branchId: this.branchId,
      period: this.period,
      isPosted: true,
      isReversed: false
    });
    
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    const totalExpenses = expenseResult[0]?.totalExpenses || 0;
    
    this.summary = {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      totalLedgerEntries: ledgerCount,
      lastCalculated: new Date()
    };
    
    this.auditLog.push({
      action: 'SUMMARY_UPDATED',
      userId,
      timestamp: new Date(),
      details: this.summary
    });
    
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to update period summary: ${error.message}`);
  }
};

financialPeriodSchema.methods.reconcile = function(userId, userName, discrepancies = []) {
  this.reconciliation.isReconciled = true;
  this.reconciliation.reconciledDate = new Date();
  this.reconciliation.reconciledBy = { userId, userName };
  this.reconciliation.discrepancies = discrepancies;
  
  this.auditLog.push({
    action: 'RECONCILED',
    userId,
    timestamp: new Date(),
    details: {
      discrepanciesCount: discrepancies.length,
      hasDiscrepancies: discrepancies.length > 0
    }
  });
  
  return this.save();
};

// Static methods
financialPeriodSchema.statics.createPeriod = async function(tenantId, branchId, period, periodType, userId) {
  const [year, month] = period.split('-').map(Number);
  
  let startDate, endDate;
  
  if (periodType === 'MONTHLY') {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0); // Last day of month
  } else if (periodType === 'QUARTERLY') {
    const quarterMonth = Math.floor((month - 1) / 3) * 3 + 1;
    startDate = new Date(year, quarterMonth - 1, 1);
    endDate = new Date(year, quarterMonth + 2, 0);
  } else if (periodType === 'YEARLY') {
    const fyStartMonth = parseInt(process.env.FINANCIAL_YEAR_START_MONTH) || 4;
    startDate = new Date(year, fyStartMonth - 1, 1);
    endDate = new Date(year + 1, fyStartMonth - 1, 0);
  }
  
  // Determine financial year
  const fyStartMonth = parseInt(process.env.FINANCIAL_YEAR_START_MONTH) || 4;
  let financialYear;
  
  if (month >= fyStartMonth) {
    financialYear = `${year}-${year + 1}`;
  } else {
    financialYear = `${year - 1}-${year}`;
  }
  
  const financialPeriod = new this({
    tenantId,
    branchId,
    period,
    financialYear,
    periodType,
    startDate,
    endDate,
    createdBy: userId
  });
  
  return await financialPeriod.save();
};

financialPeriodSchema.statics.getOpenPeriods = async function(tenantId, branchId) {
  return await this.find({
    tenantId,
    branchId,
    status: 'OPEN'
  }).sort({ startDate: 1 });
};

financialPeriodSchema.statics.getCurrentPeriod = async function(tenantId, branchId) {
  const now = new Date();
  return await this.findOne({
    tenantId,
    branchId,
    startDate: { $lte: now },
    endDate: { $gte: now }
  });
};

financialPeriodSchema.statics.canPostToLedger = async function(tenantId, branchId, period) {
  const financialPeriod = await this.findOne({
    tenantId,
    branchId,
    period
  });
  
  return financialPeriod && financialPeriod.status === 'OPEN';
};

module.exports = mongoose.model('FinancialPeriod', financialPeriodSchema);