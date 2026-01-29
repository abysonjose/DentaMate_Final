const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  shiftId: {
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
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['MORNING', 'EVENING', 'NIGHT', 'FULL_DAY', 'CUSTOM']
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 24
  },
  breakDuration: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },
  workingDays: [{
    type: String,
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  maxEmployees: {
    type: Number,
    min: 1,
    default: 10
  },
  currentEmployees: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimeRules: {
    enabled: {
      type: Boolean,
      default: false
    },
    thresholdHours: {
      type: Number,
      default: 8
    },
    multiplier: {
      type: Number,
      default: 1.5,
      min: 1
    }
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'shifts'
});

// Compound indexes
shiftSchema.index({ tenantId: 1, branchId: 1, isActive: 1 });
shiftSchema.index({ tenantId: 1, branchId: 1, type: 1 });

// Pre-save middleware to calculate duration
shiftSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const start = this.startTime.split(':');
    const end = this.endTime.split(':');
    
    const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
    let endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    this.duration = (endMinutes - startMinutes) / 60;
  }
  next();
});

// Instance method to check for overlapping shifts
shiftSchema.methods.hasOverlap = function(otherShift) {
  const thisStart = this.startTime.split(':').map(Number);
  const thisEnd = this.endTime.split(':').map(Number);
  const otherStart = otherShift.startTime.split(':').map(Number);
  const otherEnd = otherShift.endTime.split(':').map(Number);
  
  const thisStartMinutes = thisStart[0] * 60 + thisStart[1];
  let thisEndMinutes = thisEnd[0] * 60 + thisEnd[1];
  const otherStartMinutes = otherStart[0] * 60 + otherStart[1];
  let otherEndMinutes = otherEnd[0] * 60 + otherEnd[1];
  
  // Handle overnight shifts
  if (thisEndMinutes <= thisStartMinutes) thisEndMinutes += 24 * 60;
  if (otherEndMinutes <= otherStartMinutes) otherEndMinutes += 24 * 60;
  
  return (thisStartMinutes < otherEndMinutes && thisEndMinutes > otherStartMinutes);
};

// Instance method to check if shift can accommodate more employees
shiftSchema.methods.canAddEmployee = function() {
  return this.currentEmployees < this.maxEmployees;
};

// Static method to find available shifts for a branch
shiftSchema.statics.findAvailableShifts = function(tenantId, branchId, day) {
  return this.find({
    tenantId,
    branchId,
    isActive: true,
    workingDays: day,
    $expr: { $lt: ['$currentEmployees', '$maxEmployees'] }
  });
};

// Static method to get shift coverage report
shiftSchema.statics.getCoverageReport = function(tenantId, branchId) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        branchId,
        isActive: true
      }
    },
    {
      $project: {
        name: 1,
        type: 1,
        startTime: 1,
        endTime: 1,
        maxEmployees: 1,
        currentEmployees: 1,
        coveragePercentage: {
          $multiply: [
            { $divide: ['$currentEmployees', '$maxEmployees'] },
            100
          ]
        },
        availableSlots: { $subtract: ['$maxEmployees', '$currentEmployees'] },
        isUnderStaffed: { $lt: ['$currentEmployees', { $multiply: ['$maxEmployees', 0.8] }] }
      }
    },
    {
      $sort: { startTime: 1 }
    }
  ]);
};

module.exports = mongoose.model('Shift', shiftSchema);