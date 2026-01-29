const express = require('express');
const CaseController = require('../controllers/CaseController');
const { authenticateToken, enforceTenantIsolation, authorizeCaseAccess } = require('../middleware/auth');
const { validate, caseSchemas, issueSchemas, paramValidation } = require('../middleware/validation');

const router = express.Router();
const caseController = new CaseController();

// Apply authentication and tenant isolation to all routes
router.use(authenticateToken);
router.use(enforceTenantIsolation);

// Case management routes
router.post(
  '/cases',
  authorizeCaseAccess,
  validate(caseSchemas.createCase),
  caseController.createCase.bind(caseController)
);

router.get(
  '/cases',
  validate(caseSchemas.getCases, 'query'),
  caseController.getCases.bind(caseController)
);

router.get(
  '/cases/:caseId',
  paramValidation.validateCaseId,
  authorizeCaseAccess,
  caseController.getCaseById.bind(caseController)
);

router.patch(
  '/cases/:caseId/status',
  paramValidation.validateCaseId,
  authorizeCaseAccess,
  validate(caseSchemas.updateCaseStatus),
  caseController.updateCaseStatus.bind(caseController)
);

router.patch(
  '/cases/:caseId/delivery-date',
  paramValidation.validateCaseId,
  authorizeCaseAccess,
  validate(caseSchemas.updateDeliveryDate),
  caseController.updateDeliveryDate.bind(caseController)
);

router.patch(
  '/cases/:caseId/assign-orthotist',
  paramValidation.validateCaseId,
  authorizeCaseAccess,
  validate(caseSchemas.assignOrthotist),
  caseController.assignOrthotist.bind(caseController)
);

// Workflow and history routes
router.get(
  '/cases/:caseId/workflow',
  paramValidation.validateCaseId,
  authorizeCaseAccess,
  caseController.getWorkflowHistory.bind(caseController)
);

// Issue management routes
router.post(
  '/cases/:caseId/issues',
  paramValidation.validateCaseId,
  authorizeCaseAccess,
  validate(issueSchemas.reportIssue),
  caseController.reportIssue.bind(caseController)
);

router.patch(
  '/cases/:caseId/issues/:issueId',
  paramValidation.validateIssueId,
  authorizeCaseAccess,
  validate(issueSchemas.updateIssue),
  caseController.updateIssue.bind(caseController)
);

// Statistics route
router.get(
  '/cases/statistics',
  caseController.getCaseStatistics.bind(caseController)
);

module.exports = router;