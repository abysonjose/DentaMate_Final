const mongoose = require('mongoose');

const restockRequestSchema = new mongoose.Schema({
  requestId: {
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
  requestType: {
    type: String,
    enum: ['manual', 'auto_low_stock', 'auto_expiry', 'emergency'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
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
    currentStock: {
      type: Number,
      required: true,
      min: 0
    },
    minimumRequired: {
      type: Number,
      required: true,
      min: 1
    },
    requestedQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    approvedQuantity: {
      type: Number,
      min: 0
    },
    estimatedCost: {
      type: Number,
      min: 0
    },
    preferredVendorId: String,
    alternateVendorIds: [String],
    urgencyReason: String,
    notes: String
  }],
  vendorId: {
    type: String,
    index: true
  },
  vendorName: String,
  estimatedTotalCost: {
    type: Number,
    min: 0
  },
  approvedTotalCost: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'ordered', 'partially_received', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  approvalWorkflow: [{
    level: {
      type: Number,
      required: true
    },
    approverRole: {
      type: String,
      required: true,
      enum: ['pharmacist', 'branch_admin', 'accounts_manager', 'central_admin']
    },
    approverId: String,
    approverName: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    approvedAt: Date,
    approvedAmount: Number
  }],
  purchaseOrderId: String,
  deliveryDetails: {
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      contactPerson: String,
      contactPhone: String
    },
    deliveryInstructions: String,
    trackingNumber: String
  },
  receivedItems: [{
    medicineId: String,
    receivedQuantity: Number,
    receivedDate: Date,
    batchNumber: String,
    expiryDate: Date,
    condition: {
      type: String,
      enum: ['good', 'damaged', 'expired', 'defective']
    },
    receivedBy: {
      userId: String,
      name: String,
      role: String
    },
    notes: String
  }],
  paymentDetails: {
    paymentTerms: String,
    paymentDueDate: Date,
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'overdue'],
      default: 'pending'
    },
    invoiceNumber: String,
    invoiceDate: Date,
    invoiceAmount: Number,
    paidAmount: Number,
    paymentDate: Date,
    paymentMethod: String,
    paymentReference: String
  },
  qualityCheck: {
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'partial'],
      default: 'pending'
    },
    checkedBy: String,
    checkedDate: Date,
    issues: [{
      medicineId: String,
      issue: String,
      severity: {
        type: String,
        enum: ['minor', 'major', 'critical']
      },
      action: String
    }],
    overallNotes: String
  },
  requestedBy: {
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
      required: true
    }
  },
  approvedBy: {
    userId: String,
    name: String,
    role: String,
    approvedAt: Date
  },
  rejectedBy: {
    userId: String,
    name: String,
    role: String,
    rejectedAt: Date,
    reason: String
  },
  completedBy: {
    userId: String,
    name: String,
    role: String,
    completedAt: Date
  },
  auditTrail: [{
    action: {
      type: String,
      enum: ['created', 'approved', 'rejected', 'ordered', 'received', 'completed', 'cancelled', 'modified']
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
  notes: String,
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedBy: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
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
restockRequestSchema.index({ tenantId: 1, branchId: 1, status: 1 });
restockRequestSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
restockRequestSchema.index({ tenantId: 1, requestType: 1, priority: 1 });
restockRequestSchema.index({ 'requestedBy.userId': 1, createdAt: -1 });
restockRequestSchema.index({ vendorId: 1, status: 1 });

// Virtual for total medicines count
restockRequestSchema.virtual('totalMedicinesCount').get(function() {
  return this.medicines.length;
});

// Virtual for total requested quantity
restockRequestSchema.virtual('totalRequestedQuantity').get(function() {
  return this.medicines.reduce((total, med) => total + med.requestedQuantity, 0);
});

// Virtual for completion percentage
restockRequestSchema.virtual('completionPercentage').get(function() {
  if (this.status === 'completed') return 100;
  if (this.status === 'pending' || this.status === 'approved') return 0;
  
  const totalRequested = this.medicines.reduce((total, med) => total + med.requestedQuantity, 0);
  const totalReceived = this.receivedItems.reduce((total, item) => total + item.receivedQuantity, 0);
  
  return totalRequested > 0 ? Math.round((totalReceived / totalRequested) * 100) : 0;
});

// Virtual for pending approval level
restockRequestSchema.virtual('pendingApprovalLevel').get(function() {
  const pendingApproval = this.approvalWorkflow.find(approval => approval.status === 'pending');
  return pendingApproval ? pendingApproval.level : null;
});

// Pre-save middleware
restockRequestSchema.pre('save', function(next) {
  if (this.isNew) {
    this.requestId = this.requestId || `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Calculate estimated total cost
  this.estimatedTotalCost = this.medicines.reduce((total, med) => total + (med.estimatedCost || 0), 0);
  
  // Calculate approved total cost
  this.approvedTotalCost = this.medicines.reduce((total, med) => {
    const approvedQty = med.approvedQuantity || 0;
    const unitCost = med.estimatedCost ? med.estimatedCost / med.requestedQuantity : 0;
    return total + (approvedQty * unitCost);
  }, 0);
  
  next();
});

// Static methods
restockRequestSchema.statics.findByBranch = function(tenantId, branchId, filters = {}) {
  return this.find({ 
    tenantId, 
    branchId, 
    isActive: true,
    ...filters 
  }).sort({ createdAt: -1 });
};

restockRequestSchema.statics.findPendingRequests = function(tenantId, branchId = null) {
  const query = {
    tenantId,
    status: { $in: ['pending', 'approved', 'ordered'] },
    isActive: true
  };
  
  if (branchId) {
    query.branchId = branchId;
  }
  
  return this.find(query).sort({ priority: -1, createdAt: 1 });
};

restockRequestSchema.statics.findByVendor = function(tenantId, vendorId, dateRange = {}) {
  const query = {
    tenantId,
    vendorId,
    isActive: true
  };
  
  if (dateRange.from || dateRange.to) {
    query.createdAt = {};
    if (dateRange.from) query.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) query.createdAt.$lte = new Date(dateRange.to);
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

restockRequestSchema.statics.getRequestStats = function(tenantId, branchId = null, dateRange = {}) {
  const matchStage = {
    tenantId,
    isActive: true
  };
  
  if (branchId) {
    matchStage.branchId = branchId;
  }
  
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
        totalRequests: { $sum: 1 },
        totalValue: { $sum: '$estimatedTotalCost' },
        statusBreakdown: { $push: '$status' },
        priorityBreakdown: { $push: '$priority' },
        typeBreakdown: { $push: '$requestType' }
      }
    }
  ]);
};

// Instance methods
restockRequestSchema.methods.addAuditEntry = function(action, user, details = '', previousValues = null) {
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

restockRequestSchema.methods.approve = function(user, comments = '', approvedAmount = null) {
  const currentLevel = this.pendingApprovalLevel;
  if (!currentLevel) {
    throw new Error('No pending approval found');
  }
  
  const approval = this.approvalWorkflow.find(a => a.level === currentLevel);
  approval.approverId = user.userId;
  approval.approverName = user.name;
  approval.status = 'approved';
  approval.comments = comments;
  approval.approvedAt = new Date();
  approval.approvedAmount = approvedAmount;
  
  // Check if all approvals are complete
  const allApproved = this.approvalWorkflow.every(a => a.status === 'approved');
  if (allApproved) {
    this.status = 'approved';
    this.approvedBy = {
      userId: user.userId,
      name: user.name,
      role: user.role,
      approvedAt: new Date()
    };
  }
  
  return this.addAuditEntry('approved', user, `Approved at level ${currentLevel}. ${comments}`);
};

restockRequestSchema.methods.reject = function(user, reason) {
  this.status = 'rejected';
  this.rejectedBy = {
    userId: user.userId,
    name: user.name,
    role: user.role,
    rejectedAt: new Date(),
    reason
  };
  
  return this.addAuditEntry('rejected', user, `Request rejected. Reason: ${reason}`);
};

restockRequestSchema.methods.markAsOrdered = function(user, purchaseOrderId, vendorId) {
  this.status = 'ordered';
  this.purchaseOrderId = purchaseOrderId;
  this.vendorId = vendorId;
  
  return this.addAuditEntry('ordered', user, `Purchase order created: ${purchaseOrderId}`);
};

restockRequestSchema.methods.receiveItems = function(receivedItems, user) {
  receivedItems.forEach(item => {
    item.receivedBy = {
      userId: user.userId,
      name: user.name,
      role: user.role
    };
    item.receivedDate = new Date();
    this.receivedItems.push(item);
  });
  
  // Update status based on completion
  const totalRequested = this.medicines.reduce((total, med) => total + med.requestedQuantity, 0);
  const totalReceived = this.receivedItems.reduce((total, item) => total + item.receivedQuantity, 0);
  
  if (totalReceived >= totalRequested) {
    this.status = 'completed';
    this.completedBy = {
      userId: user.userId,
      name: user.name,
      role: user.role,
      completedAt: new Date()
    };
  } else {
    this.status = 'partially_received';
  }
  
  return this.addAuditEntry('received', user, `Received ${receivedItems.length} items`);
};

restockRequestSchema.methods.cancel = function(user, reason) {
  this.status = 'cancelled';
  this.notes = `Cancelled: ${reason}. Previous notes: ${this.notes || ''}`;
  
  return this.addAuditEntry('cancelled', user, `Request cancelled. Reason: ${reason}`);
};

restockRequestSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('RestockRequest', restockRequestSchema);