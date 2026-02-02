const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const staffProfileSchema = new mongoose.Schema({
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
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
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
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    alternatePhone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
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
      trim: true,
      maxlength: 200
    },
    area: {
      type: String,
      trim: true,
      maxlength: 100
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'India'
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: 20
    }
  },
  employmentInfo: {
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
    contractEndDate: {
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
  professionalInfo: {
    specialization: {
      type: String,
      trim: true,
      maxlength: 200
    },
    qualifications: [{
      degree: { type: String, required: true },
      institution: { type: String, required: true },
      year: { type: Number, required: true },
      grade: String
    }],
    certifications: [{
      name: { type: String, required: true },
      issuingBody: { type: String, required: true },
      issueDate: { type: Date, required: true },
      expiryDate: Date,
      certificateNumber: String
    }],
    experience: {
      totalYears: { type: Number, min: 0, default: 0 },
      previousEmployments: [{
        company: String,
        position: String,
        startDate: Date,
        endDate: Date,
        responsibilities: String
      }]
    },
    licenseNumber: {
      type: String,
      trim: true
    },
    licenseExpiryDate: {
      type: Date
    }
  },
  emergencyContact: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },
  documents: [{
    type: {
      type: String,
      required: true,
      enum: ['RESUME', 'ID_PROOF', 'ADDRESS_PROOF', 'QUALIFICATION', 'EXPERIENCE', 'MEDICAL', 'OTHER']
    },
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: String,
      required: true
    }
  }],
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  auditInfo: {
    createdBy: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String
    },
    updatedAt: {
      type: Date
    },
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  collection: 'staff_profiles'
});

// Compound indexes for efficient queries
staffProfileSchema.index({ tenantId: 1, branchId: 1 });
staffProfileSchema.index({ tenantId: 1, 'employmentInfo.employmentStatus': 1 });
staffProfileSchema.index({ staffCode: 1 }, { unique: true });
staffProfileSchema.index({ userAuthId: 1 }, { unique: true });
staffProfileSchema.index({ 'personalInfo.email': 1 });
staffProfileSchema.index({ 'personalInfo.phone': 1 });
staffProfileSchema.index({ isActive: 1 });

// Virtual for full name
staffProfileSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Virtual for age
staffProfileSchema.virtual('age').get(function() {
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

// Method to check if staff is currently active
staffProfileSchema.methods.isCurrentlyActive = function() {
  return this.isActive && this.employmentInfo.employmentStatus === 'ACTIVE';
};

// Method to get current roles
staffProfileSchema.methods.getCurrentRoles = async function() {
  const StaffRoleMapping = mongoose.model('StaffRoleMapping');
  const mappings = await StaffRoleMapping.find({
    staffId: this.staffId,
    isActive: true
  }).populate('roleId');
  
  return mappings.map(mapping => mapping.roleId);
};

// Method to check if staff has specific role
staffProfileSchema.methods.hasRole = async function(roleName) {
  const roles = await this.getCurrentRoles();
  return roles.some(role => role.roleName === roleName);
};

// Method to deactivate staff
staffProfileSchema.methods.deactivate = function(reason, deactivatedBy) {
  this.employmentInfo.employmentStatus = 'INACTIVE';
  this.isActive = false;
  this.auditInfo.updatedBy = deactivatedBy;
  this.auditInfo.updatedAt = new Date();
  
  // Log the deactivation reason in audit
  return this.save();
};

// Method to transfer staff to another branch
staffProfileSchema.methods.transferToBranch = function(newBranchId, transferredBy) {
  const oldBranchId = this.branchId;
  this.branchId = newBranchId;
  this.auditInfo.updatedBy = transferredBy;
  this.auditInfo.updatedAt = new Date();
  this.auditInfo.version += 1;
  
  return { oldBranchId, newBranchId };
};

// Static method to generate staff code
staffProfileSchema.statics.generateStaffCode = async function(tenantId, branchId) {
  const Branch = mongoose.model('Branch');
  const branch = await Branch.findOne({ branchId });
  const branchCode = branch ? branch.branchCode : 'BR';
  
  // Find the last staff code for this branch
  const lastStaff = await this.findOne({
    tenantId,
    branchId
  }).sort({ staffCode: -1 });
  
  let nextNumber = 1;
  if (lastStaff && lastStaff.staffCode) {
    const match = lastStaff.staffCode.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  return `${branchCode}${nextNumber.toString().padStart(4, '0')}`;
};

// Pre-save middleware
staffProfileSchema.pre('save', function(next) {
  // Update full name
  if (this.personalInfo.firstName && this.personalInfo.lastName) {
    this.personalInfo.fullName = `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
  }
  
  // Update audit info
  if (this.isModified() && !this.isNew) {
    this.auditInfo.updatedAt = new Date();
  }
  
  next();
});

// Transform output
staffProfileSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  delete obj.employmentInfo.salary; // Hide salary in public view
  return obj;
};

staffProfileSchema.methods.toSecureJSON = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('StaffProfile', staffProfileSchema);