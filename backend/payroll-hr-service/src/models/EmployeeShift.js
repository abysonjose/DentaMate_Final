const mongoose = require('mongoose');

const employeeShiftSchema = new mongoose.Schema({
  assignmentId: {
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
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  shiftId: {
    type: String,
    required: true,
    index: true
  },
  effectiveFrom: {
    type: Date,
    required: true,
    index: true
  },
  effectiveTo: {
    type: Date,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  workingDays: [{
    type: String,
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  }],
  specialInstructions: {
    type: String,
    maxlength: 500
  },
  assignedBy: {
    type: String,
    required: true
  },
  updatedBy: String,
  metadata: {
    reason: {
      type: String,
      enum: ['NEW_HIRE', 'SHIFT_CHANGE', 'DEPARTMENT_TRANSFER', 'TEMPORARY', 'PERMANENT'],
      default: 'PERMANENT'
    },
    isTemporary: {
      type: Boolean,
      default: false
    },
    originalShiftId: String
  }
}, {
  timestamps: true,
  collection: 'employee_shifts'
});

// Compound indexes
employeeShiftSchema.index({ tenantId: 1, branchId: 1, employeeId: 1, isActive: 1 });
employeeShiftSchema.index({ tenantId: 1, branchId: 1, shiftId: 1, isActive: 1 });
employeeShiftSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

// Prevent overlapping shift assignments for same employee
employeeShiftSchema.index({
  employeeId: 1,
  effectiveFrom: 1,
  effectiveTo: 1
}, {
  unique: true,
  partialFilterExpression: { isActive: true }
});

// Pre-save middleware to handle shift transitions
employeeShiftSchema.pre('save', function(next) {
  // If this is a new assignment and employee has existing active assignments
  if (this.isNew && this.isActive) {
    // We'll handle this in the service layer to avoid complex middleware
  }
  next();
});

// Instance method to check if assignment is currently active
employeeShiftSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.isActive && 
         this.effectiveFrom <= now && 
         (!this.effectiveTo || this.effectiveTo >= now);
};

// Instance method to deactivate assignment
employeeShiftSchema.methods.deactivate = function(userId, endDate) {
  this.isActive = false;
  this.effectiveTo = endDate || new Date();
  this.updatedBy = userId;
};

// Static method to find current shift for employee
employeeShiftSchema.statics.findCurrentShift = function(tenantId, branchId, employeeId) {
  const now = new Date();
  return this.findOne({
    tenantId,
    branchId,
    employeeId,
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveTo: { $exists: false } },
      { effectiveTo: null },
      { effectiveTo: { $gte: now } }
    ]
  }).populate('shiftId');
};

// Static method to find employees in a shift
employeeShiftSchema.statics.findEmployeesInShift = function(tenantId, branchId, shiftId, date) {
  const queryDate = date || new Date();
  return this.find({
    tenantId,
    branchId,
    shiftId,
    isActive: true,
    effectiveFrom: { $lte: queryDate },
    $or: [
      { effectiveTo: { $exists: false } },
      { effectiveTo: null },
      { effectiveTo: { $gte: queryDate } }
    ]
  });
};

// Static method to get shift distribution report
employeeShiftSchema.statics.getShiftDistribution = function(tenantId, branchId) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        branchId,
        isActive: true,
        effectiveFrom: { $lte: new Date() },
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: null },
          { effectiveTo: { $gte: new Date() } }
        ]
      }
    },
    {
      $lookup: {
        from: 'shifts',
        localField: 'shiftId',
        foreignField: 'shiftId',
        as: 'shift'
      }
    },
    {
      $unwind: '$shift'
    },
    {
      $group: {
        _id: {
          shiftId: '$shiftId',
          shiftName: '$shift.name',
          shiftType: '$shift.type'
        },
        employeeCount: { $sum: 1 },
        maxCapacity: { $first: '$shift.maxEmployees' },
        employees: {
          $push: {
            employeeId: '$employeeId',
            assignedDate: '$effectiveFrom',
            workingDays: '$workingDays'
          }
        }
      }
    },
    {
      $project: {
        shiftId: '$_id.shiftId',
        shiftName: '$_id.shiftName',
        shiftType: '$_id.shiftType',
        employeeCount: 1,
        maxCapacity: 1,
        utilizationPercentage: {
          $multiply: [
            { $divide: ['$employeeCount', '$maxCapacity'] },
            100
          ]
        },
        availableSlots: { $subtract: ['$maxCapacity', '$employeeCount'] },
        employees: 1,
        _id: 0
      }
    },
    {
      $sort: { utilizationPercentage: -1 }
    }
  ]);
};

// Static method to check for shift conflicts
employeeShiftSchema.statics.checkConflicts = function(employeeId, newShiftId, effectiveFrom, effectiveTo) {
  const query = {
    employeeId,
    isActive: true,
    $or: [
      {
        // New assignment starts during existing assignment
        effectiveFrom: { $lte: effectiveFrom },
        $or: [
          { effectiveTo: { $exists: false } },
          { effectiveTo: null },
          { effectiveTo: { $gte: effectiveFrom } }
        ]
      }
    ]
  };

  if (effectiveTo) {
    query.$or.push({
      // New assignment ends during existing assignment
      effectiveFrom: { $lte: effectiveTo },
      $or: [
        { effectiveTo: { $exists: false } },
        { effectiveTo: null },
        { effectiveTo: { $gte: effectiveTo } }
      ]
    });
  }

  return this.find(query);
};

module.exports = mongoose.model('EmployeeShift', employeeShiftSchema);