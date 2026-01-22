const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    default: () => `tenant_${uuidv4()}`
  },
  organizationName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  industryType: {
    type: String,
    required: true,
    enum: ['DENTAL', 'MEDICAL', 'VETERINARY'],
    default: 'DENTAL'
  },
  status: {
    type: String,
    required: true,
    enum: ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'DEACTIVATED'],
    default: 'TRIAL'
  },
  subscriptionType: {
    type: String,
    enum: ['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'],
    default: 'BASIC'
  },
  owner: {
    name: {
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
      match: [/^\+?[\d\s\-\(\)]{10,15}$/, 'Please enter a valid phone number']
    },
    roles: [{
      type: String,
      enum: ['CENTRAL_ADMIN', 'DOCTOR', 'OWNER'],
      default: 'OWNER'
    }]
  },
  contactInfo: {
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
      zipCode: { type: String, trim: true }
    },
    website: { type: String, trim: true },
    taxId: { type: String, trim: true },
    registrationNumber: { type: String, trim: true }
  },
  configuration: {
    enabledModules: [{
      type: String,
      enum: [
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS', 
        'OCR_PRESCRIPTION', 'BILLING', 'INVENTORY', 
        'ANALYTICS', 'NOTIFICATIONS', 'AUDIT_LOGS'
      ]
    }],
    appointmentRules: {
      maxAdvanceBookingDays: { type: Number, default: 30 },
      minBookingNoticeHours: { type: Number, default: 2 },
      allowCancellationHours: { type: Number, default: 24 },
      maxAppointmentsPerDay: { type: Number, default: 50 }
    },
    tokenRules: {
      enableQRCheckin: { type: Boolean, default: true },
      enableNFCCheckin: { type: Boolean, default: false },
      autoAdvanceQueue: { type: Boolean, default: true },
      maxWaitingTokens: { type: Number, default: 20 }
    },
    featureFlags: {
      type: Map,
      of: Boolean,
      default: new Map([
        ['AI_ENABLED', true],
        ['OCR_ENABLED', true],
        ['ANALYTICS_ENABLED', true],
        ['NOTIFICATIONS_ENABLED', true]
      ])
    }
  },
  limits: {
    maxBranches: { type: Number, default: 1 },
    maxUsers: { type: Number, default: 10 },
    maxAppointmentsPerMonth: { type: Number, default: 1000 },
    storageQuotaGB: { type: Number, default: 5 }
  },
  subscription: {
    planId: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    billingCycle: { 
      type: String, 
      enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
      default: 'MONTHLY'
    },
    autoRenew: { type: Boolean, default: true }
  },
  metadata: {
    timezone: { type: String, default: 'Asia/Kolkata' },
    locale: { type: String, default: 'en-IN' },
    currency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: '24h' }
  },
  auditInfo: {
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedBy: { type: String },
    updatedAt: { type: Date },
    lastLoginAt: { type: Date },
    activatedAt: { type: Date },
    suspendedAt: { type: Date },
    suspensionReason: { type: String }
  }
}, {
  timestamps: true,
  collection: 'tenants'
});

// Indexes
tenantSchema.index({ tenantId: 1 }, { unique: true });
tenantSchema.index({ 'owner.email': 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ organizationName: 1 });
tenantSchema.index({ createdAt: -1 });

// Virtual for active status
tenantSchema.virtual('isActive').get(function() {
  return this.status === 'ACTIVE' || this.status === 'TRIAL';
});

// Pre-save middleware
tenantSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.auditInfo.updatedAt = new Date();
  }
  next();
});

// Methods
tenantSchema.methods.activate = function(activatedBy) {
  this.status = 'ACTIVE';
  this.auditInfo.activatedAt = new Date();
  this.auditInfo.updatedBy = activatedBy;
  return this.save();
};

tenantSchema.methods.suspend = function(suspendedBy, reason) {
  this.status = 'SUSPENDED';
  this.auditInfo.suspendedAt = new Date();
  this.auditInfo.suspensionReason = reason;
  this.auditInfo.updatedBy = suspendedBy;
  return this.save();
};

tenantSchema.methods.updateLastLogin = function() {
  this.auditInfo.lastLoginAt = new Date();
  return this.save();
};

tenantSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Tenant', tenantSchema);