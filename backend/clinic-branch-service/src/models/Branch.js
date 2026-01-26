const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const branchSchema = new mongoose.Schema({
  branchId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  clinicId: {
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
  code: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 10
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'India'
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  timezone: {
    type: String,
    required: true,
    default: 'Asia/Kolkata'
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
    fax: {
      type: String,
      trim: true,
      maxlength: 20
    }
  },
  operationalInfo: {
    capacity: {
      type: Number,
      min: 1,
      default: 50
    },
    establishedDate: {
      type: Date
    },
    licenseNumber: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'MAINTENANCE', 'INACTIVE'],
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
branchSchema.index({ clinicId: 1, status: 1, deletedAt: 1 });
branchSchema.index({ branchId: 1 }, { unique: true });
branchSchema.index({ code: 1 });
branchSchema.index({ 'address.city': 1, 'address.state': 1 });
branchSchema.index({ 'contactInfo.email': 1 });
branchSchema.index({ createdAt: -1 });
branchSchema.index({ deletedAt: 1 });

// Virtual for department count
branchSchema.virtual('departmentCount', {
  ref: 'Department',
  localField: 'branchId',
  foreignField: 'branchId',
  count: true,
  match: { deletedAt: null }
});

// Virtual for room count
branchSchema.virtual('roomCount', {
  ref: 'Room',
  localField: 'branchId',
  foreignField: 'branchId',
  count: true,
  match: { deletedAt: null }
});

// Pre-save middleware
branchSchema.pre('save', function(next) {
  if (this.isNew) {
    this.branchId = this.branchId || uuidv4();
    
    // Generate branch code if not provided
    if (!this.code) {
      const cityCode = this.address.city.substring(0, 3).toUpperCase();
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.code = `${cityCode}${randomNum}`;
    }
  }
  next();
});

// Instance methods
branchSchema.methods.toPublicJSON = function() {
  const branch = this.toObject();
  delete branch._id;
  delete branch.__v;
  return branch;
};

branchSchema.methods.isActive = function() {
  return this.status === 'ACTIVE' && !this.deletedAt;
};

branchSchema.methods.isOperational = function() {
  return ['ACTIVE', 'MAINTENANCE'].includes(this.status) && !this.deletedAt;
};

branchSchema.methods.canBeDeleted = async function() {
  const Department = mongoose.model('Department');
  const Room = mongoose.model('Room');
  
  const [departmentCount, roomCount] = await Promise.all([
    Department.countDocuments({ 
      branchId: this.branchId,
      deletedAt: null
    }),
    Room.countDocuments({ 
      branchId: this.branchId,
      deletedAt: null
    })
  ]);
  
  return departmentCount === 0 && roomCount === 0;
};

branchSchema.methods.getFullAddress = function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.pincode}, ${addr.country}`;
};

// Static methods
branchSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, deletedAt: null };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.city) {
    query['address.city'] = new RegExp(options.city, 'i');
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

branchSchema.statics.findByBranchId = function(branchId, clinicId) {
  return this.findOne({ 
    branchId, 
    clinicId,
    deletedAt: null
  });
};

branchSchema.statics.existsForClinic = function(branchId, clinicId) {
  return this.exists({ 
    branchId, 
    clinicId,
    deletedAt: null
  });
};

branchSchema.statics.findByCode = function(code, clinicId) {
  return this.findOne({ 
    code: code.toUpperCase(), 
    clinicId,
    deletedAt: null
  });
};

branchSchema.statics.findNearby = function(latitude, longitude, maxDistance = 10000) {
  return this.find({
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    status: 'ACTIVE',
    deletedAt: null
  });
};

module.exports = mongoose.model('Branch', branchSchema);