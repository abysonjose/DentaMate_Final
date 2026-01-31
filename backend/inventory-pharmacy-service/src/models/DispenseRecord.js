const mongoose = require('mongoose');

const dispenseRecordSchema = new mongoose.Schema({
  dispenseId: {
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
  branchId: {
    type: String,
    required: true,
    index: true
  },
  prescriptionId: {
    type: String,
    required: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  doctorId: {
    type: String,
    required: true,
    index: true
  },
  medicines: [{
    medicineId: {
      type: String,
      required: true
    },
    medicineName: {
      type: String,
      required: true
    },
    strength: String,
    form: String,
    quantityPrescribed: {
      type: Number,
      required: true,
      min: 1
    },
    quantityDispensed: {
      type: Number,
      required: true,
      min: 1
    },
    dosageInstructions: String,
    batches: [{
      stockId: {
        type: String,
        required: true
      },
      batchNumber: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      expiryDate: Date,
      unitCost: Number
    }],
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    substituted: {
      type: Boolean,
      default: false
    },
    substitutionReason: String,
    originalMedicineId: String
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'cleared', 'failed'],
    required: true,
    index: true
  },
  paymentReference: String,
  billingId: String,
  dispensedBy: {
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: ['pharmacist', 'pharmacy_assistant']
    }
  },
  verifiedBy: {
    userId: String,
    name: String,
    role: String,
    verifiedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'dispensed', 'partially_dispensed', 'cancelled', 'returned'],
    default: 'pending',
    index: true
  },
  dispensingNotes: String,
  patientInstructions: String,
  counselingProvided: {
    type: Boolean,
    default: false
  },
  counselingNotes: String,
  returnDetails: {
    returnId: String,
    returnedAt: Date,
    returnedBy: {
      userId: String,
      name: String,
      role: String
    },
    reason: String,
    returnedMedicines: [{
      medicineId: String,
      quantity: Number,
      condition: {
        type: String,
        enum: ['unopened', 'opened', 'damaged']
      }
    }],
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'rejected']
    }
  },
  qualityChecks: [{
    checkType: {
      type: String,
      enum: ['expiry_check', 'batch_verification', 'quantity_verification', 'labeling_check']
    },
    status: {
      type: String,
      enum: ['passed', 'failed', 'warning']
    },
    notes: String,
    checkedBy: String,
    checkedAt: {
      type: Date,
      default: Date.now
    }
  }],
  auditTrail: [{
    action: {
      type: String,
      enum: ['created', 'dispensed', 'verified', 'cancelled', 'returned', 'modified']
    },
    performedBy: {
      userId: String,
      role: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    previousValues: mongoose.Schema.Types.Mixed
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes for performance
dispenseRecordSchema.index({ tenantId: 1, branchId: 1, status: 1 });
dispenseRecordSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
dispenseRecordSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });
dispenseRecordSchema.index({ tenantId: 1, doctorId: 1, createdAt: -1 });
dispenseRecordSchema.index({ 'dispensedBy.userId': 1, createdAt: -1 });
dispenseRecordSchema.index({ paymentStatus: 1, status: 1 });

// Virtual for total medicines count
dispenseRecordSchema.virtual('totalMedicinesCount').get(function() {
  return this.medicines.reduce((total, med) => total + med.quantityDispensed, 0);
});

// Virtual for is fully dispensed
dispenseRecordSchema.virtual('isFullyDispensed').get(function() {
  return this.medicines.every(med => med.quantityDispensed >= med.quantityPrescribed);
});

// Virtual for dispensing completion percentage
dispenseRecordSchema.virtual('completionPercentage').get(function() {
  const totalPrescribed = this.medicines.reduce((total, med) => total + med.quantityPrescribed, 0);
  const totalDispensed = this.medicines.reduce((total, med) => total + med.quantityDispensed, 0);
  return totalPrescribed > 0 ? Math.round((totalDispensed / totalPrescribed) * 100) : 0;
});

// Pre-save middleware
dispenseRecordSchema.pre('save', function(next) {
  if (this.isNew) {
    this.dispenseId = this.dispenseId || `DISP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Calculate total amount
  this.totalAmount = this.medicines.reduce((total, med) => total + med.totalCost, 0);
  
  // Update status based on dispensing completion
  if (this.status === 'pending' && this.medicines.length > 0) {
    const isFullyDispensed = this.medicines.every(med => med.quantityDispensed >= med.quantityPrescribed);
    const isPartiallyDispensed = this.medicines.some(med => med.quantityDispensed > 0);
    
    if (isFullyDispensed) {
      this.status = 'dispensed';
    } else if (isPartiallyDispensed) {
      this.status = 'partially_dispensed';
    }
  }
  
  next();
});

// Static methods
dispenseRecordSchema.statics.findByBranch = function(tenantId, branchId, filters = {}) {
  return this.find({ 
    tenantId, 
    branchId, 
    isActive: true,
    ...filters 
  }).sort({ createdAt: -1 });
};

dispenseRecordSchema.statics.findByPatient = function(tenantId, patientId, limit = 50) {
  return this.find({
    tenantId,
    patientId,
    isActive: true
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

dispenseRecordSchema.statics.findByPharmacist = function(tenantId, branchId, pharmacistId, dateRange = {}) {
  const query = {
    tenantId,
    branchId,
    'dispensedBy.userId': pharmacistId,
    isActive: true
  };
  
  if (dateRange.from || dateRange.to) {
    query.createdAt = {};
    if (dateRange.from) query.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) query.createdAt.$lte = new Date(dateRange.to);
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

dispenseRecordSchema.statics.getDispensingStats = function(tenantId, branchId, dateRange = {}) {
  const matchStage = {
    tenantId,
    branchId,
    isActive: true
  };
  
  if (dateRange.from || dateRange.to) {
    matchStage.createdAt = {};
    if (dateRange.from) matchStage.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) matchStage.createdAt.$lte = new Date(dateRange.to);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDispenses: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalMedicines: { 
          $sum: { 
            $sum: '$medicines.quantityDispensed' 
          } 
        },
        statusBreakdown: {
          $push: '$status'
        },
        paymentStatusBreakdown: {
          $push: '$paymentStatus'
        }
      }
    },
    {
      $project: {
        totalDispenses: 1,
        totalAmount: 1,
        totalMedicines: 1,
        averageAmount: { $divide: ['$totalAmount', '$totalDispenses'] },
        statusBreakdown: 1,
        paymentStatusBreakdown: 1
      }
    }
  ]);
};

// Instance methods
dispenseRecordSchema.methods.addAuditEntry = function(action, user, details = '', previousValues = null) {
  this.auditTrail.push({
    action,
    performedBy: {
      userId: user.userId,
      role: user.role
    },
    details,
    previousValues
  });
  
  return this.save();
};

dispenseRecordSchema.methods.markAsDispensed = function(user, notes = '') {
  this.status = 'dispensed';
  this.dispensingNotes = notes;
  
  return this.addAuditEntry('dispensed', user, `Medicines dispensed. ${notes}`);
};

dispenseRecordSchema.methods.markAsVerified = function(user, notes = '') {
  this.verifiedBy = {
    userId: user.userId,
    name: user.name,
    role: user.role,
    verifiedAt: new Date()
  };
  
  return this.addAuditEntry('verified', user, `Dispensing verified. ${notes}`);
};

dispenseRecordSchema.methods.processReturn = function(returnDetails, user) {
  this.status = 'returned';
  this.returnDetails = {
    ...returnDetails,
    returnedAt: new Date(),
    returnedBy: {
      userId: user.userId,
      name: user.name,
      role: user.role
    }
  };
  
  return this.addAuditEntry('returned', user, `Medicines returned. Reason: ${returnDetails.reason}`);
};

dispenseRecordSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('DispenseRecord', dispenseRecordSchema);