const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const staffSchema = new mongoose.Schema({
  staffId: {
    type: String,
    required: true,
    unique: true,
    default: () => `staff_${uuidv4()}`
  },
  userAuthId: {
    type: String,
    required: true,
    unique: true,
    ref: 'User' // Reference to auth-identity-service User model
  },
  tenantId: {
    type: String,
    required: true,
    ref: 'Tenant'
  },
  clinicId: {
    type: String,
    required: true
  },
  branchId: {
    type: String,
    required: true,
    ref: 'Branch'
  },
  departmentId: {
    type: String,
    default: null
  },
  staffCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[+]?[\d\s\-\(\)]{10,15}$/, 'Please enter a valid phone number']
    },
    alternatePhone: {
      type: String,
      trim: true,
      match: [/^[+]?[\d\s\-\(\)]{10,15}$/, 'Please enter a valid phone number']
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']
    },
    profilePicture: {
      type: String // URL to profile picture
    }
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    area: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'India'
    },
    zipCode: {
      type: String,
      trim: true
    }
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  employmentInfo: {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    employmentType: {
      type: String,
      required: true,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'],
      default: 'FULL_TIME'
    },
    employmentStatus: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED', 'RESIGNED'],
      default: 'ACTIVE'
    },
    dateOfJoining: {
      type: Date,
      required: true,
      default: Date.now
    },
    dateOfLeaving: {
      type: Date
    },
    probationEndDate: {
      type: Date
    },
    workingHours: {
      monday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      thursday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      friday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      saturday: { start: String, end: String, isWorking: { type: Boolean, default: false } },
      sunday: { start: String, end: String, isWorking: { type: Boolean, default: false } }
    },
    salary: {
      basic: { type: Number, min: 0 },
      allowances: { type: Number, min: 0, default: 0 },
      currency: { type: String, default: 'INR' }
    }
  },
  roles: [{
    roleId: {
      type: String,
      required: true,
      ref: 'StaffRole'
    },
    roleName: {
      type: String,
      required: true
    },
    assignedBy: {
      type: String,
      required: true
    },
    assignedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  professionalInfo: {
    specialization: [{
      type: String,
      trim: true
    }],
    qualifications: [{
      degree: { type: String, trim: true },
      institution: { type: String, trim: true },
      year: { type: Number },
      certificateUrl: { type: String }
    }],
    experience: {
      totalYears: { type: Number, min: 0, default: 0 },
      previousWorkplaces: [{
        organization: String,
        position: String,
        duration: String,
        responsibilities: String
      }]
    },
    licenses: [{
      type: { type: String, trim: true },
      number: { type: String, trim: true },
      issuedBy: { type: String, trim: true },
      issuedDate: Date,
      expiryDate: Date,
      documentUrl: String
    }]
  },
  documents: [{
    type: {
      type: String,
      required: true,
      enum: ['RESUME', 'ID_PROOF', 'ADDRESS_PROOF', 'QUALIFICATION', 'EXPERIENCE', 'LICENSE', 'OTHER']
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
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
  performance: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    lastReviewDate: Date,
    nextReviewDate: Date,
    reviewComments: String,
    achievements: [String],
    improvements: [String]
  },
  systemInfo: {
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },
    isFirstLogin: { type: Boolean, default: true },
    passwordChangeRequired: { type: Boolean, default: true },
    accountLocked: { type: Boolean, default: false },
    lockReason: String,
    lockedAt: Date,
    lockedBy: String
  },
  auditInfo: {
    createdBy: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    updatedBy: String,
    updatedAt: Date,
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  collection: 'staff_profiles'
});

// Indexes
staffSchema.index({ staffId: 1 });
staffSchema.index({ userAuthId: 1 });
staffSchema.index({ tenantId: 1, branchId: 1 });
staffSchema.index({ 'employmentInfo.employeeId': 1 });
staffSchema.index({ staffCode: 1 });
staffSchema.index({ 'personalInfo.email': 1 });
staffSchema.index({ 'employmentInfo.employmentStatus': 1 });
staffSchema.index({ 'roles.roleId': 1 });
staffSchema.index({ 'roles.roleName': 1 });

// Compound indexes
staffSchema.index({ tenantId: 1, 'employmentInfo.employmentStatus': 1 });
staffSchema.index({ branchId: 1, 'roles.roleName': 1 });

// Virtual fields
staffSchema.virtual('fullName').get(function() {
  const { firstName, middleName, lastName } = this.personalInfo;
  return middleName 
    ? `${firstName} ${middleName} ${lastName}`
    : `${firstName} ${lastName}`;
});

staffSchema.virtual('activeRoles').get(function() {
  return this.roles.filter(role => role.isActive);
});

staffSchema.virtual('isActive').get(function() {
  return this.employmentInfo.employmentStatus === 'ACTIVE';
});

staffSchema.virtual('age').get(function() {
  if (!this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Instance methods
staffSchema.methods.hasRole = function(roleName) {
  return this.activeRoles.some(role => role.roleName === roleName.toUpperCase());
};

staffSchema.methods.hasAnyRole = function(roleNames) {
  const upperRoleNames = roleNames.map(name => name.toUpperCase());
  return this.activeRoles.some(role => upperRoleNames.includes(role.roleName));
};

staffSchema.methods.assignRole = function(roleId, roleName, assignedBy) {
  // Check if role already exists
  const existingRole = this.roles.find(role => role.roleId === roleId);
  if (existingRole) {
    existingRole.isActive = true;
    existingRole.assignedBy = assignedBy;
    existingRole.assignedAt = new Date();
  } else {
    this.roles.push({
      roleId,
      roleName: roleName.toUpperCase(),
      assignedBy,
      assignedAt: new Date(),
      isActive: true
    });
  }
};

staffSchema.methods.removeRole = function(roleId) {
  const role = this.roles.find(role => role.roleId === roleId);
  if (role) {
    role.isActive = false;
  }
};

staffSchema.methods.deactivate = function(reason, deactivatedBy) {
  this.employmentInfo.employmentStatus = 'INACTIVE';
  this.systemInfo.accountLocked = true;
  this.systemInfo.lockReason = reason;
  this.systemInfo.lockedAt = new Date();
  this.systemInfo.lockedBy = deactivatedBy;
};

staffSchema.methods.activate = function() {
  this.employmentInfo.employmentStatus = 'ACTIVE';
  this.systemInfo.accountLocked = false;
  this.systemInfo.lockReason = null;
  this.systemInfo.lockedAt = null;
  this.systemInfo.lockedBy = null;
};

staffSchema.methods.toPublicJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj._id;
  delete obj.__v;
  delete obj.employmentInfo.salary;
  delete obj.systemInfo.passwordChangeRequired;
  delete obj.systemInfo.accountLocked;
  return obj;
};

staffSchema.methods.toMinimalJSON = function() {
  return {
    staffId: this.staffId,
    staffCode: this.staffCode,
    fullName: this.fullName,
    email: this.personalInfo.email,
    roles: this.activeRoles.map(role => role.roleName),
    employmentStatus: this.employmentInfo.employmentStatus,
    branchId: this.branchId,
    tenantId: this.tenantId
  };
};

// Static methods
staffSchema.statics.findByTenant = function(tenantId, options = {}) {
  const query = { tenantId };
  if (options.status) {
    query['employmentInfo.employmentStatus'] = options.status;
  }
  if (options.branchId) {
    query.branchId = options.branchId;
  }
  if (options.role) {
    query['roles.roleName'] = options.role.toUpperCase();
    query['roles.isActive'] = true;
  }
  return this.find(query);
};

staffSchema.statics.findByRole = function(roleName, tenantId, branchId = null) {
  const query = {
    tenantId,
    'roles.roleName': roleName.toUpperCase(),
    'roles.isActive': true,
    'employmentInfo.employmentStatus': 'ACTIVE'
  };
  if (branchId) {
    query.branchId = branchId;
  }
  return this.find(query);
};

staffSchema.statics.generateStaffCode = function(tenantId, branchId) {
  const prefix = `${tenantId.slice(-3).toUpperCase()}${branchId.slice(-2).toUpperCase()}`;
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${timestamp}`;
};

staffSchema.statics.generateEmployeeId = function(tenantId, sequence) {
  const year = new Date().getFullYear().toString().slice(-2);
  const tenantPrefix = tenantId.slice(-3).toUpperCase();
  const seqStr = sequence.toString().padStart(4, '0');
  return `EMP${year}${tenantPrefix}${seqStr}`;
};

// Pre-save middleware
staffSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.auditInfo.updatedAt = new Date();
    this.auditInfo.version += 1;
  }
  
  // Generate staff code if not provided
  if (this.isNew && !this.staffCode) {
    this.staffCode = this.constructor.generateStaffCode(this.tenantId, this.branchId);
  }
  
  next();
});

// Pre-remove middleware
staffSchema.pre('remove', function(next) {
  // Soft delete instead of hard delete
  this.employmentInfo.employmentStatus = 'TERMINATED';
  this.save().then(() => next()).catch(next);
});

module.exports = mongoose.model('Staff', staffSchema);