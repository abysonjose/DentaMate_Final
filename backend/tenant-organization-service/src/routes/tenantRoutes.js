const express = require('express');
const TenantController = require('../controllers/TenantController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();
const tenantController = new TenantController();

// Public routes (with rate limiting)
router.post('/create', 
  rateLimiter.createTenant,
  tenantController.createTenant.bind(tenantController)
);

router.get('/validate/:tenantId', 
  rateLimiter.standard,
  tenantController.validateTenant.bind(tenantController)
);

// Protected routes
router.use(authenticateToken);

// Tenant management routes
router.get('/:tenantId', 
  rateLimiter.standard,
  tenantController.getTenant.bind(tenantController)
);

router.put('/:tenantId', 
  rateLimiter.standard,
  requireRole(['CENTRAL_ADMIN', 'SAAS_ADMIN']),
  tenantController.updateTenant.bind(tenantController)
);

router.post('/:tenantId/activate', 
  rateLimiter.standard,
  requireRole(['SAAS_ADMIN']),
  tenantController.activateTenant.bind(tenantController)
);

router.post('/:tenantId/suspend', 
  rateLimiter.standard,
  requireRole(['SAAS_ADMIN']),
  validateRequest({
    body: {
      reason: { type: 'string', required: true, minLength: 5, maxLength: 500 }
    }
  }),
  tenantController.suspendTenant.bind(tenantController)
);

// Configuration routes
router.get('/:tenantId/configuration', 
  rateLimiter.standard,
  tenantController.getTenantConfiguration.bind(tenantController)
);

router.put('/:tenantId/configuration', 
  rateLimiter.standard,
  requireRole(['CENTRAL_ADMIN', 'SAAS_ADMIN']),
  tenantController.updateTenantConfiguration.bind(tenantController)
);

// Admin routes
router.get('/status/:status', 
  rateLimiter.standard,
  requireRole(['SAAS_ADMIN']),
  tenantController.getTenantsByStatus.bind(tenantController)
);

router.get('/search', 
  rateLimiter.standard,
  requireRole(['SAAS_ADMIN']),
  validateRequest({
    query: {
      q: { type: 'string', required: true, minLength: 2 },
      limit: { type: 'number', min: 1, max: 100, default: 50 },
      skip: { type: 'number', min: 0, default: 0 }
    }
  }),
  tenantController.searchTenants.bind(tenantController)
);

// Login tracking
router.post('/:tenantId/login', 
  rateLimiter.login,
  tenantController.recordLogin.bind(tenantController)
);

module.exports = router;