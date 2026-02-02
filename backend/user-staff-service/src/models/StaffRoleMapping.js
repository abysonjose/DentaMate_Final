const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const staffRoleMappingSchema = new mongoose.Schema({
  mappingId: {
    type: String,
    required: true,
    unique: true,
    default: () => `mapping_${uuidv4()}`
  },
  staffId: {
    type: String,
    required: true,
    ref: 'Staff'
  },
  roleId: {
    type: String,
    required: true,
    ref: 'StaffRole'
  },
  roleName: {
    type: String,
    required: true,
    uppercase: true
  },
  tenantId: {
    type: String,
    required: true,
    ref: 'Tenant'
  },
  branchId: {
    type: String,
    required: true,
    ref: 'Branch'
  },
  departmentId: {
    type: String,
    default: null
  },
  assignmentInfo: {
    assignedBy: {
      type: String,
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    assignmentReason: {
      type: String,
      trim: true
    },
    effectiveFrom: {
      type: Date,
      default: Date.now
    },
    effectiveTo: {
      type: Date,
      default: null // null means indefinite
    },
    isTemporary: {
      type: Boolean,
      default: false
    },
    temporaryDuration: {
      type: Number, // in days
      default: null
    }
  },
  permissions: {
    customPermissions: [{
      resource: {
        type: String,
        required: true
      },
      actions: [{
        type: String,
        enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT']
      }],
      conditions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    }],
    restrictedPermissions: [{
      resource: {
        type: String,
        required: true
      },
      actions: [{
        type: String,
        enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT']
      }],
      reason: {
        type: String,
        required: true
      }
    }]
  },
  status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED'],
    default: 'ACTIVE'
  },
  approvalInfo: {
    requiresApproval: {
      type: Boolean,
      default: false
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: function() {
        return this.approvalInfo.requiresApproval ? 'PENDING' : 'APPROVED';
      }
    },
    approvedBy: {
      type: String
    },
    approvedAt: {
      type: Date
    },
    approvalComments: {
      type: String,
      trim: true
    },
    rejectionReason: {
      type: String,
      trim: true
    }
  },
  auditInfo: {
    createdBy: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String
    },
    updatedAt: {
      type: Date
    },
    revokedBy: {
      type: String
    },
    revokedAt: {
      type: Date
    },
    revocationReason: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  collection: 'staff_role_mappings'
});

// Indexes
staffRoleMappingSchema.index({ staffId: 1 });
staffRoleMappingSchema.index({ roleId: 1 });
staffRoleMappingSchema.index({ tenantId: 1, branchId: 1 });
staffRoleMappingSchema.index({ status: 1 });
staffRoleMappingSchema.index({ 'approvalInfo.approvalStatus': 1 });

// Compound indexes
staffRoleMappingSchema.index({ staffId: 1, status: 1 });
staffRoleMappingSchema.index({ tenantId: 1, roleName: 1, status: 1 });
staffRoleMappingSchema.index({ branchId: 1, roleName: 1, status: 1 });

// Virtual fields
staffRoleMappingSchema.virtual('isActive').get(function() {
  return this.status === 'ACTIVE' && 
         this.approvalInfo.approvalStatus === 'APPROVED' &&
         (!this.assignmentInfo.effectiveTo || this.assignmentInfo.effectiveTo > new Date());
});

staffRoleMappingSchema.virtual('isExpired').get(function() {
  return this.assignmentInfo.effectiveTo && this.assignmentInfo.effectiveTo <= new Date();
});

staffRoleMappingSchema.virtual('daysRemaining').get(function() {
  if (!this.assignmentInfo.effectiveTo) return null;
  const today = new Date();
  const effectiveTo = new Date(this.assignmentInfo.effectiveTo);
  const diffTime = effectiveTo - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
staffRoleMappingSchema.methods.activate = function(activatedBy) {
  this.status = 'ACTIVE';
  this.auditInfo.updatedBy = activatedBy;
  this.auditInfo.updatedAt = new Date();
  return this.save();
};

staffRoleMappingSchema.methods.deactivate = function(deactivatedBy, reason) {
  this.status = 'INACTIVE';
  this.auditInfo.updatedBy = deactivatedBy;
  this.auditInfo.updatedAt = new Date();
  if (reason) {
    this.auditInfo.revocationReason = reason;
  }
  return this.save();
};

staffRoleMappingSchema.methods.revoke = function(revokedBy, reason) {
  this.status = 'REVOKED';
  this.auditInfo.revokedBy = revokedBy;
  this.auditInfo.revokedAt = new Date();
  this.auditInfo.revocationReason = reason;
  this.auditInfo.updatedBy = revokedBy;
  this.auditInfo.updatedAt = new Date();
  return this.save();
};

staffRoleMappingSchema.methods.approve = function(approvedBy, comments) {
  this.approvalInfo.approvalStatus = 'APPROVED';
  this.approvalInfo.approvedBy = approvedBy;
  this.approvalInfo.approvedAt = new Date();
  if (comments) {
    this.approvalInfo.approvalComments = comments;
  }
  this.status = 'ACTIVE';
  this.auditInfo.updatedBy = approvedBy;
  this.auditInfo.updatedAt = new Date();
  return this.save();
};

staffRoleMappingSchema.methods.reject = function(rejectedBy, reason) {
  this.approvalInfo.approvalStatus = 'REJECTED';
  this.approvalInfo.rejectionReason = reason;
  this.status = 'INACTIVE';
  this.auditInfo.updatedBy = rejectedBy;
  this.auditInfo.updatedAt = new Date();
  return this.save();
};

staffRoleMappingSchema.methods.extendAssignment = function(newEffectiveTo, extendedBy, reason) {
  this.assignmentInfo.effectiveTo = newEffectiveTo;
  this.assignmentInfo.assignmentReason = reason || this.assignmentInfo.assignmentReason;
  this.auditInfo.updatedBy = extendedBy;
  this.auditInfo.updatedAt = new Date();
  return this.save();
};

staffRoleMappingSchema.methods.hasPermission = function(resource, action) {
  // Check custom permissions first
  const customPermission = this.permissions.customPermissions.find(p => p.resource === resource);
  if (customPermission && customPermission.actions.includes(action)) {
    return true;
  }
  
  // Check if permission is restricted
  const restrictedPermission = this.permissions.restrictedPermissions.find(p => p.resource === resource);
  if (restrictedPermission && restrictedPermission.actions.includes(action)) {
    return false;
  }
  
  // Default to role permissions (would need to populate role)
  return null; // Indicates need to check role permissions
};

staffRoleMappingSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  
  return {
    mappingId: obj.mappingId,
    staffId: obj.staffId,
    roleId: obj.roleId,
    roleName: obj.roleName,
    tenantId: obj.tenantId,
    branchId: obj.branchId,
    departmentId: obj.departmentId,
    assignmentInfo: {
      assignedAt: obj.assignmentInfo.assignedAt,
      effectiveFrom: obj.assignmentInfo.effectiveFrom,
      effectiveTo: obj.assignmentInfo.effectiveTo,
      isTemporary: obj.assignmentInfo.isTemporary
    },
    status: obj.status,
    approvalInfo: {
      approvalStatus: obj.approvalInfo.approvalStatus,
      approvedAt: obj.approvalInfo.approvedAt
    },
    isActive: this.isActive,
    isExpired: this.isExpired,
    daysRemaining: this.daysRemaining
  };
};

// Static methods
staffRoleMappingSchema.statics.findActiveByStaff = function(staffId) {
  return this.find({
    staffId,
    status: 'ACTIVE',
    'approvalInfo.approvalStatus': 'APPROVED'
  }).populate('roleId');
};

staffRoleMappingSchema.statics.findByRole = function(roleName, options = {}) {
  const query = { 
    roleName: roleName.toUpperCase(),
    status: 'ACTIVE',
    'approvalInfo.approvalStatus': 'APPROVED'
  };
  
  if (options.tenantId) query.tenantId = options.tenantId;
  if (options.branchId) query.branchId = options.branchId;
  
  return this.find(query);
};

staffRoleMappingSchema.statics.findPendingApprovals = function(tenantId, branchId) {
  const query = {
    'approvalInfo.approvalStatus': 'PENDING'
  };
  
  if (tenantId) query.tenantId = tenantId;
  if (branchId) query.branchId = branchId;
  
  return this.find(query).populate('staffId roleId');
};

staffRoleMappingSchema.statics.findExpiringAssignments = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'ACTIVE',
    'assignmentInfo.effectiveTo': { $lte: futureDate, $gt: new Date() }
  }).populate('staffId roleId');
};

// Pre-save middleware
staffRoleMappingSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.auditInfo.updatedAt = new Date();
  }
  
  // Auto-expire if past effective date
  if (this.assignmentInfo.effectiveTo && this.assignmentInfo.effectiveTo <= new Date() && this.status === 'ACTIVE') {
    this.status = 'EXPIRED';
  }
  
  next();
});

// Pre-find middleware to auto-update expired assignments
staffRoleMappingSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function() {
  // Update expired assignments
  this.updateMany(
    {
      status: 'ACTIVE',
      'assignmentInfo.effectiveTo': { $lte: new Date() }
    },
    {
      $set: { status: 'EXPIRED' }
    }
  );
});

module.exports = mongoose.model('StaffRoleMapping', staffRoleMappingSchema);