const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const staffRoleSchema = new mongoose.Schema({
  roleId: {
    type: String,
    required: true,
    unique: true,
    default: () => `role_${uuidv4()}`
  },
  roleName: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    enum: [
      'DOCTOR',
      'NURSE', 
      'HEAD_NURSE',
      'ORTHOTIST',
      'LAB_ASSISTANT',
      'PHARMACIST',
      'RECEPTIONIST',
      'SUPPORT_STAFF',
      'HR_STAFF',
      'PAYROLL_OFFICER',
      'ACCOUNTANT',
      'ACCOUNTS_MANAGER',
      'BILLING_OFFICER',
      'CASHIER',
      'INSURANCE_OFFICER',
      'BRANCH_ADMIN',
      'CENTRAL_ADMIN',
      'SAAS_ADMIN'
    ]
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  scope: {
    type: String,
    required: true,
    enum: ['GLOBAL', 'TENANT', 'BRANCH', 'DEPARTMENT'],
    default: 'BRANCH'
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 5
  },
  permissions: [{
    resource: {
      type: String,
      required: true,
      enum: [
        'STAFF',
        'PATIENTS',
        'APPOINTMENTS',
        'BILLING',
        'INVENTORY',
        'REPORTS',
        'SETTINGS',
        'AUDIT',
        'NOTIFICATIONS',
        'ANALYTICS',
        'SYSTEM'
      ]
    },
    actions: [{
      type: String,
      enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT']
    }],
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  constraints: {
    maxPerBranch: {
      type: Number,
      default: null // null means unlimited
    },
    maxPerTenant: {
      type: Number,
      default: null
    },
    requiresApproval: {
      type: Boolean,
      default: false
    },
    canAssignRoles: [{
      type: String,
      ref: 'StaffRole'
    }],
    canManageBranches: {
      type: Boolean,
      default: false
    },
    canManageTenants: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  },
  isSystemRole: {
    type: Boolean,
    required: true,
    default: false
  },
  auditInfo: {
    createdBy: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    updatedBy: {
      type: String
    },
    updatedAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  collection: 'staff_roles'
});

// Indexes
staffRoleSchema.index({ roleName: 1 });
staffRoleSchema.index({ scope: 1 });
staffRoleSchema.index({ level: 1 });
staffRoleSchema.index({ isActive: 1 });
staffRoleSchema.index({ isSystemRole: 1 });

// Virtual for role hierarchy
staffRoleSchema.virtual('isHigherThan').get(function() {
  return (otherRole) => {
    return this.level > otherRole.level;
  };
});

// Methods
staffRoleSchema.methods.hasPermission = function(resource, action) {
  const permission = this.permissions.find(p => p.resource === resource);
  return permission && permission.actions.includes(action);
};

staffRoleSchema.methods.canAssignRole = function(roleId) {
  return this.constraints.canAssignRoles.includes(roleId);
};

staffRoleSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  return obj;
};

// Static methods
staffRoleSchema.statics.getByName = function(roleName) {
  return this.findOne({ roleName: roleName.toUpperCase(), isActive: true });
};

staffRoleSchema.statics.getHierarchy = function() {
  return this.find({ isActive: true }).sort({ level: -1 });
};

staffRoleSchema.statics.getRolesByScope = function(scope) {
  return this.find({ scope, isActive: true }).sort({ level: -1 });
};

staffRoleSchema.statics.getAssignableRoles = function(assignerRoleId) {
  return this.findOne({ roleId: assignerRoleId })
    .then(assignerRole => {
      if (!assignerRole) return [];
      return this.find({
        roleId: { $in: assignerRole.constraints.canAssignRoles },
        isActive: true
      });
    });
};

// Pre-save middleware
staffRoleSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.auditInfo.updatedAt = new Date();
  }
  next();
});

// Pre-remove middleware
staffRoleSchema.pre('remove', function(next) {
  // Check if role is assigned to any staff
  const Staff = mongoose.model('Staff');
  Staff.countDocuments({ 'roles.roleId': this.roleId })
    .then(count => {
      if (count > 0) {
        const error = new Error(`Cannot delete role ${this.roleName}. It is assigned to ${count} staff members.`);
        error.code = 'ROLE_IN_USE';
        return next(error);
      }
      next();
    })
    .catch(next);
});

module.exports = mongoose.model('StaffRole', staffRoleSchema);