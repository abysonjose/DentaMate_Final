const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password required if not Google OAuth
    }
  },
  googleId: String,
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: [
      'patient', 'doctor', 'nurse', 'head-nurse', 'orthotist',
      'lab-assistant', 'pharmacist', 'receptionist', 'support-staff',
      'billing-officer', 'cashier', 'accountant', 'accounts-manager',
      'payroll-officer', 'insurance', 'hr', 'branch-admin',
      'central-admin', 'saas-admin'
    ],
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  permissions: [{
    resource: String,
    actions: [String]
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);