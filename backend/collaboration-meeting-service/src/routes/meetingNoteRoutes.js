const express = require('express');
const MeetingNoteController = require('../controllers/MeetingNoteController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');
const Joi = require('joi');

const router = express.Router();

// Apply authentication and meeting role check to all routes
router.use(AuthMiddleware.verifyToken);
router.use(AuthMiddleware.requireMeetingRole);
router.use(AuthMiddleware.validateTenantAccess);

// Create meeting note
router.post('/meetings/:meetingId/notes',
  rateLimiter.createLimiter(15, 15), // 15 requests per 15 minutes
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateCreateMeetingNote(),
  MeetingNoteController.createMeetingNote
);

// Get meeting notes
router.get('/meetings/:meetingId/notes',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateQueryParams(),
  MeetingNoteController.getMeetingNotes
);

// Get single meeting note
router.get('/notes/:noteId',
  ValidationMiddleware.validatePathParams(),
  MeetingNoteController.getMeetingNote
);

// Update meeting note
router.put('/notes/:noteId',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validate(Joi.object({
    noteContent: Joi.object({
      title: Joi.string().min(5).max(200).trim(),
      content: Joi.string().min(10).max(5000).trim(),
      noteType: Joi.string().valid('GENERAL', 'ACTION_ITEM', 'DECISION', 'FOLLOW_UP', 'SUMMARY'),
      priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT')
    }).optional(),
    keyPoints: Joi.array().items(Joi.object({
      point: Joi.string().min(5).max(500).trim(),
      category: Joi.string().valid('DISCUSSION', 'DECISION', 'ACTION', 'CONCERN', 'RECOMMENDATION')
    })).optional(),
    visibility: Joi.string().valid('PUBLIC', 'PARTICIPANTS_ONLY', 'DOCTORS_ONLY', 'PRIVATE').optional()
  })),
  MeetingNoteController.updateMeetingNote
);

// Delete meeting note
router.delete('/notes/:noteId',
  ValidationMiddleware.validatePathParams(),
  MeetingNoteController.deleteMeetingNote
);

// Add action item to note
router.post('/notes/:noteId/action-items',
  rateLimiter.createLimiter(20, 15), // 20 requests per 15 minutes
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validate(Joi.object({
    description: Joi.string().required().min(5).max(500).trim(),
    assignedTo: Joi.object({
      userId: Joi.string().required().min(1).max(50),
      name: Joi.string().required().min(2).max(100).trim(),
      role: Joi.string()
    }).required(),
    dueDate: Joi.date().iso().greater('now').required(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM')
  })),
  MeetingNoteController.addActionItem
);

// Update action item status
router.put('/notes/:noteId/action-items/:actionItemId',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateUpdateActionItem(),
  MeetingNoteController.updateActionItemStatus
);

// Get notes by case
router.get('/cases/:caseId/notes',
  ValidationMiddleware.validatePathParams(),
  ValidationMiddleware.validateQueryParams(),
  MeetingNoteController.getNotesByCase
);

// Get overdue action items
router.get('/action-items/overdue',
  ValidationMiddleware.validate(Joi.object({
    assignedToMe: Joi.boolean().default(false)
  }), 'query'),
  MeetingNoteController.getOverdueActionItems
);

// Get meeting note statistics
router.get('/meetings/:meetingId/notes/stats',
  ValidationMiddleware.validatePathParams(),
  MeetingNoteController.getMeetingNoteStats
);

module.exports = router;