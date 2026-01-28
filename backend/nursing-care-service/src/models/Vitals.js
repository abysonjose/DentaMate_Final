const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema({
  vitalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  appointmentId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  recordedBy: {
    type: String,
    required: true, // Nurse ID
    index: true
  },
  recordedByName: {
    type: String,
    required: true
  },
  metrics: {
    bloodPressure: {
      systolic: {
        type: Number,
        min: 50,
        max: 300
      },
      diastolic: {
        type: Number,
        min: 30,
        max: 200
      }
    },
    pulse: {
      type: Number,
      min: 30,
      max: 200
    },
    temperature: {
      type: Number,
      min: 90.0,
      max: 110.0 // Fahrenheit
    },
    oxygenSaturation: {
      type: Number,
      min: 70,
      max: 100
    },
    respiratoryRate: {
      type: Number,
      min: 8,
      max: 40
    },
    weight: {
      type: Number,
      min: 0
    },
    height: {
      type: Number,
      min: 0
    }
  },
  notes: {
    type: String,
    maxlength: 500
  },
  recordingType: {
    type: String,
    enum: ['PRE_CONSULTATION', 'POST_PROCEDURE', 'ROUTINE_CHECK'],
    required: true
  },
  isAbnormal: {
    type: Boolean,
    default: false
  },
  abnormalFlags: [{
    metric: String,
    value: mongoose.Schema.Types.Mixed,
    severity: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']
    }
  }],
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'vitals'
});

// Compound indexes for efficient queries
vitalsSchema.index({ tenantId: 1, branchId: 1, patientId: 1, timestamp: -1 });
vitalsSchema.index({ tenantId: 1, appointmentId: 1 });
vitalsSchema.index({ tenantId: 1, recordedBy: 1, timestamp: -1 });
vitalsSchema.index({ tenantId: 1, isAbnormal: 1, timestamp: -1 });

// Pre-save middleware to check for abnormal values
vitalsSchema.pre('save', function(next) {
  const vitals = this;
  const abnormalFlags = [];

  // Check blood pressure
  if (vitals.metrics.bloodPressure) {
    const { systolic, diastolic } = vitals.metrics.bloodPressure;
    if (systolic > 140 || diastolic > 90) {
      abnormalFlags.push({
        metric: 'bloodPressure',
        value: `${systolic}/${diastolic}`,
        severity: systolic > 180 || diastolic > 120 ? 'CRITICAL' : 'HIGH'
      });
    } else if (systolic < 90 || diastolic < 60) {
      abnormalFlags.push({
        metric: 'bloodPressure',
        value: `${systolic}/${diastolic}`,
        severity: 'LOW'
      });
    }
  }

  // Check pulse
  if (vitals.metrics.pulse) {
    if (vitals.metrics.pulse > 100) {
      abnormalFlags.push({
        metric: 'pulse',
        value: vitals.metrics.pulse,
        severity: vitals.metrics.pulse > 120 ? 'HIGH' : 'MODERATE'
      });
    } else if (vitals.metrics.pulse < 60) {
      abnormalFlags.push({
        metric: 'pulse',
        value: vitals.metrics.pulse,
        severity: 'LOW'
      });
    }
  }

  // Check oxygen saturation
  if (vitals.metrics.oxygenSaturation && vitals.metrics.oxygenSaturation < 95) {
    abnormalFlags.push({
      metric: 'oxygenSaturation',
      value: vitals.metrics.oxygenSaturation,
      severity: vitals.metrics.oxygenSaturation < 90 ? 'CRITICAL' : 'HIGH'
    });
  }

  // Check temperature
  if (vitals.metrics.temperature) {
    if (vitals.metrics.temperature > 100.4) {
      abnormalFlags.push({
        metric: 'temperature',
        value: vitals.metrics.temperature,
        severity: vitals.metrics.temperature > 103 ? 'CRITICAL' : 'HIGH'
      });
    } else if (vitals.metrics.temperature < 96) {
      abnormalFlags.push({
        metric: 'temperature',
        value: vitals.metrics.temperature,
        severity: 'LOW'
      });
    }
  }

  vitals.abnormalFlags = abnormalFlags;
  vitals.isAbnormal = abnormalFlags.length > 0;

  next();
});

// Static method to find vitals by appointment
vitalsSchema.statics.findByAppointment = function(tenantId, appointmentId) {
  return this.find({
    tenantId,
    appointmentId,
    isDeleted: false
  }).sort({ timestamp: -1 });
};

// Static method to find vitals by patient
vitalsSchema.statics.findByPatient = function(tenantId, patientId, limit = 10) {
  return this.find({
    tenantId,
    patientId,
    isDeleted: false
  }).sort({ timestamp: -1 }).limit(limit);
};

module.exports = mongoose.model('Vitals', vitalsSchema);