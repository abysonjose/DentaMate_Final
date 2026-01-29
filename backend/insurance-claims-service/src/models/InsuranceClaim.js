const mongoose = require('mongoose');

const insuranceClaimSchema = new mongoose.Schema({
  claimId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  claimNumber: {
    type: String,
    required: true,
    unique: true
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
  patientId: {
    type: String,
    required: true,
    index: true
  },
  policyId: {
    type: String,
    required: true,
    ref: 'InsurancePolicy'
  },
  invoiceId: {
    type: String,
    required: true,
    index: true
  },
  appointmentId: String,
  doctorId: String,
  insurer: {
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true
    },
    contactInfo: {
      phone: String,
      email: String,
      claimSubmissionUrl: String
    }
  },
  treatmentDetails: {
    treatmentDate: {
      type: Date,
      required: true
    },
    treatmentType: {
      type: String,
      required: true
    },
    treatmentCodes: [{
      code: String,
      description: String,
      amount: Number
    }],
    diagnosis: String,
    treatmentSummary: String,
    doctorNotes: String
  },
  financialDetails: {
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    claimAmount: {
      type: Number,
      required: true,
      min: 0
    },
    approvedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    settledAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    patientPayableAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    deductibleAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    coPaymentAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  status: {
    type: String,
    enum: [
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'PARTIALLY_APPROVED',
      'REJECTED',
      'SETTLED',
      'CANCELLED'
    ],
    default: 'DRAFT',
    index: true
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: String,
    notes: String,
    insurerRemarks: String
  }],
  submissionDetails: {
    submittedAt: Date,
    submittedBy: String,
    submissionMethod: {
      type: String,
      enum: ['manual', 'api', 'portal', 'email']
    },
    submissionReference: String,
    acknowledgmentNumber: String
  },
  reviewDetails: {
    reviewStartDate: Date,
    reviewEndDate: Date,
    reviewerName: String,
    reviewNotes: String,
    requestedDocuments: [String]
  },
  approvalDetails: {
    approvedAt: Date,
    approvedBy: String,
    approvalReference: String,
    approvalNotes: String,
    partialApprovalReason: String
  },
  rejectionDetails: {
    rejectedAt: Date,
    rejectionReason: String,
    rejectionCode: String,
    rejectionNotes: String,
    appealDeadline: Date,
    canResubmit: {
      type: Boolean,
      default: true
    }
  },
  settlementDetails: {
    settledAt: Date,
    settlementReference: String,
    settlementMethod: {
      type: String,
      enum: ['bank_transfer', 'check', 'direct_payment', 'adjustment']
    },
    settlementNotes: String
  },
  documents: [{
    documentId: String,
    documentType: {
      type: String,
      enum: [
        'invoice',
        'treatment_summary',
        'diagnostic_report',
        'xray',
        'prescription',
        'lab_report',
        'supporting_document',
        'correspondence',
        'other'
      ]
    },
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: String,
    version: {
      type: Number,
      default: 1
    },
    isRequired: {
      type: Boolean,
      default: false
    }
  }],
  resubmissionHistory: [{
    resubmittedAt: Date,
    resubmittedBy: String,
    resubmissionReason: String,
    previousStatus: String,
    changesMode: String
  }],
  followUpReminders: [{
    reminderDate: Date,
    reminderType: {
      type: String,
      enum: ['status_check', 'document_request', 'settlement_follow_up']
    },
    reminderNotes: String,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [String],
  internalNotes: String,
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'insurance_claims'
});

// Indexes for performance
insuranceClaimSchema.index({ tenantId: 1, branchId: 1 });
insuranceClaimSchema.index({ patientId: 1, status: 1 });
insuranceClaimSchema.index({ invoiceId: 1 });
insuranceClaimSchema.index({ 'insurer.code': 1, status: 1 });
insuranceClaimSchema.index({ createdAt: -1 });
insuranceClaimSchema.index({ 'submissionDetails.submittedAt': -1 });

// Virtual for calculating patient payable amount
insuranceClaimSchema.virtual('calculatedPatientPayable').get(function() {
  const total = this.financialDetails.totalAmount;
  const approved = this.financialDetails.approvedAmount;
  const deductible = this.financialDetails.deductibleAmount;
  const coPayment = this.financialDetails.coPaymentAmount;
  
  return Math.max(0, total - approved + deductible + coPayment);
});

// Method to add status history entry
insuranceClaimSchema.methods.addStatusHistory = function(status, updatedBy, notes = '', insurerRemarks = '') {
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    updatedBy,
    notes,
    insurerRemarks
  });
  this.status = status;
  this.updatedBy = updatedBy;
};

// Method to check if claim can be resubmitted
insuranceClaimSchema.methods.canResubmit = function() {
  return this.status === 'REJECTED' && 
         this.rejectionDetails && 
         this.rejectionDetails.canResubmit;
};

// Method to calculate days since submission
insuranceClaimSchema.methods.daysSinceSubmission = function() {
  if (!this.submissionDetails.submittedAt) return 0;
  
  const now = new Date();
  const submitted = new Date(this.submissionDetails.submittedAt);
  const diffTime = Math.abs(now - submitted);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to check if claim needs follow-up
insuranceClaimSchema.methods.needsFollowUp = function() {
  const daysSince = this.daysSinceSubmission();
  const status = this.status;
  
  if (status === 'SUBMITTED' && daysSince > 7) return true;
  if (status === 'UNDER_REVIEW' && daysSince > 14) return true;
  if (status === 'APPROVED' && daysSince > 30) return true;
  
  return false;
};

// Pre-save middleware
insuranceClaimSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate patient payable amount
  if (this.isModified('financialDetails')) {
    this.financialDetails.patientPayableAmount = this.calculatedPatientPayable;
  }
  
  // Generate claim number if not exists
  if (!this.claimNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.claimNumber = `CLM-${year}${month}-${random}`;
  }
  
  next();
});

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);