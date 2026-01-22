const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const branchSchema = new mongoose.Schema({
  branchId: {
    type: String,
    required: true,
    unique: true,
    default: () => `branch_${uuidv4()}`
  },
  tenantId: {
    type: String,
    required: true,
    ref: 'Tenant'
  },
  branchName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  branchCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 10
  },
  status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'MAINTENANCE'],
    default: 'ACTIVE'
  },
  branchType: {
    type: String,
    enum: ['MAIN', 'BRANCH', 'CLINIC', 'SATELLITE'],
    default: 'BRANCH'
  },
  address: {
    street: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'India' },
    zipCode: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]{10,15}$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    website: { type: String, trim: true },
    emergencyContact: { type: String, trim: true }
  },
  operationalInfo: {
    timezone: { type: String, default: 'Asia/Kolkata' },
    workingHours: {
      monday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String, default: '13:00' },
        breakEnd: { type: String, default: '14:00' }
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String, default: '13:00' },
        breakEnd: { type: String, default: '14:00' }
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String, default: '13:00' },
        breakEnd: { type: String, default: '14:00' }
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String, default: '13:00' },
        breakEnd: { type: String, default: '14:00' }
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' },
        breakStart: { type: String, default: '13:00' },
        breakEnd: { type: String, default: '14:00' }
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '17:00' },
        breakStart: { type: String, default: '13:00' },
        breakEnd: { type: String, default: '14:00' }
      },
      sunday: {
        isOpen: { type: Boolean, default: false },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '16:00' }
      }
    },
    holidays: [{
      date: { type: Date, required: true },
      name: { type: String, required: true },
      type: { type: String, enum: ['NATIONAL', 'REGIONAL', 'BRANCH'], default: 'BRANCH' }
    }]
  },
  departments: [{
    departmentId: { type: String, default: () => `dept_${uuidv4()}` },
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    rooms: [{
      roomId: { type: String, default: () => `room_${uuidv4()}` },
      roomNumber: { type: String, required: true },
      roomName: { type: String },
      roomType: { 
        type: String, 
        enum: ['CONSULTATION', 'TREATMENT', 'SURGERY', 'XRAY', 'LAB', 'WAITING'],
        default: 'CONSULTATION'
      },
      capacity: { type: Number, default: 1 },
      equipment: [{ type: String }],
      isActive: { type: Boolean, default: true }
    }]
  }],
  branchAdmin: {
    userId: { type: String },
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    assignedAt: { type: Date }
  },
  configuration: {
    enabledServices: [{
      type: String,
      enum: [
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'BILLING', 
        'INVENTORY', 'LAB_SERVICES', 'PHARMACY'
      ]
    }],
    appointmentSlotDuration: { type: Number, default: 30 }, // minutes
    maxDailyAppointments: { type: Number, default: 50 },
    enableWalkIns: { type: Boolean, default: true },
    autoConfirmAppointments: { type: Boolean, default: false }
  },
  auditInfo: {
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedBy: { type: String },
    updatedAt: { type: Date },
    activatedAt: { type: Date },
    suspendedAt: { type: Date },
    suspensionReason: { type: String }
  }
}, {
  timestamps: true,
  collection: 'branches'
});

// Indexes
branchSchema.index({ branchId: 1 }, { unique: true });
branchSchema.index({ tenantId: 1 });
branchSchema.index({ tenantId: 1, branchCode: 1 }, { unique: true });
branchSchema.index({ status: 1 });
branchSchema.index({ 'address.city': 1 });
branchSchema.index({ createdAt: -1 });

// Virtual for active status
branchSchema.virtual('isActive').get(function() {
  return this.status === 'ACTIVE';
});

// Virtual for full address
branchSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.area ? addr.area + ', ' : ''}${addr.city}, ${addr.state} ${addr.zipCode}`;
});

// Pre-save middleware
branchSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.auditInfo.updatedAt = new Date();
  }
  next();
});

// Methods
branchSchema.methods.activate = function(activatedBy) {
  this.status = 'ACTIVE';
  this.auditInfo.activatedAt = new Date();
  this.auditInfo.updatedBy = activatedBy;
  return this.save();
};

branchSchema.methods.suspend = function(suspendedBy, reason) {
  this.status = 'SUSPENDED';
  this.auditInfo.suspendedAt = new Date();
  this.auditInfo.suspensionReason = reason;
  this.auditInfo.updatedBy = suspendedBy;
  return this.save();
};

branchSchema.methods.addDepartment = function(departmentData) {
  this.departments.push(departmentData);
  return this.save();
};

branchSchema.methods.addRoom = function(departmentId, roomData) {
  const department = this.departments.id(departmentId);
  if (department) {
    department.rooms.push(roomData);
    return this.save();
  }
  throw new Error('Department not found');
};

branchSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Branch', branchSchema);