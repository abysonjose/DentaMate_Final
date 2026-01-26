const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const departmentSchema = new mongoose.Schema({
  departmentId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  branchId: {
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
  type: {
    type: String,
    enum: ['GENERAL', 'ORTHODONTICS', 'SURGERY', 'DIAGNOSTICS', 'PEDIATRIC', 'PERIODONTICS', 'ENDODONTICS', 'ORAL_SURGERY'],
    required: true,
    default: 'GENERAL'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  headOfDepartment: {
    userId: {
      type: String
    },
    name: {
      type: String,
      trim: true,
      maxlength: 200
    },
    contactInfo: {
      phone: {
        type: String,
        trim: true,
        maxlength: 20
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 100
      }
    }
  },
  capacity: {
    maxPatients: {
      type: Number,
      min: 1,
      default: 20
    },
    maxConcurrentAppointments: {
      type: Number,
      min: 1,
      default: 5
    }
  },
  services: [{
    serviceId: {
      type: String,
      required: true
    },
    serviceName: {
      type: String,
      required: true,
      trim: true
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 15
    },
    price: {
      type: Number,
      min: 0
    }
  }],
  equipment: [{
    equipmentId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER'],
      default: 'AVAILABLE'
    }
  }],
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
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
departmentSchema.index({ branchId: 1, status: 1, deletedAt: 1 });
departmentSchema.index({ departmentId: 1 }, { unique: true });
departmentSchema.index({ type: 1 });
departmentSchema.index({ code: 1 });
departmentSchema.index({ createdAt: -1 });
departmentSchema.index({ deletedAt: 1 });

// Compound index for unique name per branch
departmentSchema.index({ branchId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

// Virtual for room count
departmentSchema.virtual('roomCount', {
  ref: 'Room',
  localField: 'departmentId',
  foreignField: 'departmentId',
  count: true,
  match: { deletedAt: null }
});

// Pre-save middleware
departmentSchema.pre('save', function(next) {
  if (this.isNew) {
    this.departmentId = this.departmentId || uuidv4();
    
    // Generate department code if not provided
    if (!this.code) {
      const typeCode = this.type.substring(0, 3).toUpperCase();
      const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      this.code = `${typeCode}${randomNum}`;
    }
  }
  next();
});

// Instance methods
departmentSchema.methods.toPublicJSON = function() {
  const department = this.toObject();
  delete department._id;
  delete department.__v;
  return department;
};

departmentSchema.methods.isActive = function() {
  return this.status === 'ACTIVE' && !this.deletedAt;
};

departmentSchema.methods.canBeDeleted = async function() {
  const Room = mongoose.model('Room');
  const roomCount = await Room.countDocuments({ 
    departmentId: this.departmentId,
    deletedAt: null
  });
  return roomCount === 0;
};

departmentSchema.methods.addService = function(service) {
  this.services.push(service);
  return this.save();
};

departmentSchema.methods.removeService = function(serviceId) {
  this.services = this.services.filter(s => s.serviceId !== serviceId);
  return this.save();
};

departmentSchema.methods.addEquipment = function(equipment) {
  this.equipment.push(equipment);
  return this.save();
};

departmentSchema.methods.removeEquipment = function(equipmentId) {
  this.equipment = this.equipment.filter(e => e.equipmentId !== equipmentId);
  return this.save();
};

// Static methods
departmentSchema.statics.findByBranch = function(branchId, options = {}) {
  const query = { branchId, deletedAt: null };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

departmentSchema.statics.findByDepartmentId = function(departmentId, branchId) {
  return this.findOne({ 
    departmentId, 
    branchId,
    deletedAt: null
  });
};

departmentSchema.statics.existsForBranch = function(departmentId, branchId) {
  return this.exists({ 
    departmentId, 
    branchId,
    deletedAt: null
  });
};

departmentSchema.statics.findByType = function(type, branchId) {
  return this.find({ 
    type, 
    branchId,
    status: 'ACTIVE',
    deletedAt: null
  });
};

departmentSchema.statics.findByCode = function(code, branchId) {
  return this.findOne({ 
    code: code.toUpperCase(), 
    branchId,
    deletedAt: null
  });
};

module.exports = mongoose.model('Department', departmentSchema);