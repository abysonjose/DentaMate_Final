const mongoose = require('mongoose');

const payrollComponentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    maxlength: 200
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  isSystemGenerated: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const employeePayrollSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  payrollCycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollCycle',
    required: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  employeeCode: {
    type: String
  },
  department: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    required: true
  },
  joiningDate: {
    type: Date
  },
  
  // Salary Structure
  baseSalary: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Allowances
  allowances: [payrollComponentSchema],
  
  // Deductions
  deductions: [payrollComponentSchema],
  
  // Calculated Amounts
  grossSalary: {
    type: Number,
    default: 0
  },
  totalAllowances: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },
  
  // Attendance Data
  attendanceData: {
    workingDays: {
      type: Number,
      default: 0
    },
    presentDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    leaveDays: {
      type: Number,
      default: 0
    },
    overtimeHours: {
      type: Number,
      default: 0
    },
    lateHours: {
      type: Number,
      default: 0
    },
    lastSyncedAt: {
      type: Date
    }
  },
  
  // Status and Workflow
  status: {
    type: String,
    enum: ['pending', 'calculated', 'approved', 'rejected', 'paid'],
    default: 'pending',
    index: true
  },
  
  // Processing Information
  calculatedAt: {
    type: Date
  },
  calculatedBy: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: String
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  paidAt: {
    type: Date
  },
  
  // Payslip Information
  payslipGenerated: {
    type: Boolean,
    default: false
  },
  payslipGeneratedAt: {
    type: Date
  },
  payslipPath: {
    type: String
  },
  
  // Audit and Metadata
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String
  },
  
  // Processing Notes and Errors
  processingNotes: [{
    note: String,
    addedBy: String,
    addedAt: { type: Date, default: Date.now }
  }],
  
  processingErrors: [{
    error: String,
    severity: { type: String, enum: ['warning', 'error'] },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
employeePayrollSchema.index({ tenantId: 1, payrollCycleId: 1 });
employeePayrollSchema.index({ tenantId: 1, employeeId: 1, payrollCycleId: 1 }, { unique: true });
employeePayrollSchema.index({ tenantId: 1, status: 1 });
employeePayrollSchema.index({ tenantId: 1, department: 1 });

// Virtual for attendance percentage
employeePayrollSchema.virtual('attendancePercentage').get(function() {
  if (this.attendanceData.workingDays === 0) return 0;
  return Math.round((this.attendanceData.presentDays / this.attendanceData.workingDays) * 100);
});

// Pre-save middleware for calculations
employeePayrollSchema.pre('save', function(next) {
  // Calculate totals
  this.totalAllowances = this.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
  this.totalDeductions = this.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  
  // Calculate gross salary (base + allowances)
  this.grossSalary = this.baseSalary + this.totalAllowances;
  
  // Calculate net salary (gross - deductions)
  this.netSalary = this.grossSalary - this.totalDeductions;
  
  // Ensure net salary is not negative
  if (this.netSalary < 0) {
    this.netSalary = 0;
  }
  
  next();
});

// Static methods
employeePayrollSchema.statics.findByCycle = function(tenantId, payrollCycleId) {
  return this.find({ 
    tenantId, 
    payrollCycleId, 
    isDeleted: false 
  }).sort({ employeeName: 1 });
};

employeePayrollSchema.statics.findByEmployee = function(tenantId, employeeId) {
  return this.find({ 
    tenantId, 
    employeeId, 
    isDeleted: false 
  }).sort({ createdAt: -1 });
};

employeePayrollSchema.statics.findPendingApprovals = function(tenantId) {
  return this.find({
    tenantId,
    status: 'calculated',
    isDeleted: false
  }).sort({ calculatedAt: 1 });
};

// Instance methods
employeePayrollSchema.methods.addAllowance = function(type, amount, description = '', isRecurring = false) {
  this.allowances.push({
    type,
    amount,
    description,
    isRecurring,
    isSystemGenerated: false
  });
};

employeePayrollSchema.methods.addDeduction = function(type, amount, description = '', isRecurring = false) {
  this.deductions.push({
    type,
    amount,
    description,
    isRecurring,
    isSystemGenerated: false
  });
};

employeePayrollSchema.methods.removeComponent = function(componentId, componentType) {
  if (componentType === 'allowance') {
    this.allowances.id(componentId).remove();
  } else if (componentType === 'deduction') {
    this.deductions.id(componentId).remove();
  }
};

employeePayrollSchema.methods.addProcessingNote = function(note, addedBy) {
  this.processingNotes.push({
    note,
    addedBy,
    addedAt: new Date()
  });
};

employeePayrollSchema.methods.addProcessingError = function(error, severity = 'error') {
  this.processingErrors.push({
    error,
    severity,
    timestamp: new Date()
  });
};

employeePayrollSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = approvedBy;
  this.rejectedAt = undefined;
  this.rejectedBy = undefined;
  this.rejectionReason = undefined;
};

employeePayrollSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectedBy = rejectedBy;
  this.rejectionReason = reason;
  this.approvedAt = undefined;
  this.approvedBy = undefined;
};

employeePayrollSchema.methods.markAsPaid = function() {
  this.status = 'paid';
  this.paidAt = new Date();
};

module.exports = mongoose.model('EmployeePayroll', employeePayrollSchema);