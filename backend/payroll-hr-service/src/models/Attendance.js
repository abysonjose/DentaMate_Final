const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  attendanceId: {
    type: String,
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: true,
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
  date: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY'],
    default: 'PRESENT'
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  shiftId: {
    type: String,
    index: true
  },
  workingHours: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  leaveType: {
    type: String,
    enum: ['PAID', 'UNPAID', 'EMERGENCY', 'SICK', 'CASUAL'],
    required: function() {
      return this.status === 'LEAVE';
    }
  },
  remarks: {
    type: String,
    maxlength: 500
  },
  recordedBy: {
    type: String,
    required: true
  },
  recordedAt: {
    type: Date,
    default: Date.now
  },
  isPayrollFinalized: {
    type: Boolean,
    default: false,
    index: true
  },
  payrollMonth: {
    type: String,
    index: true
  },
  metadata: {
    source: {
      type: String,
      enum: ['MANUAL', 'QR', 'RFID', 'DEVICE'],
      default: 'MANUAL'
    },
    deviceId: String,
    location: {
      latitude: Number,
      longitude: Number
    }
  }
}, {
  timestamps: true,
  collection: 'attendances'
});

// Compound indexes for efficient queries
attendanceSchema.index({ tenantId: 1, branchId: 1, date: -1 });
attendanceSchema.index({ employeeId: 1, date: -1 });
attendanceSchema.index({ tenantId: 1, payrollMonth: 1, isPayrollFinalized: 1 });

// Prevent duplicate attendance records for same employee on same date
attendanceSchema.index({ 
  employeeId: 1, 
  date: 1 
}, { 
  unique: true,
  partialFilterExpression: { date: { $exists: true } }
});

// Pre-save middleware to set payroll month
attendanceSchema.pre('save', function(next) {
  if (this.date) {
    const date = new Date(this.date);
    this.payrollMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  next();
});

// Instance method to check if attendance can be modified
attendanceSchema.methods.canModify = function() {
  return !this.isPayrollFinalized;
};

// Static method to get attendance summary for payroll
attendanceSchema.statics.getPayrollSummary = function(tenantId, branchId, employeeId, month) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        branchId,
        employeeId,
        payrollMonth: month
      }
    },
    {
      $group: {
        _id: '$employeeId',
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0]
          }
        },
        absentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0]
          }
        },
        leaveDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'LEAVE'] }, 1, 0]
          }
        },
        halfDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'HALF_DAY'] }, 1, 0]
          }
        },
        totalWorkingHours: { $sum: '$workingHours' },
        totalOvertimeHours: { $sum: '$overtimeHours' },
        paidLeaveDays: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$status', 'LEAVE'] },
                  { $eq: ['$leaveType', 'PAID'] }
                ]
              }, 
              1, 
              0
            ]
          }
        },
        unpaidLeaveDays: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$status', 'LEAVE'] },
                  { $eq: ['$leaveType', 'UNPAID'] }
                ]
              }, 
              1, 
              0
            ]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Attendance', attendanceSchema);