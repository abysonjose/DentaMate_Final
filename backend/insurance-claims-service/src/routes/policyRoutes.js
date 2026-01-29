const express = require('express');
const PolicyController = require('../controllers/PolicyController');
const { authenticateToken, authorizeRoles, validateTenantAccess } = require('../middleware/auth');
const { validateRequest, validateQuery, validateParams } = require('../middleware/validation');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimiter');
const {
  createPolicySchema,
  updatePolicySchema,
  verifyPolicySchema,
  policyIdSchema,
  patientIdSchema,
  eligibilityQuerySchema,
  policiesQuerySchema,
  expiringPoliciesQuerySchema
} = require('../validators/policyValidator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(generalLimiter);

// Create insurance policy
router.post('/',
  authorizeRoles('insurance_staff', 'receptionist', 'branch_admin'),
  validateRequest(createPolicySchema),
  PolicyController.createPolicy
);

// Get policy by ID
router.get('/:policyId',
  validateParams(policyIdSchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'doctor', 'receptionist', 'billing_staff', 'patient', 'branch_admin'),
  PolicyController.getPolicyById
);

// Update policy
router.put('/:policyId',
  strictLimiter,
  validateParams(policyIdSchema),
  validateRequest(updatePolicySchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'branch_admin'),
  PolicyController.updatePolicy
);

// Verify policy
router.patch('/:policyId/verify',
  strictLimiter,
  validateParams(policyIdSchema),
  validateRequest(verifyPolicySchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'branch_admin'),
  PolicyController.verifyPolicy
);

// Check policy eligibility
router.get('/:policyId/eligibility',
  validateParams(policyIdSchema),
  validateQuery(eligibilityQuerySchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'doctor', 'billing_staff', 'branch_admin'),
  PolicyController.checkPolicyEligibility
);

// Get patient policies
router.get('/patient/:patientId',
  validateParams(patientIdSchema),
  validateTenantAccess,
  authorizeRoles('insurance_staff', 'doctor', 'receptionist', 'billing_staff', 'patient', 'branch_admin'),
  PolicyController.getPatientPolicies
);

// Get policies by status
router.get('/',
  validateQuery(policiesQuerySchema),
  authorizeRoles('insurance_staff', 'branch_admin', 'accounts_manager'),
  PolicyController.getPoliciesByStatus
);

// Get expiring policies
router.get('/expiring/list',
  validateQuery(expiringPoliciesQuerySchema),
  authorizeRoles('insurance_staff', 'branch_admin'),
  PolicyController.getExpiringPolicies
);

module.exports = router;