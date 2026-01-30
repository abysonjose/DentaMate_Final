const express = require('express');
const CollaborationController = require('../controllers/CollaborationController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');
const Joi = require('joi');

const router = express.Router();

// Apply authentication and collaboration role check to all routes
router.use(AuthMiddleware.verifyToken);
router.use(AuthMiddleware.requireCollaborationRole);
router.use(AuthMiddleware.validateTenantAccess);

// Share a case with other users
router.post('/cases/share',
  rateLimiter.createLimiter(10, 15), // 10 requests per 15 minutes
  ValidationMiddleware.validateShareCase(),
  CollaborationController.shareCase
);

// Get collaboration details
router.get('/cases/:collaborationId',
  ValidationMiddleware.validatePathParams(),
  CollaborationController.getCollaboration
);

// Get user's collaborations
router.get('/cases',
  ValidationMiddleware.validateQueryParams(),
  CollaborationController.getUserCollaborations
);

// Update collaboration permissions
router.put('/cases/:collaborationId/permissions',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateUpdatePermissions(),
  CollaborationController.updatePermissions
);

// Add participant to collaboration
router.post('/cases/:collaborationId/participants',
  rateLimiter.createLimiter(20, 15), // 20 requests per 15 minutes
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validate(Joi.object({
    userId: Joi.string().required().min(1).max(50),
    name: Joi.string().required().min(2).max(100).trim(),
    role: Joi.string().valid('DOCTOR', 'SPECIALIST', 'ORTHOTIST', 'HEAD_NURSE', 'NURSE').required(),
    permissions: Joi.string().valid('VIEW_ONLY', 'COMMENT').default('VIEW_ONLY')
  })),
  CollaborationController.addParticipant
);

// Remove participant from collaboration
router.delete('/cases/:collaborationId/participants/:userId',
  ValidationMiddleware.validatePathParams(),
  CollaborationController.removeParticipant
);

// Update collaboration status
router.put('/cases/:collaborationId/status',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validate(Joi.object({
    status: Joi.string().valid('ACTIVE', 'COMPLETED', 'ARCHIVED').required()
  })),
  CollaborationController.updateStatus
);

// Get collaboration statistics
router.get('/stats',
  ValidationMiddleware.validate(Joi.object({
    period: Joi.string().valid('7d', '30d', '90d').default('30d')
  }), 'query'),
  CollaborationController.getCollaborationStats
);

module.exports = router;