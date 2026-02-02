const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const staffAuditLogSchema = new mongoose.Schema({
  auditId: {
    type: String,
    required: true,
    unique: true,
    default: () => `audit_${uuidv4()}`
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    enum: ['STAFF', 'ROLE', 'PERMISSION', 'SYSTEM'],
    index: true
  },
  entityId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Staff actions
      'STAFF_CREATED',
      'STAFF_UPDATED',
      'STAFF_DEACTIVATED',
      'STAFF_ACTIVATED',
      'STAFF_TERMINATED',
      'STAFF_TRANSFERRED',
      'STAFF_LOGIN',
      'STAFF_LOGOUT',
      'STAFF_PASSWORD_CHANGED',
      'STAFF_PROFILE_UPDATED',
      
      // Role actions
      'ROLE_ASSIGNED',
      'ROLE_REMOVED',
      'ROLE_UPDATED',
      'ROLE_CREATED',
      'ROLE_DELETED',
      
      // Permission actions
      'PERMISSION_GRANTED',
      'PERMISSION_REVOKED',
      'PERMISSION_UPDATED',
      
      // System actions
      'SYSTEM_ACCESS',
      'SYSTEM_CONFIGURATION_CHANGED',
      'DATA_EXPORT',
      'DATA_IMPORT',
      'BULK_OPERATION'
    ],
    index: true
  },
  performedBy: {
    userId: {
      type: String,
      required: true
    },
    staffId: {
      type: String
    },
    userEmail: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    }
  },
  targetStaff: {
    staffId: {
      type: String
    },
    staffName: {
      type: String
    },
    staffEmail: {
      type: String
    },
    staffRole: {
      type: String
    }
  },
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    },
    fields: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }]
  },
  metadata: {
    reason: {
      type: String,
      trim: true
    },
    comments: {
      type: String,
      trim: true
    },
    requestId: {
      type: String
    },
    sessionId: {
      type: String
    },
    source: {
      type: String,
      enum: ['WEB', 'MOBILE', 'API', 'SYSTEM', 'IMPORT'],
      default: 'WEB'
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    category: {
      type: String,
      enum: ['SECURITY', 'COMPLIANCE', 'OPERATIONAL', 'ADMINISTRATIVE'],
      default: 'OPERATIONAL'
    }
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  collection: 'staff_audit_logs'
});

// Indexes
staffAuditLogSchema.index({ tenantId: 1, timestamp: -1 });
staffAuditLogSchema.index({ entityId: 1, timestamp: -1 });
staffAuditLogSchema.index({ action: 1, timestamp: -1 });
staffAuditLogSchema.index({ 'performedBy.userId': 1, timestamp: -1 });
staffAuditLogSchema.index({ 'targetStaff.staffId': 1, timestamp: -1 });
staffAuditLogSchema.index({ 'metadata.severity': 1, timestamp: -1 });
staffAuditLogSchema.index({ 'metadata.category': 1, timestamp: -1 });

// Compound indexes for common queries
staffAuditLogSchema.index({ tenantId: 1, entityType: 1, timestamp: -1 });
staffAuditLogSchema.index({ tenantId: 1, action: 1, timestamp: -1 });

// Static methods
staffAuditLogSchema.statics.logAction = async function(auditData) {
  try {
    // Set expiration date based on retention policy
    const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS) || 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    const auditLog = new this({
      ...auditData,
      expiresAt
    });

    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    throw error;
  }
};

staffAuditLogSchema.statics.logStaffCreation = function(staffData, performedBy, metadata = {}) {
  return this.logAction({
    tenantId: staffData.tenantId,
    branchId: staffData.branchId,
    entityType: 'STAFF',
    entityId: staffData.staffId,
    action: 'STAFF_CREATED',
    performedBy,
    targetStaff: {
      staffId: staffData.staffId,
      staffName: `${staffData.personalInfo.firstName} ${staffData.personalInfo.lastName}`,
      staffEmail: staffData.personalInfo.email,
      staffRole: staffData.roles.map(r => r.roleName).join(', ')
    },
    changes: {
      after: staffData
    },
    metadata: {
      ...metadata,
      severity: 'MEDIUM',
      category: 'ADMINISTRATIVE'
    }
  });
};

staffAuditLogSchema.statics.logStaffUpdate = function(staffId, oldData, newData, performedBy, metadata = {}) {
  const changes = this.calculateChanges(oldData, newData);
  
  return this.logAction({
    tenantId: newData.tenantId,
    branchId: newData.branchId,
    entityType: 'STAFF',
    entityId: staffId,
    action: 'STAFF_UPDATED',
    performedBy,
    targetStaff: {
      staffId: staffId,
      staffName: `${newData.personalInfo.firstName} ${newData.personalInfo.lastName}`,
      staffEmail: newData.personalInfo.email
    },
    changes: {
      before: oldData,
      after: newData,
      fields: changes
    },
    metadata: {
      ...metadata,
      severity: 'LOW',
      category: 'OPERATIONAL'
    }
  });
};

staffAuditLogSchema.statics.logRoleAssignment = function(staffData, roleData, performedBy, metadata = {}) {
  return this.logAction({
    tenantId: staffData.tenantId,
    branchId: staffData.branchId,
    entityType: 'ROLE',
    entityId: roleData.roleId,
    action: 'ROLE_ASSIGNED',
    performedBy,
    targetStaff: {
      staffId: staffData.staffId,
      staffName: `${staffData.personalInfo.firstName} ${staffData.personalInfo.lastName}`,
      staffEmail: staffData.personalInfo.email
    },
    changes: {
      after: {
        roleId: roleData.roleId,
        roleName: roleData.roleName,
        assignedAt: new Date()
      }
    },
    metadata: {
      ...metadata,
      severity: 'MEDIUM',
      category: 'SECURITY'
    }
  });
};

staffAuditLogSchema.statics.logStaffDeactivation = function(staffData, reason, performedBy, metadata = {}) {
  return this.logAction({
    tenantId: staffData.tenantId,
    branchId: staffData.branchId,
    entityType: 'STAFF',
    entityId: staffData.staffId,
    action: 'STAFF_DEACTIVATED',
    performedBy,
    targetStaff: {
      staffId: staffData.staffId,
      staffName: `${staffData.personalInfo.firstName} ${staffData.personalInfo.lastName}`,
      staffEmail: staffData.personalInfo.email
    },
    changes: {
      before: { employmentStatus: 'ACTIVE' },
      after: { employmentStatus: 'INACTIVE' }
    },
    metadata: {
      ...metadata,
      reason,
      severity: 'HIGH',
      category: 'ADMINISTRATIVE'
    }
  });
};

staffAuditLogSchema.statics.logSystemAccess = function(staffData, performedBy, metadata = {}) {
  return this.logAction({
    tenantId: staffData.tenantId,
    branchId: staffData.branchId,
    entityType: 'SYSTEM',
    entityId: staffData.staffId,
    action: 'SYSTEM_ACCESS',
    performedBy,
    targetStaff: {
      staffId: staffData.staffId,
      staffName: `${staffData.personalInfo.firstName} ${staffData.personalInfo.lastName}`,
      staffEmail: staffData.personalInfo.email
    },
    metadata: {
      ...metadata,
      severity: 'LOW',
      category: 'SECURITY'
    }
  });
};

// Helper method to calculate changes between objects
staffAuditLogSchema.statics.calculateChanges = function(oldObj, newObj) {
  const changes = [];
  
  function compareObjects(old, newVal, path = '') {
    if (typeof old !== typeof newVal) {
      changes.push({
        field: path,
        oldValue: old,
        newValue: newVal
      });
      return;
    }
    
    if (typeof old === 'object' && old !== null && newVal !== null) {
      const allKeys = new Set([...Object.keys(old), ...Object.keys(newVal)]);
      
      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!(key in old)) {
          changes.push({
            field: currentPath,
            oldValue: undefined,
            newValue: newVal[key]
          });
        } else if (!(key in newVal)) {
          changes.push({
            field: currentPath,
            oldValue: old[key],
            newValue: undefined
          });
        } else {
          compareObjects(old[key], newVal[key], currentPath);
        }
      }
    } else if (old !== newVal) {
      changes.push({
        field: path,
        oldValue: old,
        newValue: newVal
      });
    }
  }
  
  compareObjects(oldObj, newObj);
  return changes;
};

// Query helpers
staffAuditLogSchema.statics.getAuditTrail = function(entityId, options = {}) {
  const query = { entityId };
  
  if (options.tenantId) query.tenantId = options.tenantId;
  if (options.action) query.action = options.action;
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
    if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

staffAuditLogSchema.statics.getSecurityEvents = function(tenantId, options = {}) {
  const query = {
    tenantId,
    'metadata.category': 'SECURITY'
  };
  
  if (options.severity) query['metadata.severity'] = options.severity;
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
    if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 50);
};

module.exports = mongoose.model('StaffAuditLog', staffAuditLogSchema);