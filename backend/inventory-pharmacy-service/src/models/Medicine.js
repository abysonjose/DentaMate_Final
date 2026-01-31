const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicineId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  brandName: {
    type: String,
    trim: true,
    index: true
  },
  strength: {
    type: String,
    required: true,
    trim: true
  },
  form: {
    type: String,
    required: true,
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'spray', 'powder', 'gel'],
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['antibiotic', 'painkiller', 'antiseptic', 'anesthetic', 'anti-inflammatory', 'vitamin', 'supplement', 'other'],
    index: true
  },
  manufacturer: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  dosageInstructions: {
    type: String,
    trim: true
  },
  sideEffects: [{
    type: String,
    trim: true
  }],
  contraindications: [{
    type: String,
    trim: true
  }],
  storageConditions: {
    temperature: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    humidity: {
      max: Number,
      unit: {
        type: String,
        default: 'percentage'
      }
    },
    specialConditions: [String]
  },
  unitOfMeasure: {
    type: String,
    required: true,
    enum: ['piece', 'ml', 'mg', 'g', 'bottle', 'vial', 'tube', 'pack'],
    default: 'piece'
  },
  minimumStockLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isControlled: {
    type: Boolean,
    default: false,
    index: true
  },
  requiresPrescription: {
    type: Boolean,
    default: true,
    index: true
  },
  // SaaS-level management
  tenantId: {
    type: String,
    required: true,
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
medicineSchema.index({ tenantId: 1, name: 1 });
medicineSchema.index({ tenantId: 1, genericName: 1 });
medicineSchema.index({ tenantId: 1, category: 1 });
medicineSchema.index({ tenantId: 1, isActive: 1 });
medicineSchema.index({ tenantId: 1, form: 1 });

// Virtual for full name
medicineSchema.virtual('fullName').get(function() {
  return this.brandName ? `${this.name} (${this.brandName})` : this.name;
});

// Pre-save middleware
medicineSchema.pre('save', function(next) {
  if (this.isNew) {
    this.medicineId = this.medicineId || `MED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Static methods
medicineSchema.statics.findByTenant = function(tenantId, filters = {}) {
  return this.find({ tenantId, isActive: true, ...filters });
};

medicineSchema.statics.searchMedicines = function(tenantId, searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    tenantId,
    isActive: true,
    $or: [
      { name: regex },
      { genericName: regex },
      { brandName: regex }
    ]
  });
};

// Instance methods
medicineSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Medicine', medicineSchema);