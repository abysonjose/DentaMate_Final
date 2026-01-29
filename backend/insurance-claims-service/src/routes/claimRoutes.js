const express = require('express');
const ClaimController = require('../controllers/ClaimController');
const { authenticateToken, authorizeRoles, validateTenantAccess } = require('../middleware/auth');
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimiter');
const {
  createClaimSchema,
  updateClaimSchema,
  updateStatusSchema,
  submitClaimSchema,
  resubmitClaimSchema,
  claimIdSchema,
  patientIdSchema,
  invoiceIdSchema,
  claimsQuerySchema
} = require('../validators/claimValidator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(generalLimiter);

// Create insurance claim
router.post('/',
  authorizeRoles('insurance_staff', 'billing_staff', 'branch_admin'),
  validateRequest(createClaimSchema),
  ClaimController.createClaim
);

// Get claim by ID
router.get('/:claimId',
  validateParams(claimIdSchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'billing_staff', 'accounts_manager', 'doctor', 'patient', 'branch_admin'),
  ClaimController.getClaimById
);

// Update claim
router.put('/:claimId',
  strictLimiter,
  validateParams(claimIdSchema),
  validateRequest(updateClaimSchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'branch_admin'),
  ClaimController.updateClaim
);

// Update claim status
router.patch('/:claimId/status',
  strictLimiter,
  validateParams(claimIdSchema),
  validateRequest(updateStatusSchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'branch_admin'),
  ClaimController.updateClaimStatus
);

// Submit claim
router.post('/:claimId/submit',
  strictLimiter,
  validateParams(claimIdSchema),
  validateRequest(submitClaimSchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'branch_admin'),
  ClaimController.submitClaim
);

// Resubmit claim
router.post('/:claimId/resubmit',
  strictLimiter,
  validateParams(claimIdSchema),
  validateRequest(resubmitClaimSchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'branch_admin'),
  ClaimController.resubmitClaim
);

// Get claims by status
router.get('/',
  validateQuery(claimsQuerySchema),
  authorizeRoles('insurance_staff', 'billing_staff', 'accounts_manager', 'branch_admin'),
  ClaimController.getClaimsByStatus
);

// Get claims by patient
router.get('/patient/:patientId',
  validateParams(patientIdSchema),
  validateQuery(claimsQuerySchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'billing_staff', 'doctor', 'patient', 'branch_admin'),
  ClaimController.getClaimsByPatient
);

// Get claims by invoice
router.get('/invoice/:invoiceId',
  validateParams(invoiceIdSchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'billing_staff', 'accounts_manager', 'branch_admin'),
  ClaimController.getClaimsByInvoice
);

// Get claim status history
router.get('/:claimId/history',
  validateParams(claimIdSchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'billing_staff', 'accounts_manager', 'branch_admin'),
  ClaimController.getClaimHistory
);

// Get claims requiring follow-up
router.get('/follow-up/pending',
  authorizeRoles('insurance_staff', 'branch_admin'),
  ClaimController.getClaimsRequiringFollowUp
);

module.exports = router;