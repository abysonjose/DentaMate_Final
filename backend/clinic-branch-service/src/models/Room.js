const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roomSchema = new mongoose.Schema({
  roomId: {
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
  departmentId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  number: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  type: {
    type: String,
    enum: ['CONSULTATION', 'TREATMENT', 'DIAGNOSTIC', 'SURGERY', 'RECOVERY', 'WAITING'],
    required: true,
    default: 'CONSULTATION'
  },
  floor: {
    type: Number,
    min: 0,
    default: 0
  },
  capacity: {
    type: Number,
    min: 1,
    default: 1
  },
  area: {
    type: Number, // in square feet
    min: 0
  },
  equipment: [{
    type: String,
    trim: true
  }],
  features: [{
    type: String,
    trim: true
  }],
  accessibility: {
    wheelchairAccessible: {
      type: Boolean,
      default: false
    },
    emergencyAccess: {
      type: Boolean,
      default: false
    },
    specialNeeds: [{
      type: String,
      trim: true
    }]
  },
  currentOccupancy: {
    isOccupied: {
      type: Boolean,
      default: false
    },
    occupiedBy: {
      patientId: String,
      doctorId: String,
      appointmentId: String
    },
    occupiedSince: {
      type: Date
    },
    estimatedFreeTime: {
      type: Date
    }
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE'],
    default: 'AVAILABLE',
    required: true
  },
  statusReason: {
    type: String,
    trim: true,
    maxlength: 200
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
roomSchema.index({ branchId: 1, departmentId: 1, status: 1, deletedAt: 1 });
roomSchema.index({ roomId: 1 }, { unique: true });
roomSchema.index({ type: 1, status: 1 });
roomSchema.index({ 'currentOccupancy.isOccupied': 1 });
roomSchema.index({ createdAt: -1 });
roomSchema.index({ deletedAt: 1 });

// Compound index for unique name per branch
roomSchema.index({ branchId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

// Pre-save middleware
roomSchema.pre('save', function(next) {
  if (this.isNew) {
    this.roomId = this.roomId || uuidv4();
  }
  next();
});

// Instance methods
roomSchema.methods.toPublicJSON = function() {
  const room = this.toObject();
  delete room._id;
  delete room.__v;
  return room;
};

roomSchema.methods.isAvailable = function() {
  return this.status === 'AVAILABLE' && !this.currentOccupancy.isOccupied && !this.deletedAt;
};

roomSchema.methods.isOccupied = function() {
  return this.currentOccupancy.isOccupied;
};

roomSchema.methods.occupy = function(occupancyDetails) {
  this.currentOccupancy = {
    isOccupied: true,
    occupiedBy: occupancyDetails,
    occupiedSince: new Date(),
    estimatedFreeTime: occupancyDetails.estimatedFreeTime
  };
  this.status = 'OCCUPIED';
  return this.save();
};

roomSchema.methods.vacate = function() {
  this.currentOccupancy = {
    isOccupied: false,
    occupiedBy: {},
    occupiedSince: null,
    estimatedFreeTime: null
  };
  this.status = 'AVAILABLE';
  return this.save();
};

roomSchema.methods.addEquipment = function(equipmentName) {
  if (!this.equipment.includes(equipmentName)) {
    this.equipment.push(equipmentName);
  }
  return this.save();
};

roomSchema.methods.removeEquipment = function(equipmentName) {
  this.equipment = this.equipment.filter(e => e !== equipmentName);
  return this.save();
};

// Static methods
roomSchema.statics.findByBranch = function(branchId, options = {}) {
  const query = { branchId, deletedAt: null };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.departmentId) {
    query.departmentId = options.departmentId;
  }
  
  if (options.floor !== undefined) {
    query.floor = options.floor;
  }
  
  return this.find(query)
    .sort({ floor: 1, name: 1 })
    .limit(options.limit || 100);
};

roomSchema.statics.findByDepartment = function(departmentId, options = {}) {
  const query = { departmentId, deletedAt: null };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ name: 1 })
    .limit(options.limit || 50);
};

roomSchema.statics.findByRoomId = function(roomId, branchId) {
  return this.findOne({ 
    roomId, 
    branchId,
    deletedAt: null
  });
};

roomSchema.statics.findAvailable = function(branchId, departmentId = null, type = null) {
  const query = { 
    branchId,
    status: 'AVAILABLE',
    'currentOccupancy.isOccupied': false,
    deletedAt: null
  };
  
  if (departmentId) {
    query.departmentId = departmentId;
  }
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query).sort({ name: 1 });
};

roomSchema.statics.findOccupied = function(branchId, departmentId = null) {
  const query = { 
    branchId,
    'currentOccupancy.isOccupied': true,
    deletedAt: null
  };
  
  if (departmentId) {
    query.departmentId = departmentId;
  }
  
  return this.find(query).sort({ 'currentOccupancy.occupiedSince': -1 });
};

module.exports = mongoose.model('Room', roomSchema);