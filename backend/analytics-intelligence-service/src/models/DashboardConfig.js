const mongoose = require('mongoose');

const dashboardConfigSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    required: true,
    enum: ['SAAS_ADMIN', 'CENTRAL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTS_MANAGER', 'DOCTOR'],
    index: true
  },
  dashboardType: {
    type: String,
    required: true,
    enum: ['OPERATIONAL', 'FINANCIAL', 'CLINICAL', 'HR', 'INVENTORY', 'ANALYTICS', 'CUSTOM'],
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  layout: {
    columns: {
      type: Number,
      min: 1,
      max: 12,
      default: 12
    },
    rows: {
      type: Number,
      min: 1,
      default: 6
    },
    responsive: {
      type: Boolean,
      default: true
    }
  },
  widgets: [{
    id: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['KPI', 'CHART', 'TABLE', 'GAUGE', 'MAP', 'TEXT', 'IMAGE', 'IFRAME']
    },
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    position: {
      x: {
        type: Number,
        required: true,
        min: 0
      },
      y: {
        type: Number,
        required: true,
        min: 0
      },
      width: {
        type: Number,
        required: true,
        min: 1,
        max: 12
      },
      height: {
        type: Number,
        required: true,
        min: 1
      }
    },
    config: {
      // KPI Widget Config
      metric: String,
      unit: String,
      format: String,
      threshold: {
        warning: Number,
        critical: Number
      },
      trend: {
        enabled: {
          type: Boolean,
          default: true
        },
        period: {
          type: String,
          enum: ['1H', '24H', '7D', '30D'],
          default: '24H'
        }
      },
      
      // Chart Widget Config
      chartType: {
        type: String,
        enum: ['LINE', 'BAR', 'PIE', 'AREA', 'SCATTER', 'DOUGHNUT', 'RADAR']
      },
      dataSource: {
        type: String,
        enum: ['METRICS', 'CUSTOM_QUERY', 'API_ENDPOINT']
      },
      query: mongoose.Schema.Types.Mixed,
      xAxis: String,
      yAxis: String,
      groupBy: String,
      aggregation: {
        type: String,
        enum: ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN']
      },
      
      // Table Widget Config
      columns: [{
        field: String,
        header: String,
        type: {
          type: String,
          enum: ['TEXT', 'NUMBER', 'DATE', 'CURRENCY', 'PERCENTAGE']
        },
        sortable: {
          type: Boolean,
          default: true
        },
        filterable: {
          type: Boolean,
          default: false
        }
      }],
      pagination: {
        enabled: {
          type: Boolean,
          default: true
        },
        pageSize: {
          type: Number,
          default: 10
        }
      },
      
      // Gauge Widget Config
      minValue: Number,
      maxValue: Number,
      ranges: [{
        min: Number,
        max: Number,
        color: String,
        label: String
      }],
      
      // Common Config
      refreshInterval: {
        type: Number,
        min: 30,
        max: 3600,
        default: 300 // 5 minutes
      },
      filters: [{
        field: String,
        operator: {
          type: String,
          enum: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS', 'IN', 'BETWEEN']
        },
        value: mongoose.Schema.Types.Mixed,
        label: String
      }],
      dateRange: {
        type: {
          type: String,
          enum: ['RELATIVE', 'ABSOLUTE', 'CUSTOM']
        },
        value: String, // e.g., 'last_7_days', '2024-01-01_2024-01-31'
        allowUserOverride: {
          type: Boolean,
          default: true
        }
      },
      branchFilter: {
        enabled: {
          type: Boolean,
          default: false
        },
        allowMultiple: {
          type: Boolean,
          default: true
        },
        defaultBranches: [String]
      }
    },
    styling: {
      backgroundColor: String,
      textColor: String,
      borderColor: String,
      borderWidth: Number,
      borderRadius: Number,
      padding: Number,
      margin: Number,
      fontSize: String,
      fontWeight: String
    },
    permissions: {
      view: [String], // Role names
      edit: [String],
      delete: [String]
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  filters: {
    global: [{
      field: String,
      label: String,
      type: {
        type: String,
        enum: ['DATE_RANGE', 'BRANCH_SELECT', 'DROPDOWN', 'MULTI_SELECT', 'TEXT_INPUT']
      },
      options: [String],
      defaultValue: mongoose.Schema.Types.Mixed,
      required: {
        type: Boolean,
        default: false
      }
    }],
    persistent: {
      type: Boolean,
      default: true
    }
  },
  permissions: {
    view: {
      roles: [String],
      users: [String],
      branches: [String]
    },
    edit: {
      roles: [String],
      users: [String]
    },
    share: {
      roles: [String],
      users: [String]
    }
  },
  settings: {
    autoRefresh: {
      enabled: {
        type: Boolean,
        default: true
      },
      interval: {
        type: Number,
        min: 30,
        max: 3600,
        default: 300
      }
    },
    caching: {
      enabled: {
        type: Boolean,
        default: true
      },
      ttl: {
        type: Number,
        default: 300
      }
    },
    export: {
      enabled: {
        type: Boolean,
        default: true
      },
      formats: [{
        type: String,
        enum: ['PDF', 'PNG', 'CSV', 'EXCEL']
      }]
    },
    sharing: {
      enabled: {
        type: Boolean,
        default: false
      },
      publicAccess: {
        type: Boolean,
        default: false
      }
    }
  },
  metadata: {
    createdBy: {
      userId: String,
      name: String,
      role: String
    },
    lastModifiedBy: {
      userId: String,
      name: String,
      role: String
    },
    version: {
      type: Number,
      default: 1
    },
    tags: [String],
    category: String,
    usage: {
      viewCount: {
        type: Number,
        default: 0
      },
      lastViewed: Date,
      avgLoadTime: Number,
      errorCount: {
        type: Number,
        default: 0
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'dashboardconfigs'
});

// Compound indexes for efficient queries
dashboardConfigSchema.index({ tenantId: 1, role: 1, isActive: 1 });
dashboardConfigSchema.index({ tenantId: 1, dashboardType: 1, isActive: 1 });
dashboardConfigSchema.index({ role: 1, isDefault: 1, isActive: 1 });

// Virtual for widget count
dashboardConfigSchema.virtual('widgetCount').get(function() {
  return this.widgets ? this.widgets.length : 0;
});

// Instance methods
dashboardConfigSchema.methods.addWidget = function(widget) {
  if (!this.widgets) this.widgets = [];
  
  // Generate unique ID if not provided
  if (!widget.id) {
    widget.id = require('uuid').v4();
  }
  
  // Set order if not provided
  if (widget.order === undefined) {
    widget.order = this.widgets.length;
  }
  
  this.widgets.push(widget);
  this.metadata.version += 1;
  return this.save();
};

dashboardConfigSchema.methods.updateWidget = function(widgetId, updates) {
  const widget = this.widgets.id(widgetId);
  if (!widget) {
    throw new Error('Widget not found');
  }
  
  Object.assign(widget, updates);
  this.metadata.version += 1;
  return this.save();
};

dashboardConfigSchema.methods.removeWidget = function(widgetId) {
  this.widgets = this.widgets.filter(widget => widget.id !== widgetId);
  this.metadata.version += 1;
  return this.save();
};

dashboardConfigSchema.methods.reorderWidgets = function(widgetOrders) {
  // widgetOrders is an array of { id, order }
  widgetOrders.forEach(({ id, order }) => {
    const widget = this.widgets.find(w => w.id === id);
    if (widget) {
      widget.order = order;
    }
  });
  
  this.widgets.sort((a, b) => a.order - b.order);
  this.metadata.version += 1;
  return this.save();
};

dashboardConfigSchema.methods.incrementViewCount = function() {
  if (!this.metadata.usage) this.metadata.usage = {};
  this.metadata.usage.viewCount = (this.metadata.usage.viewCount || 0) + 1;
  this.metadata.usage.lastViewed = new Date();
  return this.save();
};

dashboardConfigSchema.methods.updateLoadTime = function(loadTime) {
  if (!this.metadata.usage) this.metadata.usage = {};
  
  const currentAvg = this.metadata.usage.avgLoadTime || 0;
  const viewCount = this.metadata.usage.viewCount || 1;
  
  // Calculate new average
  this.metadata.usage.avgLoadTime = ((currentAvg * (viewCount - 1)) + loadTime) / viewCount;
  
  return this.save();
};

dashboardConfigSchema.methods.incrementErrorCount = function() {
  if (!this.metadata.usage) this.metadata.usage = {};
  this.metadata.usage.errorCount = (this.metadata.usage.errorCount || 0) + 1;
  return this.save();
};

dashboardConfigSchema.methods.clone = function(newName, userId, userName, userRole) {
  const cloned = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    name: newName,
    isDefault: false,
    isSystem: false,
    metadata: {
      ...this.metadata,
      createdBy: {
        userId,
        name: userName,
        role: userRole
      },
      lastModifiedBy: {
        userId,
        name: userName,
        role: userRole
      },
      version: 1,
      usage: {
        viewCount: 0,
        errorCount: 0
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return cloned.save();
};

// Static methods
dashboardConfigSchema.statics.findByTenantAndRole = function(tenantId, role, options = {}) {
  const query = { tenantId, role, isActive: true };
  
  if (options.dashboardType) query.dashboardType = options.dashboardType;
  if (options.isDefault !== undefined) query.isDefault = options.isDefault;
  
  return this.find(query)
    .sort({ isDefault: -1, name: 1 })
    .limit(options.limit || 50);
};

dashboardConfigSchema.statics.getDefaultDashboard = function(tenantId, role, dashboardType = null) {
  const query = { 
    tenantId, 
    role, 
    isDefault: true, 
    isActive: true 
  };
  
  if (dashboardType) query.dashboardType = dashboardType;
  
  return this.findOne(query);
};

dashboardConfigSchema.statics.getSystemDashboards = function(role, dashboardType = null) {
  const query = { 
    isSystem: true, 
    role, 
    isActive: true 
  };
  
  if (dashboardType) query.dashboardType = dashboardType;
  
  return this.find(query).sort({ name: 1 });
};

dashboardConfigSchema.statics.getDashboardUsageStats = function(tenantId, dateRange = {}) {
  const matchStage = { tenantId, isActive: true };
  
  if (dateRange.start || dateRange.end) {
    matchStage.updatedAt = {};
    if (dateRange.start) matchStage.updatedAt.$gte = dateRange.start;
    if (dateRange.end) matchStage.updatedAt.$lte = dateRange.end;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          role: '$role',
          dashboardType: '$dashboardType'
        },
        totalDashboards: { $sum: 1 },
        totalViews: { $sum: '$metadata.usage.viewCount' },
        totalErrors: { $sum: '$metadata.usage.errorCount' },
        avgLoadTime: { $avg: '$metadata.usage.avgLoadTime' },
        avgWidgetCount: { $avg: { $size: '$widgets' } }
      }
    },
    {
      $group: {
        _id: '$_id.role',
        dashboardTypes: {
          $push: {
            type: '$_id.dashboardType',
            totalDashboards: '$totalDashboards',
            totalViews: '$totalViews',
            totalErrors: '$totalErrors',
            avgLoadTime: '$avgLoadTime',
            avgWidgetCount: '$avgWidgetCount'
          }
        },
        totalDashboards: { $sum: '$totalDashboards' },
        totalViews: { $sum: '$totalViews' }
      }
    },
    { $sort: { totalViews: -1 } }
  ]);
};

dashboardConfigSchema.statics.getPopularWidgets = function(tenantId, limit = 10) {
  return this.aggregate([
    { $match: { tenantId, isActive: true } },
    { $unwind: '$widgets' },
    { $match: { 'widgets.isVisible': true } },
    {
      $group: {
        _id: {
          type: '$widgets.type',
          metric: '$widgets.config.metric'
        },
        count: { $sum: 1 },
        avgRefreshInterval: { $avg: '$widgets.config.refreshInterval' },
        dashboards: { $addToSet: '$name' }
      }
    },
    {
      $addFields: {
        dashboardCount: { $size: '$dashboards' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('DashboardConfig', dashboardConfigSchema);