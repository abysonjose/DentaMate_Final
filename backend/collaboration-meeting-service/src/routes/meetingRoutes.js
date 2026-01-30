const express = require('express');
const MeetingController = require('../controllers/MeetingController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');
const Joi = require('joi');

const router = express.Router();

// Apply authentication and meeting role check to all routes
router.use(AuthMiddleware.verifyToken);
router.use(AuthMiddleware.requireMeetingRole);
router.use(AuthMiddleware.validateTenantAccess);

// Schedule a new meeting
router.post('/',
  rateLimiter.createLimiter(10, 15), // 10 requests per 15 minutes
  ValidationMiddleware.validateCreateMeeting(),
  MeetingController.scheduleMeeting
);

// Get meeting details
router.get('/:meetingId',
  ValidationMiddleware.validatePathParams(),
  MeetingController.getMeeting
);

// Get user's meetings
router.get('/',
  ValidationMiddleware.validateQueryParams(),
  MeetingController.getUserMeetings
);

// Update meeting details
router.put('/:meetingId',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateUpdateMeeting(),
  MeetingController.updateMeeting
);

// Cancel meeting
router.delete('/:meetingId',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validate(Joi.object({
    reason: Joi.string().max(200).allow('')
  }), 'body'),
  MeetingController.cancelMeeting
);

// Respond to meeting invitation
router.post('/:meetingId/response',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateMeetingResponse(),
  MeetingController.respondToMeeting
);

// Join meeting
router.post('/:meetingId/join',
  rateLimiter.createLimiter(20, 5), // 20 requests per 5 minutes
  ValidationMiddleware.validatePathParams(),
  MeetingController.joinMeeting
);

// Leave meeting
router.post('/:meetingId/leave',
  ValidationMiddleware.validatePathParams(),
  MeetingController.leaveMeeting
);

// Complete meeting
router.post('/:meetingId/complete',
  ValidationMiddleware.validatePathParams(),
  MeetingController.completeMeeting
);

// Get meetings by case
router.get('/case/:caseId',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateQueryParams(),
  MeetingController.getMeetingsByCase
);

// Get meeting statistics
router.get('/stats/overview',
  ValidationMiddleware.validate(Joi.object({
    period: Joi.string().valid('7d', '30d', '90d').default('30d')
  }), 'query'),
  MeetingController.getMeetingStats
);

module.exports = router;