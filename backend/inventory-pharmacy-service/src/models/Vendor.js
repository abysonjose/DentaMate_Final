const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendorId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  contactPerson: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    designation: String,
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    alternatePhone: String,
    alternateEmail: String
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      required: true,
      trim: true
    }
  },
  businessDetails: {
    gstNumber: String,
    panNumber: String,
    drugLicenseNumber: String,
    establishmentYear: Number,
    businessType: {
      type: String,
      enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer'],
      required: true
    }
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    branchName: String,
    ifscCode: String,
    swiftCode: String
  },
  paymentTerms: {
    creditDays: {
      type: Number,
      default: 30,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'cheque', 'bank_transfer', 'online', 'credit'],
      default: 'bank_transfer'
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  specializations: [{
    type: String,
    enum: ['antibiotics', 'painkillers', 'dental_supplies', 'surgical_instruments', 'anesthetics', 'vitamins', 'general_medicines']
  }],
  certifications: [{
    name: String,
    number: String,
    issuedBy: String,
    issuedDate: Date,
    expiryDate: Date,
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active'
    }
  }],
  performanceMetrics: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalValue: {
      type: Number,
      default: 0
    },
    averageDeliveryTime: {
      type: Number,
      default: 0
    },
    onTimeDeliveryRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    qualityRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    lastOrderDate: Date,
    lastPaymentDate: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'blacklisted'],
    default: 'active',
    index: true
  },
  notes: String,
  tags: [String],
  isPreferred: {
    type: Boolean,
    default: false,
    index: true
  },
  createdBy: {
    userId: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    }
  },
  updatedBy: {
    userId: String,
    role: String
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for performance
vendorSchema.index({ tenantId: 1, status: 1 });
vendorSchema.index({ tenantId: 1, name: 1 });
vendorSchema.index({ tenantId: 1, isPreferred: 1 });
vendorSchema.index({ 'contactPerson.email': 1 });
vendorSchema.index({ 'businessDetails.gstNumber': 1 });

// Virtual for full contact info
vendorSchema.virtual('fullContactInfo').get(function() {
  return `${this.contactPerson.name} (${this.contactPerson.designation}) - ${this.contactPerson.phone}`;
});

// Virtual for full address
vendorSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state}, ${this.address.country} - ${this.address.postalCode}`;
});

// Virtual for active certifications
vendorSchema.virtual('activeCertifications').get(function() {
  return this.certifications.filter(cert => 
    cert.status === 'active' && 
    (!cert.expiryDate || new Date(cert.expiryDate) > new Date())
  );
});

// Pre-save middleware
vendorSchema.pre('save', function(next) {
  if (this.isNew) {
    this.vendorId = this.vendorId || `VEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Static methods
vendorSchema.statics.findByTenant = function(tenantId, filters = {}) {
  return this.find({ tenantId, ...filters });
};

vendorSchema.statics.findActiveVendors = function(tenantId) {
  return this.find({ 
    tenantId, 
    status: 'active' 
  }).sort({ isPreferred: -1, name: 1 });
};

vendorSchema.statics.findPreferredVendors = function(tenantId) {
  return this.find({ 
    tenantId, 
    status: 'active',
    isPreferred: true 
  }).sort({ name: 1 });
};

vendorSchema.statics.searchVendors = function(tenantId, searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    tenantId,
    $or: [
      { name: regex },
      { companyName: regex },
      { 'contactPerson.name': regex },
      { 'contactPerson.email': regex }
    ]
  });
};

vendorSchema.statics.getVendorStats = function(tenantId) {
  return this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$performanceMetrics.totalValue' },
        totalOrders: { $sum: '$performanceMetrics.totalOrders' }
      }
    }
  ]);
};

// Instance methods
vendorSchema.methods.updatePerformanceMetrics = function(orderValue, deliveryTime, isOnTime, qualityRating) {
  this.performanceMetrics.totalOrders += 1;
  this.performanceMetrics.totalValue += orderValue;
  this.performanceMetrics.lastOrderDate = new Date();
  
  // Update average delivery time
  const currentAvg = this.performanceMetrics.averageDeliveryTime;
  const totalOrders = this.performanceMetrics.totalOrders;
  this.performanceMetrics.averageDeliveryTime = 
    ((currentAvg * (totalOrders - 1)) + deliveryTime) / totalOrders;
  
  // Update on-time delivery rate
  const currentRate = this.performanceMetrics.onTimeDeliveryRate;
  this.performanceMetrics.onTimeDeliveryRate = 
    ((currentRate * (totalOrders - 1)) + (isOnTime ? 100 : 0)) / totalOrders;
  
  // Update quality rating
  if (qualityRating) {
    const currentRating = this.performanceMetrics.qualityRating;
    this.performanceMetrics.qualityRating = 
      ((currentRating * (totalOrders - 1)) + qualityRating) / totalOrders;
  }
  
  return this.save();
};

vendorSchema.methods.addCertification = function(certification) {
  this.certifications.push(certification);
  return this.save();
};

vendorSchema.methods.updateCertificationStatus = function(certificationId, status) {
  const cert = this.certifications.id(certificationId);
  if (cert) {
    cert.status = status;
    return this.save();
  }
  throw new Error('Certification not found');
};

vendorSchema.methods.markAsPreferred = function() {
  this.isPreferred = true;
  return this.save();
};

vendorSchema.methods.removePreferredStatus = function() {
  this.isPreferred = false;
  return this.save();
};

vendorSchema.methods.suspend = function(reason) {
  this.status = 'suspended';
  this.notes = `Suspended: ${reason}. Previous notes: ${this.notes || ''}`;
  return this.save();
};

vendorSchema.methods.reactivate = function() {
  this.status = 'active';
  return this.save();
};

vendorSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  // Remove sensitive banking information for non-admin users
  if (obj.bankDetails) {
    obj.bankDetails = {
      accountName: obj.bankDetails.accountName,
      bankName: obj.bankDetails.bankName,
      branchName: obj.bankDetails.branchName
    };
  }
  return obj;
};

module.exports = mongoose.model('Vendor', vendorSchema);