const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const clinicSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
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
    maxlength: 200
  },
  contactInfo: {
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100
    },
    website: {
      type: String,
      trim: true,
      maxlength: 200
    }
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: 200
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
    pincode: {
      type: String,
      trim: true,
      maxlength: 20
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'India'
    }
  },
  licenseInfo: {
    licenseNumber: {
      type: String,
      trim: true,
      maxlength: 100
    },
    issuedBy: {
      type: String,
      trim: true,
      maxlength: 200
    },
    validUntil: {
      type: Date
    }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
    default: 'ACTIVE',
    required: true
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
clinicSchema.index({ tenantId: 1, status: 1, deletedAt: 1 });
clinicSchema.index({ clinicId: 1 }, { unique: true });
clinicSchema.index({ 'contactInfo.email': 1 });
clinicSchema.index({ createdAt: -1 });
clinicSchema.index({ deletedAt: 1 });

// Virtual for branch count
clinicSchema.virtual('branchCount', {
  ref: 'Branch',
  localField: 'clinicId',
  foreignField: 'clinicId',
  count: true,
  match: { deletedAt: null }
});

// Pre-save middleware
clinicSchema.pre('save', function(next) {
  if (this.isNew) {
    this.clinicId = this.clinicId || uuidv4();
  }
  next();
});

// Instance methods
clinicSchema.methods.toPublicJSON = function() {
  const clinic = this.toObject();
  delete clinic._id;
  delete clinic.__v;
  return clinic;
};

clinicSchema.methods.isActive = function() {
  return this.status === 'ACTIVE' && !this.deletedAt;
};

clinicSchema.methods.canBeDeleted = async function() {
  const Branch = mongoose.model('Branch');
  const branchCount = await Branch.countDocuments({ 
    clinicId: this.clinicId,
    deletedAt: null
  });
  return branchCount === 0;
};

// Static methods
clinicSchema.statics.findByTenant = function(tenantId, options = {}) {
  const query = { tenantId, deletedAt: null };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

clinicSchema.statics.findByClinicId = function(clinicId, tenantId) {
  return this.findOne({ 
    clinicId, 
    tenantId,
    deletedAt: null
  });
};

clinicSchema.statics.existsForTenant = function(clinicId, tenantId) {
  return this.exists({ 
    clinicId, 
    tenantId,
    deletedAt: null
  });
};

module.exports = mongoose.model('Clinic', clinicSchema);