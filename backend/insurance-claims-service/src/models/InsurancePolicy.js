const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  policyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  patientId: {
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
  provider: {
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true
    },
    contactInfo: {
      phone: String,
      email: String,
      address: String
    }
  },
  policyNumber: {
    type: String,
    required: true,
    index: true
  },
  policyHolderName: {
    type: String,
    required: true
  },
  policyHolderRelation: {
    type: String,
    enum: ['self', 'spouse', 'child', 'parent', 'other'],
    default: 'self'
  },
  coverageType: {
    type: String,
    enum: ['basic', 'comprehensive', 'premium', 'family'],
    required: true
  },
  coverageDetails: {
    annualLimit: {
      type: Number,
      required: true
    },
    deductible: {
      type: Number,
      default: 0
    },
    coPaymentPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    coveredServices: [{
      serviceType: String,
      coveragePercentage: Number,
      annualLimit: Number
    }],
    excludedServices: [String]
  },
  validityPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'cancelled'],
    default: 'active'
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'expired'],
    default: 'pending'
  },
  lastVerificationDate: Date,
  verificationNotes: String,
  documents: [{
    documentType: {
      type: String,
      enum: ['policy_card', 'certificate', 'terms_conditions', 'other']
    },
    fileName: String,
    filePath: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: String
  }],
  utilizationSummary: {
    currentYearUsed: {
      type: Number,
      default: 0
    },
    remainingBenefit: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'insurance_policies'
});

// Indexes for performance
insurancePolicySchema.index({ tenantId: 1, branchId: 1 });
insurancePolicySchema.index({ patientId: 1, status: 1 });
insurancePolicySchema.index({ 'provider.code': 1, policyNumber: 1 });
insurancePolicySchema.index({ 'validityPeriod.endDate': 1 });

// Virtual for checking if policy is currently valid
insurancePolicySchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.validityPeriod.startDate <= now && 
         this.validityPeriod.endDate >= now;
});

// Method to check coverage for a specific service
insurancePolicySchema.methods.getCoverageForService = function(serviceType) {
  const coverage = this.coverageDetails.coveredServices.find(
    service => service.serviceType === serviceType
  );
  
  if (!coverage) {
    return {
      covered: false,
      percentage: 0,
      annualLimit: 0
    };
  }
  
  return {
    covered: true,
    percentage: coverage.coveragePercentage,
    annualLimit: coverage.annualLimit
  };
};

// Method to calculate remaining benefit
insurancePolicySchema.methods.calculateRemainingBenefit = function() {
  const totalLimit = this.coverageDetails.annualLimit;
  const used = this.utilizationSummary.currentYearUsed || 0;
  return Math.max(0, totalLimit - used);
};

// Pre-save middleware
insurancePolicySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update remaining benefit
  this.utilizationSummary.remainingBenefit = this.calculateRemainingBenefit();
  this.utilizationSummary.lastUpdated = new Date();
  
  next();
});

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);