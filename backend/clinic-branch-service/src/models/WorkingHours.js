const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const workingHoursSchema = new mongoose.Schema({
  workingHoursId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  branchId: {
    type: String,
    required: true,
    index: true
  },
  departmentId: {
    type: String,
    index: true // Optional - branch level if null
  },
  dayOfWeek: {
    type: String,
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
    required: true
  },
  openTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  closeTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  breakTimes: [{
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
    description: {
      type: String,
      trim: true,
      maxlength: 100
    }
  }],
  isHoliday: {
    type: Boolean,
    default: false
  },
  holidayName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  effectiveDate: {
    type: Date // For holiday overrides or specific date rules
  },
  isRecurring: {
    type: Boolean,
    default: true // true for weekly recurring, false for one-time override
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date // Optional end date for temporary schedules
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
workingHoursSchema.index({ branchId: 1, dayOfWeek: 1, deletedAt: 1 });
workingHoursSchema.index({ branchId: 1, departmentId: 1, dayOfWeek: 1, deletedAt: 1 });
workingHoursSchema.index({ workingHoursId: 1 }, { unique: true });
workingHoursSchema.index({ effectiveDate: 1 });
workingHoursSchema.index({ validFrom: 1, validUntil: 1 });
workingHoursSchema.index({ isHoliday: 1, effectiveDate: 1 });
workingHoursSchema.index({ deletedAt: 1 });

// Pre-save middleware
workingHoursSchema.pre('save', function(next) {
  if (this.isNew) {
    this.workingHoursId = this.workingHoursId || uuidv4();
  }
  
  // Validate time format and logic
  if (this.openTime >= this.closeTime) {
    return next(new Error('Close time must be after open time'));
  }
  
  // Validate break times
  for (const breakTime of this.breakTimes) {
    if (breakTime.startTime >= breakTime.endTime) {
      return next(new Error('Break end time must be after start time'));
    }
    if (breakTime.startTime < this.openTime || breakTime.endTime > this.closeTime) {
      return next(new Error('Break times must be within working hours'));
    }
  }
  
  next();
});

// Instance methods
workingHoursSchema.methods.toPublicJSON = function() {
  const workingHours = this.toObject();
  delete workingHours._id;
  delete workingHours.__v;
  return workingHours;
};

workingHoursSchema.methods.isActiveOn = function(date) {
  if (this.deletedAt) return false;
  
  const targetDate = new Date(date);
  
  // Check if it's within valid date range
  if (this.validFrom && targetDate < this.validFrom) {
    return false;
  }
  
  if (this.validUntil && targetDate > this.validUntil) {
    return false;
  }
  
  // For specific date overrides
  if (this.effectiveDate && !this.isRecurring) {
    const effectiveDate = new Date(this.effectiveDate);
    return targetDate.toDateString() === effectiveDate.toDateString();
  }
  
  // For recurring weekly schedules
  if (this.isRecurring) {
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const targetDay = dayNames[targetDate.getDay()];
    return targetDay === this.dayOfWeek;
  }
  
  return false;
};

workingHoursSchema.methods.isOpenAt = function(time, date = new Date()) {
  if (!this.isActiveOn(date) || this.isHoliday) {
    return false;
  }
  
  // Check if time is within working hours
  if (time < this.openTime || time > this.closeTime) {
    return false;
  }
  
  // Check if time is during break
  for (const breakTime of this.breakTimes) {
    if (time >= breakTime.startTime && time <= breakTime.endTime) {
      return false;
    }
  }
  
  return true;
};

workingHoursSchema.methods.getAvailableSlots = function(slotDuration = 30, date = new Date()) {
  if (!this.isActiveOn(date) || this.isHoliday) {
    return [];
  }
  
  const slots = [];
  const [openHour, openMin] = this.openTime.split(':').map(Number);
  const [closeHour, closeMin] = this.closeTime.split(':').map(Number);
  
  let currentTime = openHour * 60 + openMin; // Convert to minutes
  const endTime = closeHour * 60 + closeMin;
  
  while (currentTime + slotDuration <= endTime) {
    const slotStart = this.minutesToTimeString(currentTime);
    const slotEnd = this.minutesToTimeString(currentTime + slotDuration);
    
    // Check if slot conflicts with break times
    let isAvailable = true;
    for (const breakTime of this.breakTimes) {
      const [breakStartHour, breakStartMin] = breakTime.startTime.split(':').map(Number);
      const [breakEndHour, breakEndMin] = breakTime.endTime.split(':').map(Number);
      const breakStart = breakStartHour * 60 + breakStartMin;
      const breakEnd = breakEndHour * 60 + breakEndMin;
      
      if (currentTime < breakEnd && currentTime + slotDuration > breakStart) {
        isAvailable = false;
        break;
      }
    }
    
    if (isAvailable) {
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        duration: slotDuration
      });
    }
    
    currentTime += slotDuration;
  }
  
  return slots;
};

workingHoursSchema.methods.minutesToTimeString = function(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

workingHoursSchema.methods.addBreak = function(startTime, endTime, description = '') {
  this.breakTimes.push({ startTime, endTime, description });
  return this.save();
};

workingHoursSchema.methods.removeBreak = function(startTime) {
  this.breakTimes = this.breakTimes.filter(b => b.startTime !== startTime);
  return this.save();
};

// Static methods
workingHoursSchema.statics.findByBranch = function(branchId, options = {}) {
  const query = { branchId, deletedAt: null };
  
  if (options.departmentId) {
    query.departmentId = options.departmentId;
  }
  
  if (options.dayOfWeek) {
    query.dayOfWeek = options.dayOfWeek;
  }
  
  if (options.date) {
    const targetDate = new Date(options.date);
    query.$or = [
      { isRecurring: true },
      { 
        isRecurring: false,
        effectiveDate: {
          $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          $lt: new Date(targetDate.setHours(23, 59, 59, 999))
        }
      }
    ];
  }
  
  return this.find(query).sort({ dayOfWeek: 1, openTime: 1 });
};

workingHoursSchema.statics.findByDepartment = function(departmentId, branchId, options = {}) {
  const query = { departmentId, branchId, deletedAt: null };
  
  if (options.dayOfWeek) {
    query.dayOfWeek = options.dayOfWeek;
  }
  
  return this.find(query).sort({ dayOfWeek: 1, openTime: 1 });
};

workingHoursSchema.statics.findForDate = function(branchId, date, departmentId = null) {
  const targetDate = new Date(date);
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayOfWeek = dayNames[targetDate.getDay()];
  
  const query = {
    branchId,
    deletedAt: null,
    $or: [
      // Regular weekly schedule
      {
        dayOfWeek,
        isRecurring: true,
        $or: [
          { validFrom: { $lte: targetDate } },
          { validFrom: { $exists: false } }
        ],
        $or: [
          { validUntil: { $gte: targetDate } },
          { validUntil: { $exists: false } }
        ]
      },
      // Specific date override
      {
        isRecurring: false,
        effectiveDate: {
          $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          $lt: new Date(targetDate.setHours(23, 59, 59, 999))
        }
      }
    ]
  };
  
  if (departmentId) {
    query.departmentId = departmentId;
  }
  
  return this.find(query).sort({ isRecurring: 1, openTime: 1 }); // Overrides first
};

workingHoursSchema.statics.findHolidays = function(branchId, startDate, endDate, departmentId = null) {
  const query = {
    branchId,
    isHoliday: true,
    deletedAt: null,
    effectiveDate: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (departmentId) {
    query.departmentId = departmentId;
  }
  
  return this.find(query).sort({ effectiveDate: 1 });
};

module.exports = mongoose.model('WorkingHours', workingHoursSchema);