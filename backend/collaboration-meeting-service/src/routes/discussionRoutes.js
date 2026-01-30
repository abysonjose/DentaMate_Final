const express = require('express');
const DiscussionController = require('../controllers/DiscussionController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication and collaboration role check to all routes
router.use(AuthMiddleware.verifyToken);
router.use(AuthMiddleware.requireCollaborationRole);
router.use(AuthMiddleware.validateTenantAccess);

// Create a new discussion/comment
router.post('/',
  rateLimiter.createLimiter(30, 15), // 30 requests per 15 minutes
  ValidationMiddleware.validateCreateDiscussion(),
  DiscussionController.createDiscussion
);

// Get discussions for a case
router.get('/case/:caseId',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateQueryParams(),
  DiscussionController.getDiscussions
);

// Get discussion thread (parent + replies)
router.get('/thread/:discussionId',
  ValidationMiddleware.validatePathParams(),
  DiscussionController.getDiscussionThread
);

// Update discussion content
router.put('/:discussionId',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateUpdateDiscussion(),
  DiscussionController.updateDiscussion
);

// Delete discussion
router.delete('/:discussionId',
  ValidationMiddleware.validatePathParams(),
  DiscussionController.deleteDiscussion
);

// Add reaction to discussion
router.post('/:discussionId/reactions',
  rateLimiter.createLimiter(60, 15), // 60 requests per 15 minutes
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateAddReaction(),
  DiscussionController.addReaction
);

// Remove reaction from discussion
router.delete('/:discussionId/reactions',
  ValidationMiddleware.validatePathParams(),
  DiscussionController.removeReaction
);

// Mark discussion as read
router.post('/:discussionId/read',
  ValidationMiddleware.validatePathParams(),
  DiscussionController.markAsRead
);

// Get discussion statistics for a case
router.get('/case/:caseId/stats',
  ValidationMiddleware.validatePathParams(),
  DiscussionController.getDiscussionStats
);

module.exports = router;