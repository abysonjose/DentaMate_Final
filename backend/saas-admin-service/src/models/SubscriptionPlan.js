const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const subscriptionPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true,
    default: () => `plan_${uuidv4()}`
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  pricing: {
    monthly: {
      price: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'USD' }
    },
    yearly: {
      price: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'USD' },
      discount: { type: Number, min: 0, max: 100, default: 0 }
    }
  },
  limits: {
    maxBranches: { type: Number, required: true, min: 1 },
    maxUsers: { type: Number, required: true, min: 1 },
    maxAppointmentsPerMonth: { type: Number, required: true, min: 1 },
    storageQuotaGB: { type: Number, required: true, min: 1 },
    maxAiRequestsPerMonth: { type: Number, default: 1000 }
  },
  features: {
    enabledModules: [{
      type: String,
      enum: [
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS', 
        'OCR_PRESCRIPTION', 'BILLING', 'INVENTORY', 
        'ANALYTICS', 'NOTIFICATIONS', 'AUDIT_LOGS',
        'PAYROLL', 'HR', 'INSURANCE', 'LAB_MANAGEMENT',
        'PHARMACY', 'ORTHODONTIC', 'NURSING_CARE'
      ]
    }],
    aiFeatures: {
      xrayAnalysis: { type: Boolean, default: false },
      cavityDetection: { type: Boolean, default: false },
      boneLossDetection: { type: Boolean, default: false },
      prescriptionOCR: { type: Boolean, default: false }
    },
    advancedFeatures: {
      multiTenantReporting: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      slaGuarantee: { type: Boolean, default: false }
    }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'DEPRECATED'],
    default: 'ACTIVE'
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isCustomizable: {
    type: Boolean,
    default: false
  },
  trialPeriodDays: {
    type: Number,
    default: 14,
    min: 0
  },
  metadata: {
    targetAudience: { type: String, trim: true },
    marketingDescription: { type: String, trim: true },
    salesNotes: { type: String, trim: true }
  },
  auditInfo: {
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedBy: { type: String },
    updatedAt: { type: Date },
    version: { type: Number, default: 1 }
  }
}, {
  timestamps: false,
  collection: 'subscription_plans'
});

// Indexes
subscriptionPlanSchema.index({ name: 1 });
subscriptionPlanSchema.index({ status: 1 });
subscriptionPlanSchema.index({ isPopular: 1 });
subscriptionPlanSchema.index({ 'auditInfo.createdAt': -1 });

// Methods
subscriptionPlanSchema.methods.toPublicJSON = function() {
  const plan = this.toObject();
  delete plan._id;
  delete plan.__v;
  return plan;
};

subscriptionPlanSchema.methods.calculateYearlyDiscount = function() {
  const monthlyTotal = this.pricing.monthly.price * 12;
  const yearlyPrice = this.pricing.yearly.price;
  return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
};

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);