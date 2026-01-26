const express = require('express');
const SaasAdminController = require('../controllers/SaasAdminController');
const { authMiddleware, saasAdminOnly } = require('../middleware/auth');
const { validateLicenseCreation, validatePlanCreation } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const controller = new SaasAdminController();

// Rate limiting for sensitive operations
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const moderateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply authentication and authorization to all routes
router.use(authMiddleware);
router.use(saasAdminOnly);

// Dashboard & Analytics Routes
router.get('/dashboard/overview', moderateRateLimit, controller.getDashboardOverview.bind(controller));
router.get('/analytics/usage', moderateRateLimit, controller.getUsageAnalytics.bind(controller));
router.get('/analytics/revenue', moderateRateLimit, controller.getRevenueAnalytics.bind(controller));
router.get('/analytics/customers', moderateRateLimit, controller.getCustomerAnalytics.bind(controller));

// License Management Routes
router.post('/licenses', strictRateLimit, validateLicenseCreation, controller.issueLicense.bind(controller));
router.get('/licenses', moderateRateLimit, controller.getAllLicenses.bind(controller));
router.get('/licenses/expiring', moderateRateLimit, controller.getExpiringLicenses.bind(controller));
router.put('/licenses/:licenseId/renew', strictRateLimit, controller.renewLicense.bind(controller));
router.put('/licenses/:licenseId/suspend', strictRateLimit, controller.suspendLicense.bind(controller));
router.put('/licenses/:licenseId/revoke', strictRateLimit, controller.revokeLicense.bind(controller));

// Subscription Plan Management Routes
router.post('/subscription-plans', strictRateLimit, validatePlanCreation, controller.createSubscriptionPlan.bind(controller));
router.get('/subscription-plans', moderateRateLimit, controller.getAllSubscriptionPlans.bind(controller));
router.get('/subscription-plans/:planId', moderateRateLimit, controller.getSubscriptionPlan.bind(controller));
router.put('/subscription-plans/:planId', strictRateLimit, controller.updateSubscriptionPlan.bind(controller));
router.put('/subscription-plans/:planId/deprecate', strictRateLimit, controller.deprecateSubscriptionPlan.bind(controller));
router.post('/subscription-plans/custom', strictRateLimit, controller.createCustomPlan.bind(controller));
router.get('/subscription-plans/stats/usage', moderateRateLimit, controller.getPlanUsageStats.bind(controller));

// Audit & Compliance Routes
router.get('/audit-logs', moderateRateLimit, controller.getAuditLogs.bind(controller));
router.get('/audit-logs/system-wide', moderateRateLimit, controller.getSystemWideActions.bind(controller));
router.get('/audit-logs/critical', moderateRateLimit, controller.getCriticalActions.bind(controller));

module.exports = router;