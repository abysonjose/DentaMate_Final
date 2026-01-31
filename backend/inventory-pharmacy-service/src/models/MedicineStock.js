const mongoose = require('mongoose');

const medicineStockSchema = new mongoose.Schema({
  stockId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  medicineId: {
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
  batchNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  availableQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  expiryDate: {
    type: Date,
    required: true,
    index: true
  },
  manufacturingDate: {
    type: Date,
    required: true
  },
  receivedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  vendorId: {
    type: String,
    required: true,
    index: true
  },
  purchaseOrderId: {
    type: String,
    index: true
  },
  location: {
    shelf: String,
    rack: String,
    position: String
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'damaged', 'recalled', 'reserved'],
    default: 'active',
    index: true
  },
  qualityCheck: {
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed'],
      default: 'pending'
    },
    checkedBy: String,
    checkedDate: Date,
    notes: String
  },
  alerts: [{
    type: {
      type: String,
      enum: ['low_stock', 'expiry_warning', 'expired', 'quality_issue']
    },
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: String,
    acknowledgedAt: Date
  }],
  movements: [{
    type: {
      type: String,
      enum: ['received', 'dispensed', 'adjusted', 'returned', 'damaged', 'expired']
    },
    quantity: Number,
    reason: String,
    reference: String, // prescription ID, adjustment ID, etc.
    performedBy: {
      userId: String,
      role: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true,
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

// Compound indexes for performance
medicineStockSchema.index({ tenantId: 1, branchId: 1, medicineId: 1 });
medicineStockSchema.index({ tenantId: 1, branchId: 1, status: 1 });
medicineStockSchema.index({ tenantId: 1, branchId: 1, expiryDate: 1 });
medicineStockSchema.index({ tenantId: 1, branchId: 1, batchNumber: 1 });
medicineStockSchema.index({ expiryDate: 1, status: 1 }); // For expiry alerts

// Virtual for days until expiry
medicineStockSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
medicineStockSchema.virtual('isExpired').get(function() {
  return new Date() > new Date(this.expiryDate);
});

// Virtual for is near expiry
medicineStockSchema.virtual('isNearExpiry').get(function() {
  const daysUntilExpiry = this.daysUntilExpiry;
  const alertDays = parseInt(process.env.EXPIRY_ALERT_DAYS) || 30;
  return daysUntilExpiry <= alertDays && daysUntilExpiry > 0;
});

// Pre-save middleware
medicineStockSchema.pre('save', function(next) {
  if (this.isNew) {
    this.stockId = this.stockId || `STK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Calculate available quantity
  this.availableQuantity = Math.max(0, this.quantity - this.reservedQuantity);
  
  // Calculate total cost
  this.totalCost = this.quantity * this.unitCost;
  
  // Update status based on expiry
  if (this.isExpired && this.status === 'active') {
    this.status = 'expired';
  }
  
  next();
});

// Static methods
medicineStockSchema.statics.findByBranch = function(tenantId, branchId, filters = {}) {
  return this.find({ 
    tenantId, 
    branchId, 
    isActive: true,
    ...filters 
  });
};

medicineStockSchema.statics.findActiveBatches = function(tenantId, branchId, medicineId) {
  return this.find({
    tenantId,
    branchId,
    medicineId,
    status: 'active',
    isActive: true,
    quantity: { $gt: 0 }
  }).sort({ expiryDate: 1 }); // FIFO - First to expire first
};

medicineStockSchema.statics.getTotalStock = function(tenantId, branchId, medicineId) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        branchId,
        medicineId,
        status: 'active',
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: '$quantity' },
        totalAvailable: { $sum: '$availableQuantity' },
        totalReserved: { $sum: '$reservedQuantity' },
        totalValue: { $sum: '$totalCost' },
        batchCount: { $sum: 1 }
      }
    }
  ]);
};

medicineStockSchema.statics.getExpiringStock = function(tenantId, branchId, days = 30) {
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + days);
  
  return this.find({
    tenantId,
    branchId,
    status: 'active',
    isActive: true,
    expiryDate: { $lte: alertDate, $gt: new Date() }
  }).sort({ expiryDate: 1 });
};

medicineStockSchema.statics.getLowStock = function(tenantId, branchId) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        branchId,
        status: 'active',
        isActive: true
      }
    },
    {
      $group: {
        _id: '$medicineId',
        totalQuantity: { $sum: '$quantity' },
        totalAvailable: { $sum: '$availableQuantity' }
      }
    },
    {
      $lookup: {
        from: 'medicines',
        localField: '_id',
        foreignField: 'medicineId',
        as: 'medicine'
      }
    },
    {
      $unwind: '$medicine'
    },
    {
      $match: {
        $expr: {
          $lt: ['$totalAvailable', '$medicine.minimumStockLevel']
        }
      }
    }
  ]);
};

// Instance methods
medicineStockSchema.methods.reserveStock = function(quantity) {
  if (this.availableQuantity < quantity) {
    throw new Error('Insufficient stock available for reservation');
  }
  
  this.reservedQuantity += quantity;
  this.availableQuantity = this.quantity - this.reservedQuantity;
  return this.save();
};

medicineStockSchema.methods.releaseReservation = function(quantity) {
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  this.availableQuantity = this.quantity - this.reservedQuantity;
  return this.save();
};

medicineStockSchema.methods.dispenseStock = function(quantity, reason, reference, user) {
  if (this.availableQuantity < quantity) {
    throw new Error('Insufficient stock available for dispensing');
  }
  
  this.quantity -= quantity;
  this.availableQuantity = this.quantity - this.reservedQuantity;
  
  // Add movement record
  this.movements.push({
    type: 'dispensed',
    quantity: -quantity,
    reason,
    reference,
    performedBy: {
      userId: user.userId,
      role: user.role
    }
  });
  
  return this.save();
};

medicineStockSchema.methods.addMovement = function(type, quantity, reason, reference, user) {
  this.movements.push({
    type,
    quantity,
    reason,
    reference,
    performedBy: {
      userId: user.userId,
      role: user.role
    }
  });
  
  return this.save();
};

medicineStockSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('MedicineStock', medicineStockSchema);