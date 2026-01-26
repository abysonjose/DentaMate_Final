const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const licenseSchema = new mongoose.Schema({
  licenseId: {
    type: String,
    required: true,
    unique: true,
    default: () => `lic_${uuidv4()}`
  },
  licenseKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    ref: 'Tenant',
    index: true
  },
  planId: {
    type: String,
    required: true,
    ref: 'SubscriptionPlan'
  },
  status: {
    type: String,
    required: true,
    enum: ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED'],
    default: 'TRIAL',
    index: true
  },
  validity: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    trialEndDate: { type: Date },
    gracePeriodDays: { type: Number, default: 7 }
  },
  subscription: {
    subscriptionId: { type: String },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    autoRenewal: { type: Boolean, default: true },
    nextBillingDate: { type: Date },
    lastPaymentDate: { type: Date },
    paymentStatus: { 
      type: String, 
      enum: ['PAID', 'PENDING', 'FAILED', 'OVERDUE'], 
      default: 'PENDING' 
    }
  },
  usage: {
    currentBranches: { type: Number, default: 0 },
    currentUsers: { type: Number, default: 0 },
    currentAppointmentsThisMonth: { type: Number, default: 0 },
    storageUsedGB: { type: Number, default: 0 },
    aiRequestsThisMonth: { type: Number, default: 0 },
    lastUsageUpdate: { type: Date, default: Date.now }
  },
  limits: {
    maxBranches: { type: Number, required: true },
    maxUsers: { type: Number, required: true },
    maxAppointmentsPerMonth: { type: Number, required: true },
    storageQuotaGB: { type: Number, required: true },
    maxAiRequestsPerMonth: { type: Number, required: true }
  },
  features: {
    enabledModules: [{ type: String }],
    aiFeatures: {
      xrayAnalysis: { type: Boolean, default: false },
      cavityDetection: { type: Boolean, default: false },
      boneLossDetection: { type: Boolean, default: false },
      prescriptionOCR: { type: Boolean, default: false }
    },
    customizations: {
      customBranding: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false }
    }
  },
  restrictions: {
    ipWhitelist: [{ type: String }],
    domainRestrictions: [{ type: String }],
    maintenanceMode: { type: Boolean, default: false },
    suspensionReason: { type: String }
  },
  compliance: {
    dataRetentionDays: { type: Number, default: 2555 }, // 7 years
    auditLogRetentionDays: { type: Number, default: 730 }, // 2 years
    backupFrequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
    encryptionEnabled: { type: Boolean, default: true }
  },
  notifications: {
    expiryWarningDays: { type: Number, default: 30 },
    usageWarningThreshold: { type: Number, default: 80 }, // 80%
    lastExpiryWarning: { type: Date },
    lastUsageWarning: { type: Date }
  },
  auditInfo: {
    issuedBy: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
    lastModifiedBy: { type: String },
    lastModifiedAt: { type: Date },
    revocationReason: { type: String },
    revokedBy: { type: String },
    revokedAt: { type: Date }
  }
}, {
  timestamps: false,
  collection: 'licenses'
});

// Indexes
licenseSchema.index({ tenantId: 1 });
licenseSchema.index({ status: 1 });
licenseSchema.index({ 'validity.endDate': 1 });
licenseSchema.index({ 'subscription.nextBillingDate': 1 });
licenseSchema.index({ 'auditInfo.issuedAt': -1 });

// Virtual fields
licenseSchema.virtual('isExpired').get(function() {
  return new Date() > this.validity.endDate;
});

licenseSchema.virtual('isInGracePeriod').get(function() {
  const now = new Date();
  const gracePeriodEnd = new Date(this.validity.endDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.validity.gracePeriodDays);
  return now > this.validity.endDate && now <= gracePeriodEnd;
});

licenseSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diffTime = this.validity.endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
licenseSchema.methods.toPublicJSON = function() {
  const license = this.toObject({ virtuals: true });
  delete license._id;
  delete license.__v;
  return license;
};

licenseSchema.methods.isUsageLimitExceeded = function(type) {
  switch(type) {
    case 'branches':
      return this.usage.currentBranches >= this.limits.maxBranches;
    case 'users':
      return this.usage.currentUsers >= this.limits.maxUsers;
    case 'appointments':
      return this.usage.currentAppointmentsThisMonth >= this.limits.maxAppointmentsPerMonth;
    case 'storage':
      return this.usage.storageUsedGB >= this.limits.storageQuotaGB;
    case 'ai':
      return this.usage.aiRequestsThisMonth >= this.limits.maxAiRequestsPerMonth;
    default:
      return false;
  }
};

licenseSchema.methods.getUsagePercentage = function(type) {
  switch(type) {
    case 'branches':
      return Math.round((this.usage.currentBranches / this.limits.maxBranches) * 100);
    case 'users':
      return Math.round((this.usage.currentUsers / this.limits.maxUsers) * 100);
    case 'appointments':
      return Math.round((this.usage.currentAppointmentsThisMonth / this.limits.maxAppointmentsPerMonth) * 100);
    case 'storage':
      return Math.round((this.usage.storageUsedGB / this.limits.storageQuotaGB) * 100);
    case 'ai':
      return Math.round((this.usage.aiRequestsThisMonth / this.limits.maxAiRequestsPerMonth) * 100);
    default:
      return 0;
  }
};

module.exports = mongoose.model('License', licenseSchema);