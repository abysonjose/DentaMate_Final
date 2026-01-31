const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  templateCode: {
    type: String,
    required: true,
    uppercase: true,
    match: /^[A-Z_]+$/,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
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
  channel: {
    type: String,
    required: true,
    enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'],
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['APPOINTMENT', 'BILLING', 'MEDICAL', 'QUEUE', 'HR', 'SYSTEM', 'MARKETING'],
    index: true
  },
  subject: {
    type: String,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  variables: [{
    name: {
      type: String,
      required: true,
      match: /^[a-zA-Z_][a-zA-Z0-9_]*$/
    },
    description: {
      type: String,
      maxlength: 200
    },
    required: {
      type: Boolean,
      default: false
    },
    defaultValue: String,
    format: {
      type: String,
      enum: ['TEXT', 'NUMBER', 'DATE', 'CURRENCY', 'PHONE', 'EMAIL', 'URL']
    }
  }],
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'es', 'fr', 'de', 'hi', 'ar']
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isSystem: {
    type: Boolean,
    default: false,
    index: true
  },
  allowTenantEdit: {
    type: Boolean,
    default: false
  },
  usage: {
    totalSent: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUsed: Date,
    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  validation: {
    maxLength: {
      type: Number,
      min: 1
    },
    requiredVariables: [String],
    allowedChannels: [{
      type: String,
      enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH']
    }]
  },
  branding: {
    senderName: String,
    senderEmail: String,
    logoUrl: String,
    brandColor: String
  },
  scheduling: {
    allowScheduled: {
      type: Boolean,
      default: true
    },
    maxScheduleDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365
    }
  },
  compliance: {
    requiresConsent: {
      type: Boolean,
      default: false
    },
    consentType: {
      type: String,
      enum: ['OPT_IN', 'OPT_OUT', 'EXPLICIT']
    },
    retentionDays: {
      type: Number,
      default: 90,
      min: 1,
      max: 2555 // 7 years
    }
  }
}, {
  timestamps: true,
  collection: 'templates'
});

// Compound indexes
templateSchema.index({ tenantId: 1, templateCode: 1 }, { unique: true });
templateSchema.index({ tenantId: 1, channel: 1, category: 1 });
templateSchema.index({ tenantId: 1, isActive: 1, isSystem: 1 });

// Virtual for compiled content (with variable placeholders)
templateSchema.virtual('compiledContent').get(function() {
  return {
    subject: this.subject,
    content: this.content,
    variables: this.variables.map(v => v.name)
  };
});

// Instance methods
templateSchema.methods.validateVariables = function(providedVariables = {}) {
  const errors = [];
  const requiredVars = this.variables.filter(v => v.required);
  
  for (const reqVar of requiredVars) {
    if (!providedVariables.hasOwnProperty(reqVar.name)) {
      errors.push(`Required variable '${reqVar.name}' is missing`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

templateSchema.methods.renderContent = function(variables = {}) {
  let renderedSubject = this.subject || '';
  let renderedContent = this.content;
  
  // Replace variables in content
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    renderedSubject = renderedSubject.replace(placeholder, value || '');
    renderedContent = renderedContent.replace(placeholder, value || '');
  }
  
  // Replace with default values for missing variables
  for (const variable of this.variables) {
    if (!variables.hasOwnProperty(variable.name) && variable.defaultValue) {
      const placeholder = new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g');
      renderedSubject = renderedSubject.replace(placeholder, variable.defaultValue);
      renderedContent = renderedContent.replace(placeholder, variable.defaultValue);
    }
  }
  
  return {
    subject: renderedSubject,
    content: renderedContent
  };
};

templateSchema.methods.incrementUsage = function() {
  this.usage.totalSent += 1;
  this.usage.lastUsed = new Date();
  return this.save();
};

templateSchema.methods.updateSuccessRate = function(successful, total) {
  if (total > 0) {
    this.usage.successRate = Math.round((successful / total) * 100);
    return this.save();
  }
  return Promise.resolve(this);
};

templateSchema.methods.createVersion = function(updates) {
  const newTemplate = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    version: this.version + 1,
    ...updates,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Deactivate current version
  this.isActive = false;
  
  return Promise.all([
    this.save(),
    newTemplate.save()
  ]);
};

// Static methods
templateSchema.statics.findByTenant = function(tenantId, options = {}) {
  const query = { tenantId, isActive: true };
  if (options.channel) query.channel = options.channel;
  if (options.category) query.category = options.category;
  if (options.isSystem !== undefined) query.isSystem = options.isSystem;
  
  return this.find(query)
    .sort({ category: 1, name: 1 })
    .limit(options.limit || 100);
};

templateSchema.statics.findByCode = function(tenantId, templateCode) {
  return this.findOne({ 
    tenantId, 
    templateCode: templateCode.toUpperCase(), 
    isActive: true 
  });
};

templateSchema.statics.getUsageStats = function(tenantId, dateRange = {}) {
  const match = { tenantId };
  if (dateRange.start || dateRange.end) {
    match['usage.lastUsed'] = {};
    if (dateRange.start) match['usage.lastUsed'].$gte = dateRange.start;
    if (dateRange.end) match['usage.lastUsed'].$lte = dateRange.end;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        totalTemplates: { $sum: 1 },
        totalUsage: { $sum: '$usage.totalSent' },
        avgSuccessRate: { $avg: '$usage.successRate' }
      }
    },
    { $sort: { totalUsage: -1 } }
  ]);
};

templateSchema.statics.findSystemTemplates = function(category = null) {
  const query = { isSystem: true, isActive: true };
  if (category) query.category = category;
  
  return this.find(query).sort({ category: 1, name: 1 });
};

// Pre-save middleware
templateSchema.pre('save', function(next) {
  // Ensure template code is uppercase
  if (this.templateCode) {
    this.templateCode = this.templateCode.toUpperCase();
  }
  
  // Validate content length based on channel
  const maxLengths = {
    SMS: 1600, // Multiple SMS segments
    EMAIL: 5000,
    WHATSAPP: 4096,
    IN_APP: 1000,
    PUSH: 256
  };
  
  if (this.content && this.content.length > maxLengths[this.channel]) {
    return next(new Error(`Content too long for ${this.channel} channel. Max: ${maxLengths[this.channel]} characters`));
  }
  
  next();
});

module.exports = mongoose.model('Template', templateSchema);