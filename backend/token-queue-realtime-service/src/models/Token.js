const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  tokenNumber: {
    type: String,
    required: true
  },
  tokenType: {
    type: String,
    enum: ['APPOINTMENT', 'WALK_IN', 'PRIORITY'],
    required: true
  },
  status: {
    type: String,
    enum: ['GENERATED', 'WAITING', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'NO_SHOW'],
    default: 'GENERATED'
  },
  patientId: {
    type: String,
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientPhone: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  departmentId: {
    type: String,
    required: true
  },
  departmentName: {
    type: String,
    required: true
  },
  branchId: {
    type: String,
    required: true
  },
  tenantId: {
    type: String,
    required: true
  },
  appointmentId: {
    type: String,
    sparse: true // Only for appointment tokens
  },
  scheduledTime: {
    type: Date,
    sparse: true // Only for appointment tokens
  },
  estimatedWaitTime: {
    type: Number, // in minutes
    default: 0
  },
  queuePosition: {
    type: Number,
    default: 0
  },
  checkedInAt: {
    type: Date
  },
  consultationStartedAt: {
    type: Date
  },
  consultationEndedAt: {
    type: Date
  },
  skipReason: {
    type: String
  },
  skipCount: {
    type: Number,
    default: 0
  },
  qrCode: {
    type: String // Base64 encoded QR code
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
tokenSchema.index({ branchId: 1, doctorId: 1, createdAt: -1 });
tokenSchema.index({ tenantId: 1, branchId: 1, status: 1 });
tokenSchema.index({ patientId: 1, createdAt: -1 });
tokenSchema.index({ appointmentId: 1 }, { sparse: true });
tokenSchema.index({ tokenNumber: 1, branchId: 1, createdAt: 1 }, { unique: true });

// Virtual for queue identifier
tokenSchema.virtual('queueId').get(function() {
  return `${this.branchId}_${this.doctorId}`;
});

// Virtual for formatted token display
tokenSchema.virtual('displayToken').get(function() {
  const prefix = this.tokenType === 'PRIORITY' ? 'P' : 
                 this.tokenType === 'WALK_IN' ? 'W' : 'A';
  return `${prefix}${this.tokenNumber}`;
});

// Methods
tokenSchema.methods.updateStatus = function(newStatus, metadata = {}) {
  this.status = newStatus;
  
  switch(newStatus) {
    case 'CHECKED_IN':
      this.checkedInAt = new Date();
      break;
    case 'IN_CONSULTATION':
      this.consultationStartedAt = new Date();
      break;
    case 'COMPLETED':
      this.consultationEndedAt = new Date();
      break;
  }
  
  // Update metadata
  Object.keys(metadata).forEach(key => {
    this.metadata.set(key, metadata[key]);
  });
  
  return this.save();
};

tokenSchema.methods.skip = function(reason) {
  this.status = 'SKIPPED';
  this.skipReason = reason;
  this.skipCount += 1;
  return this.save();
};

// Static methods
tokenSchema.statics.generateTokenNumber = async function(branchId, doctorId, tokenType) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get the last token number for today
  const lastToken = await this.findOne({
    branchId,
    doctorId,
    tokenType,
    createdAt: { $gte: today, $lt: tomorrow }
  }).sort({ createdAt: -1 });
  
  let nextNumber = 1;
  if (lastToken) {
    const lastNumber = parseInt(lastToken.tokenNumber.replace(/\D/g, ''));
    nextNumber = lastNumber + 1;
  }
  
  return nextNumber.toString().padStart(3, '0');
};

tokenSchema.statics.getQueueTokens = function(branchId, doctorId, statuses = []) {
  const query = { branchId, doctorId };
  
  if (statuses.length > 0) {
    query.status = { $in: statuses };
  }
  
  return this.find(query)
    .sort({ 
      tokenType: 1, // APPOINTMENT first, then WALK_IN, then PRIORITY
      scheduledTime: 1, 
      createdAt: 1 
    });
};

module.exports = mongoose.model('Token', tokenSchema);