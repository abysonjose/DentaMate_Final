const { v4: uuidv4 } = require('uuid');
const MeetingNote = require('../models/MeetingNote');
const Meeting = require('../models/Meeting');
const CacheService = require('../services/CacheService');
const logger = require('../utils/logger');

class MeetingNoteController {
  // Create meeting note
  async createMeetingNote(req, res) {
    try {
      const { meetingId } = req.params;
      const {
        noteContent,
        keyPoints = [],
        actionItems = [],
        decisions = [],
        followUps = [],
        visibility = 'PARTICIPANTS_ONLY'
      } = req.body;
      
      const author = req.user;

      // Verify meeting exists and user has access
      const meeting = await Meeting.findOne({
        meetingId,
        tenantId: author.tenantId
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if user is a participant or organizer
      const isParticipant = meeting.participants.some(p => p.userId === author.userId) || 
                           meeting.organizer.userId === author.userId;

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this meeting'
        });
      }

      const noteId = uuidv4();

      const meetingNote = new MeetingNote({
        noteId,
        meetingId,
        caseId: meeting.caseId,
        tenantId: author.tenantId,
        branchId: author.branchId,
        author: {
          userId: author.userId,
          name: author.name,
          role: author.role
        },
        noteContent,
        keyPoints,
        actionItems,
        decisions,
        followUps,
        visibility,
        status: 'PUBLISHED'
      });

      await meetingNote.save();

      // Update meeting metadata
      meeting.metadata.totalNotes += 1;
      await meeting.save();

      // Invalidate cache
      await CacheService.invalidateMeetingNotes(meetingId);
      await CacheService.invalidateMeeting(meetingId);

      logger.logMeeting('MEETING_NOTE_CREATED', meetingId, {
        noteId,
        noteType: noteContent.noteType,
        actionItemsCount: actionItems.length,
        decisionsCount: decisions.length
      }, author);

      res.status(201).json({
        success: true,
        message: 'Meeting note created successfully',
        data: meetingNote
      });
    } catch (error) {
      logger.error('Create meeting note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create meeting note'
      });
    }
  }

  // Get meeting notes
  async getMeetingNotes(req, res) {
    try {
      const { meetingId } = req.params;
      const { 
        noteType, 
        status = 'PUBLISHED', 
        limit = 20, 
        page = 1 
      } = req.query;
      
      const { tenantId, userId, role } = req.user;

      // Try cache first
      let notes = await CacheService.getMeetingNotes(meetingId);

      if (!notes) {
        const options = {
          status,
          noteType,
          limit: parseInt(limit)
        };

        notes = await MeetingNote.findByMeetingId(meetingId, tenantId, options);
        
        // Cache the results
        await CacheService.cacheMeetingNotes(meetingId, notes);
      }

      // Filter notes based on visibility and user permissions
      const filteredNotes = notes.filter(note => {
        return note.canUserView(userId, role);
      });

      res.json({
        success: true,
        data: filteredNotes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredNotes.length
        }
      });
    } catch (error) {
      logger.error('Get meeting notes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve meeting notes'
      });
    }
  }

  // Get single meeting note
  async getMeetingNote(req, res) {
    try {
      const { noteId } = req.params;
      const { tenantId, userId, role } = req.user;

      const note = await MeetingNote.findOne({
        noteId,
        tenantId
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Meeting note not found'
        });
      }

      // Check if user can view
      if (!note.canUserView(userId, role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this meeting note'
        });
      }

      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      logger.error('Get meeting note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve meeting note'
      });
    }
  }

  // Update meeting note
  async updateMeetingNote(req, res) {
    try {
      const { noteId } = req.params;
      const updates = req.body;
      const currentUser = req.user;

      const note = await MeetingNote.findOne({
        noteId,
        tenantId: currentUser.tenantId
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Meeting note not found'
        });
      }

      // Check if user can edit
      if (!note.canUserEdit(currentUser.userId, currentUser.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied to edit this meeting note'
        });
      }

      // Update note fields
      if (updates.noteContent) {
        Object.assign(note.noteContent, updates.noteContent);
      }

      if (updates.keyPoints) {
        note.keyPoints = updates.keyPoints;
      }

      if (updates.actionItems) {
        note.actionItems = updates.actionItems;
      }

      if (updates.decisions) {
        note.decisions = updates.decisions;
      }

      if (updates.followUps) {
        note.followUps = updates.followUps;
      }

      if (updates.visibility) {
        note.visibility = updates.visibility;
      }

      // Update metadata
      note.metadata.lastEditedBy = {
        userId: currentUser.userId,
        name: currentUser.name,
        editedAt: new Date()
      };

      await note.save();

      // Invalidate cache
      await CacheService.invalidateMeetingNotes(note.meetingId);

      logger.logMeeting('MEETING_NOTE_UPDATED', note.meetingId, {
        noteId,
        updates: Object.keys(updates)
      }, currentUser);

      res.json({
        success: true,
        message: 'Meeting note updated successfully',
        data: note
      });
    } catch (error) {
      logger.error('Update meeting note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update meeting note'
      });
    }
  }

  // Delete meeting note
  async deleteMeetingNote(req, res) {
    try {
      const { noteId } = req.params;
      const currentUser = req.user;

      const note = await MeetingNote.findOne({
        noteId,
        tenantId: currentUser.tenantId
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Meeting note not found'
        });
      }

      // Check if user can edit
      if (!note.canUserEdit(currentUser.userId, currentUser.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied to delete this meeting note'
        });
      }

      // Archive instead of hard delete
      note.status = 'ARCHIVED';
      await note.save();

      // Invalidate cache
      await CacheService.invalidateMeetingNotes(note.meetingId);

      logger.logMeeting('MEETING_NOTE_DELETED', note.meetingId, {
        noteId
      }, currentUser);

      res.json({
        success: true,
        message: 'Meeting note deleted successfully'
      });
    } catch (error) {
      logger.error('Delete meeting note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete meeting note'
      });
    }
  }

  // Add action item to note
  async addActionItem(req, res) {
    try {
      const { noteId } = req.params;
      const actionItem = req.body;
      const currentUser = req.user;

      const note = await MeetingNote.findOne({
        noteId,
        tenantId: currentUser.tenantId
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Meeting note not found'
        });
      }

      // Check if user can edit
      if (!note.canUserEdit(currentUser.userId, currentUser.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied to edit this meeting note'
        });
      }

      // Add action item
      note.addActionItem({
        ...actionItem,
        assignedBy: {
          userId: currentUser.userId,
          name: currentUser.name
        }
      });

      await note.save();

      // Invalidate cache
      await CacheService.invalidateMeetingNotes(note.meetingId);

      logger.logMeeting('ACTION_ITEM_ADDED', note.meetingId, {
        noteId,
        assignedTo: actionItem.assignedTo.userId,
        dueDate: actionItem.dueDate
      }, currentUser);

      res.json({
        success: true,
        message: 'Action item added successfully',
        data: note
      });
    } catch (error) {
      logger.error('Add action item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add action item'
      });
    }
  }

  // Update action item status
  async updateActionItemStatus(req, res) {
    try {
      const { noteId, actionItemId } = req.params;
      const { status } = req.body;
      const currentUser = req.user;

      const note = await MeetingNote.findOne({
        noteId,
        tenantId: currentUser.tenantId
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Meeting note not found'
        });
      }

      // Update action item status
      const updated = note.updateActionItemStatus(actionItemId, status, {
        userId: currentUser.userId,
        name: currentUser.name
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Action item not found'
        });
      }

      await note.save();

      // Invalidate cache
      await CacheService.invalidateMeetingNotes(note.meetingId);

      logger.logMeeting('ACTION_ITEM_UPDATED', note.meetingId, {
        noteId,
        actionItemId,
        newStatus: status
      }, currentUser);

      res.json({
        success: true,
        message: 'Action item status updated successfully',
        data: note
      });
    } catch (error) {
      logger.error('Update action item status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update action item status'
      });
    }
  }

  // Get notes by case
  async getNotesByCase(req, res) {
    try {
      const { caseId } = req.params;
      const { tenantId, userId, role } = req.user;
      const { limit = 50 } = req.query;

      const options = {
        limit: parseInt(limit)
      };

      const notes = await MeetingNote.findByCaseId(caseId, tenantId, options);

      // Filter notes based on visibility and user permissions
      const filteredNotes = notes.filter(note => {
        return note.canUserView(userId, role);
      });

      res.json({
        success: true,
        data: filteredNotes
      });
    } catch (error) {
      logger.error('Get notes by case error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notes'
      });
    }
  }

  // Get overdue action items
  async getOverdueActionItems(req, res) {
    try {
      const { tenantId, userId } = req.user;
      const { assignedToMe = false } = req.query;

      const targetUserId = assignedToMe === 'true' ? userId : null;

      const overdueItems = await MeetingNote.findOverdueActionItems(tenantId, targetUserId);

      res.json({
        success: true,
        data: overdueItems
      });
    } catch (error) {
      logger.error('Get overdue action items error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve overdue action items'
      });
    }
  }

  // Get meeting note statistics
  async getMeetingNoteStats(req, res) {
    try {
      const { meetingId } = req.params;
      const { tenantId } = req.user;

      const stats = await MeetingNote.aggregate([
        {
          $match: {
            meetingId,
            tenantId,
            status: { $ne: 'ARCHIVED' }
          }
        },
        {
          $group: {
            _id: null,
            totalNotes: { $sum: 1 },
            totalActionItems: { $sum: { $size: '$actionItems' } },
            pendingActionItems: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$actionItems',
                    cond: { $in: ['$$this.status', ['PENDING', 'IN_PROGRESS']] }
                  }
                }
              }
            },
            completedActionItems: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$actionItems',
                    cond: { $eq: ['$$this.status', 'COMPLETED'] }
                  }
                }
              }
            },
            overdueActionItems: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$actionItems',
                    cond: {
                      $and: [
                        { $in: ['$$this.status', ['PENDING', 'IN_PROGRESS']] },
                        { $lt: ['$$this.dueDate', new Date()] }
                      ]
                    }
                  }
                }
              }
            },
            totalDecisions: { $sum: { $size: '$decisions' } },
            totalFollowUps: { $sum: { $size: '$followUps' } }
          }
        }
      ]);

      const result = stats[0] || {
        totalNotes: 0,
        totalActionItems: 0,
        pendingActionItems: 0,
        completedActionItems: 0,
        overdueActionItems: 0,
        totalDecisions: 0,
        totalFollowUps: 0
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get meeting note stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve meeting note statistics'
      });
    }
  }
}

module.exports = new MeetingNoteController();