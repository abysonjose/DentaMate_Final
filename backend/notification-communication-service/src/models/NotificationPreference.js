const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userType: {
    type: String,
    required: true,
    enum: ['PATIENT', 'DOCTOR', 'NURSE', 'HEAD_NURSE', 'ORTHOTIST', 'LAB_STAFF', 
           'PHARMACIST', 'RECEPTIONIST', 'SUPPORT_STAFF', 'BILLING_OFFICER', 
           'CASHIER', 'ACCOUNTANT', 'PAYROLL_OFFICER', 'HR_STAFF', 'BRANCH_ADMIN', 
           'CENTRAL_ADMIN', 'SAAS_ADMIN']
  },
  branchId: {
    type: String,
    index: true
  },
  globalEnabled: {
    type: Boolean,
    default: true
  },
  channels: {
    SMS: {
      enabled: {
        type: Boolean,
        default: true
      },
      phoneNumber: String,
      verified: {
        type: Boolean,
        default: false
      },
      verifiedAt: Date,
      optInDate: Date,
      optOutDate: Date
    },
    EMAIL: {
      enabled: {
        type: Boolean,
        default: true
      },
      emailAddress: String,
      verified: {
        type: Boolean,
        default: false
      },
      verifiedAt: Date,
      optInDate: Date,
      optOutDate: Date
    },
    WHATSAPP: {
      enabled: {
        type: Boolean,
        default: false
      },
      phoneNumber: String,
      verified: {
        type: Boolean,
        default: false
      },
      verifiedAt: Date,
      optInDate: Date,
      optOutDate: Date
    },
    IN_APP: {
      enabled: {
        type: Boolean,
        default: true
      },
      deviceTokens: [String],
      lastActiveAt: Date
    },
    PUSH: {
      enabled: {
        type: Boolean,
        default: true
      },
      deviceTokens: [{
        token: String,
        platform: {
          type: String,
          enum: ['ios', 'android', 'web']
        },
        registeredAt: {
          type: Date,
          default: Date.now
        }
      }],
      lastActiveAt: Date
    }
  },
  notificationTypes: {
    APPOINTMENT: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        type: [String],
        enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'],
        default: ['SMS', 'EMAIL']
      },
      timing: {
        immediate: {
          type: Boolean,
          default: true
        },
        reminder24h: {
          type: Boolean,
          default: true
        },
        reminder2h: {
          type: Boolean,
          default: true
        }
      }
    },
    BILLING: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        type: [String],
        enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'],
        default: ['EMAIL']
      },
      timing: {
        immediate: {
          type: Boolean,
          default: true
        },
        overdue: {
          type: Boolean,
          default: true
        }
      }
    },
    MEDICAL: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        type: [String],
        enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'],
        default: ['SMS', 'EMAIL', 'IN_APP']
      }
    },
    QUEUE: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        type: [String],
        enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'],
        default: ['SMS', 'IN_APP']
      }
    },
    HR: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        type: [String],
        enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'],
        default: ['EMAIL', 'IN_APP']
      }
    },
    SYSTEM: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        type: [String],
        enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'],
        default: ['EMAIL', 'IN_APP']
      }
    },
    MARKETING: {
      enabled: {
        type: Boolean,
        default: false
      },
      channels: {
        type: [String],
        enum: ['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH'],
        default: ['EMAIL']
      }
    }
  },
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    startTime: {
      type: String,
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '22:00'
    },
    endTime: {
      type: String,
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '08:00'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    excludeUrgent: {
      type: Boolean,
      default: true
    }
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'es', 'fr', 'de', 'hi', 'ar']
  },
  frequency: {
    maxPerDay: {
      type: Number,
      default: 50,
      min: 1,
      max: 100
    },
    maxPerHour: {
      type: Number,
      default: 10,
      min: 1,
      max: 20
    },
    digestMode: {
      enabled: {
        type: Boolean,
        default: false
      },
      frequency: {
        type: String,
        enum: ['HOURLY', 'DAILY', 'WEEKLY'],
        default: 'DAILY'
      },
      time: {
        type: String,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        default: '09:00'
      }
    }
  },
  compliance: {
    consentGiven: {
      type: Boolean,
      default: false
    },
    consentDate: Date,
    consentMethod: {
      type: String,
      enum: ['WEB', 'MOBILE', 'PHONE', 'IN_PERSON', 'EMAIL']
    },
    consentVersion: String,
    dataRetentionDays: {
      type: Number,
      default: 90,
      min: 30,
      max: 2555
    }
  },
  metadata: {
    lastUpdatedBy: String,
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['USER', 'ADMIN', 'SYSTEM', 'IMPORT'],
      default: 'USER'
    }
  }
}, {
  timestamps: true,
  collection: 'notification_preferences'
});

// Compound indexes
notificationPreferenceSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
notificationPreferenceSchema.index({ tenantId: 1, userType: 1 });
notificationPreferenceSchema.index({ tenantId: 1, branchId: 1 });

// Instance methods
notificationPreferenceSchema.methods.isChannelEnabled = function(channel, notificationType = null) {
  if (!this.globalEnabled) return false;
  
  const channelConfig = this.channels[channel];
  if (!channelConfig || !channelConfig.enabled) return false;
  
  if (notificationType) {
    const typeConfig = this.notificationTypes[notificationType];
    if (!typeConfig || !typeConfig.enabled) return false;
    if (!typeConfig.channels.includes(channel)) return false;
  }
  
  return true;
};

notificationPreferenceSchema.methods.isInQuietHours = function(timestamp = new Date()) {
  if (!this.quietHours.enabled) return false;
  
  // Simple time check (can be enhanced with timezone support)
  const hour = timestamp.getHours();
  const minute = timestamp.getMinutes();
  const currentTime = hour * 60 + minute;
  
  const [startHour, startMin] = this.quietHours.startTime.split(':').map(Number);
  const [endHour, endMin] = this.quietHours.endTime.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  if (startTime < endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Quiet hours span midnight
    return currentTime >= startTime || currentTime <= endTime;
  }
};

notificationPreferenceSchema.methods.canReceiveNotification = function(channel, notificationType, priority = 'NORMAL') {
  // Check global and channel settings
  if (!this.isChannelEnabled(channel, notificationType)) return false;
  
  // Check quiet hours (unless urgent and excluded)
  if (this.isInQuietHours() && !(priority === 'URGENT' && this.quietHours.excludeUrgent)) {
    return false;
  }
  
  // Check compliance
  if (this.compliance.consentGiven === false && ['SMS', 'EMAIL', 'WHATSAPP'].includes(channel)) {
    return false;
  }
  
  return true;
};

notificationPreferenceSchema.methods.getPreferredChannels = function(notificationType) {
  if (!this.globalEnabled) return [];
  
  const typeConfig = this.notificationTypes[notificationType];
  if (!typeConfig || !typeConfig.enabled) return [];
  
  return typeConfig.channels.filter(channel => 
    this.channels[channel] && this.channels[channel].enabled
  );
};

notificationPreferenceSchema.methods.updateChannelVerification = function(channel, verified = true) {
  if (this.channels[channel]) {
    this.channels[channel].verified = verified;
    this.channels[channel].verifiedAt = verified ? new Date() : null;
    return this.save();
  }
  return Promise.resolve(this);
};

notificationPreferenceSchema.methods.optIn = function(channel) {
  if (this.channels[channel]) {
    this.channels[channel].enabled = true;
    this.channels[channel].optInDate = new Date();
    this.channels[channel].optOutDate = null;
    return this.save();
  }
  return Promise.resolve(this);
};

notificationPreferenceSchema.methods.optOut = function(channel) {
  if (this.channels[channel]) {
    this.channels[channel].enabled = false;
    this.channels[channel].optOutDate = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Static methods
notificationPreferenceSchema.statics.findByUser = function(tenantId, userId) {
  return this.findOne({ tenantId, userId });
};

notificationPreferenceSchema.statics.createDefault = function(tenantId, userId, userType, options = {}) {
  const defaultPrefs = new this({
    tenantId,
    userId,
    userType,
    branchId: options.branchId,
    ...options
  });
  
  return defaultPrefs.save();
};

notificationPreferenceSchema.statics.bulkUpdatePreferences = function(tenantId, updates) {
  const operations = updates.map(update => ({
    updateOne: {
      filter: { tenantId, userId: update.userId },
      update: { $set: update.preferences },
      upsert: true
    }
  }));
  
  return this.bulkWrite(operations);
};

notificationPreferenceSchema.statics.getChannelStats = function(tenantId) {
  return this.aggregate([
    { $match: { tenantId } },
    {
      $project: {
        smsEnabled: '$channels.SMS.enabled',
        emailEnabled: '$channels.EMAIL.enabled',
        whatsappEnabled: '$channels.WHATSAPP.enabled',
        inAppEnabled: '$channels.IN_APP.enabled',
        pushEnabled: '$channels.PUSH.enabled'
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        smsEnabled: { $sum: { $cond: ['$smsEnabled', 1, 0] } },
        emailEnabled: { $sum: { $cond: ['$emailEnabled', 1, 0] } },
        whatsappEnabled: { $sum: { $cond: ['$whatsappEnabled', 1, 0] } },
        inAppEnabled: { $sum: { $cond: ['$inAppEnabled', 1, 0] } },
        pushEnabled: { $sum: { $cond: ['$pushEnabled', 1, 0] } }
      }
    }
  ]);
};

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);