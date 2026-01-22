const express = require('express');
const BranchController = require('../controllers/BranchController');
const { authenticateToken, requireRole, validateTenantAccess } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();
const branchController = new BranchController();

// All routes require authentication
router.use(authenticateToken);

// Branch management routes
router.post('/tenant/:tenantId/branches', 
  rateLimiter.standard,
  validateTenantAccess,
  requireRole(['CENTRAL_ADMIN', 'SAAS_ADMIN']),
  branchController.createBranch.bind(branchController)
);

router.get('/tenant/:tenantId/branches', 
  rateLimiter.standard,
  validateTenantAccess,
  branchController.getTenantBranches.bind(branchController)
);

router.get('/tenant/:tenantId/branches/search', 
  rateLimiter.standard,
  validateTenantAccess,
  validateRequest({
    query: {
      q: { type: 'string', required: true, minLength: 2 },
      limit: { type: 'number', min: 1, max: 100, default: 50 },
      skip: { type: 'number', min: 0, default: 0 }
    }
  }),
  branchController.searchBranches.bind(branchController)
);

router.get('/:branchId', 
  rateLimiter.standard,
  branchController.getBranch.bind(branchController)
);

router.put('/:branchId', 
  rateLimiter.standard,
  requireRole(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'SAAS_ADMIN']),
  branchController.updateBranch.bind(branchController)
);

router.post('/:branchId/activate', 
  rateLimiter.standard,
  requireRole(['CENTRAL_ADMIN', 'SAAS_ADMIN']),
  branchController.activateBranch.bind(branchController)
);

router.post('/:branchId/suspend', 
  rateLimiter.standard,
  requireRole(['CENTRAL_ADMIN', 'SAAS_ADMIN']),
  validateRequest({
    body: {
      reason: { type: 'string', required: true, minLength: 5, maxLength: 500 }
    }
  }),
  branchController.suspendBranch.bind(branchController)
);

// Validation routes
router.get('/:branchId/validate', 
  rateLimiter.standard,
  branchController.validateBranch.bind(branchController)
);

// Admin assignment
router.post('/:branchId/admin', 
  rateLimiter.standard,
  requireRole(['CENTRAL_ADMIN', 'SAAS_ADMIN']),
  validateRequest({
    body: {
      userId: { type: 'string', required: true },
      name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      email: { type: 'string', required: true, format: 'email' },
      phone: { type: 'string', pattern: /^\+?[\d\s\-\(\)]{10,15}$/ }
    }
  }),
  branchController.assignBranchAdmin.bind(branchController)
);

// Department management
router.post('/:branchId/departments', 
  rateLimiter.standard,
  requireRole(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'SAAS_ADMIN']),
  validateRequest({
    body: {
      name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      code: { type: 'string', required: true, minLength: 2, maxLength: 10 },
      description: { type: 'string', maxLength: 500 }
    }
  }),
  branchController.addDepartment.bind(branchController)
);

// Room management
router.post('/:branchId/departments/:departmentId/rooms', 
  rateLimiter.standard,
  requireRole(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'SAAS_ADMIN']),
  validateRequest({
    body: {
      roomNumber: { type: 'string', required: true, minLength: 1, maxLength: 20 },
      roomName: { type: 'string', maxLength: 100 },
      roomType: { 
        type: 'string', 
        enum: ['CONSULTATION', 'TREATMENT', 'SURGERY', 'XRAY', 'LAB', 'WAITING'],
        default: 'CONSULTATION'
      },
      capacity: { type: 'number', min: 1, max: 50, default: 1 },
      equipment: { type: 'array', items: { type: 'string' } }
    }
  }),
  branchController.addRoom.bind(branchController)
);

// Working hours
router.get('/:branchId/working-hours', 
  rateLimiter.standard,
  branchController.getBranchWorkingHours.bind(branchController)
);

module.exports = router;