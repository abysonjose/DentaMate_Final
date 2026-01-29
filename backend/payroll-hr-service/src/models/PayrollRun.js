const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema({
  payrollId: {
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
  month: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/,
    index: true
  },
  year: {
    type: Number,
    required: true
  },
  monthNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  status: {
    type: String,
    required: true,
    enum: ['DRAFT', 'CALCULATED', 'FINALIZED', 'CANCELLED'],
    default: 'DRAFT'
  },
  totalEmployees: {
    type: Number,
    required: true,
    min: 0
  },
  totalGrossPay: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalDeductions: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalNetPay: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  payrollEntries: [{
    employeeId: {
      type: String,
      required: true
    },
    employeeName: {
      type: String,
      required: true
    },
    department: String,
    designation: String,
    basicSalary: {
      type: Number,
      required: true,
      min: 0
    },
    allowances: {
      hra: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      special: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 }
    },
    deductions: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      advance: { type: Number, default: 0 },
      lop: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    attendance: {
      totalDays: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      leaveDays: { type: Number, default: 0 },
      halfDays: { type: Number, default: 0 },
      workingHours: { type: Number, default: 0 },
      overtimeHours: { type: Number, default: 0 }
    },
    grossPay: {
      type: Number,
      required: true,
      min: 0
    },
    totalDeductions: {
      type: Number,
      required: true,
      min: 0
    },
    netPay: {
      type: Number,
      required: true,
      min: 0
    },
    payslipGenerated: {
      type: Boolean,
      default: false
    },
    payslipPath: String
  }],
  calculationDetails: {
    startDate: Date,
    endDate: Date,
    workingDays: Number,
    calculatedAt: Date,
    calculatedBy: String
  },
  finalizationDetails: {
    finalizedAt: Date,
    finalizedBy: String,
    remarks: String
  },
  auditLog: [{
    action: {
      type: String,
      enum: ['CREATED', 'CALCULATED', 'RECALCULATED', 'FINALIZED', 'CANCELLED'],
      required: true
    },
    performedBy: {
      type: String,
      required: true
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    remarks: String,
    changes: mongoose.Schema.Types.Mixed
  }],
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: String
}, {
  timestamps: true,
  collection: 'payroll_runs'
});

// Compound indexes
payrollRunSchema.index({ tenantId: 1, branchId: 1, month: -1 });
payrollRunSchema.index({ tenantId: 1, month: -1, status: 1 });
payrollRunSchema.index({ 'payrollEntries.employeeId': 1, month: -1 });

// Unique constraint for tenant-branch-month combination
payrollRunSchema.index({ 
  tenantId: 1, 
  branchId: 1, 
  month: 1 
}, { 
  unique: true 
});

// Pre-save middleware to calculate totals
payrollRunSchema.pre('save', function(next) {
  if (this.payrollEntries && this.payrollEntries.length > 0) {
    this.totalEmployees = this.payrollEntries.length;
    this.totalGrossPay = this.payrollEntries.reduce((sum, entry) => sum + entry.grossPay, 0);
    this.totalDeductions = this.payrollEntries.reduce((sum, entry) => sum + entry.totalDeductions, 0);
    this.totalNetPay = this.payrollEntries.reduce((sum, entry) => sum + entry.netPay, 0);
  }
  
  // Extract year and month number from month string
  if (this.month) {
    const [year, monthStr] = this.month.split('-');
    this.year = parseInt(year);
    this.monthNumber = parseInt(monthStr);
  }
  
  next();
});

// Instance method to check if payroll can be modified
payrollRunSchema.methods.canModify = function() {
  return this.status === 'DRAFT' || this.status === 'CALCULATED';
};

// Instance method to finalize payroll
payrollRunSchema.methods.finalize = function(userId, remarks) {
  if (this.status !== 'CALCULATED') {
    throw new Error('Payroll must be calculated before finalization');
  }
  
  this.status = 'FINALIZED';
  this.finalizationDetails = {
    finalizedAt: new Date(),
    finalizedBy: userId,
    remarks: remarks || ''
  };
  
  this.auditLog.push({
    action: 'FINALIZED',
    performedBy: userId,
    remarks: remarks || 'Payroll finalized'
  });
};

// Instance method to add audit log entry
payrollRunSchema.methods.addAuditLog = function(action, userId, remarks, changes) {
  this.auditLog.push({
    action,
    performedBy: userId,
    remarks,
    changes
  });
};

// Static method to get payroll summary for accounting
payrollRunSchema.statics.getAccountingSummary = function(tenantId, month) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        month,
        status: 'FINALIZED'
      }
    },
    {
      $group: {
        _id: '$tenantId',
        totalBranches: { $sum: 1 },
        totalEmployees: { $sum: '$totalEmployees' },
        totalGrossPay: { $sum: '$totalGrossPay' },
        totalDeductions: { $sum: '$totalDeductions' },
        totalNetPay: { $sum: '$totalNetPay' },
        branchSummaries: {
          $push: {
            branchId: '$branchId',
            employees: '$totalEmployees',
            grossPay: '$totalGrossPay',
            deductions: '$totalDeductions',
            netPay: '$totalNetPay'
          }
        }
      }
    }
  ]);
};

// Static method to get department-wise salary cost
payrollRunSchema.statics.getDepartmentWiseCost = function(tenantId, branchId, month) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        branchId,
        month,
        status: 'FINALIZED'
      }
    },
    {
      $unwind: '$payrollEntries'
    },
    {
      $group: {
        _id: '$payrollEntries.department',
        employeeCount: { $sum: 1 },
        totalGrossPay: { $sum: '$payrollEntries.grossPay' },
        totalDeductions: { $sum: '$payrollEntries.totalDeductions' },
        totalNetPay: { $sum: '$payrollEntries.netPay' },
        avgSalary: { $avg: '$payrollEntries.netPay' }
      }
    },
    {
      $sort: { totalNetPay: -1 }
    }
  ]);
};

module.exports = mongoose.model('PayrollRun', payrollRunSchema);