const { v4: uuidv4 } = require('uuid');
const Meeting = require('../models/Meeting');
const CaseCollaboration = require('../models/CaseCollaboration');
const CacheService = require('../services/CacheService');
const logger = require('../utils/logger');

class MeetingController {
  // Schedule a new meeting
  async scheduleMeeting(req, res) {
    try {
      const {
        caseId,
        collaborationId,
        meetingDetails,
        schedule,
        participants
      } = req.body;
      
      const organizer = req.user;

      // Verify user has access to the collaboration
      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: organizer.tenantId
      });

      if (!collaboration) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration not found'
        });
      }

      const accessCheck = collaboration.hasUserAccess(organizer.userId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this collaboration'
        });
      }

      const meetingId = uuidv4();

      const meeting = new Meeting({
        meetingId,
        caseId,
        collaborationId,
        tenantId: organizer.tenantId,
        branchId: organizer.branchId,
        organizer: {
          userId: organizer.userId,
          name: organizer.name,
          role: organizer.role
        },
        meetingDetails,
        schedule,
        participants: participants.map(p => ({
          ...p,
          responseStatus: 'PENDING'
        })),
        status: 'SCHEDULED'
      });

      await meeting.save();

      // Update collaboration metadata
      collaboration.metadata.totalMeetings += 1;
      collaboration.metadata.lastActivity = new Date();
      await collaboration.save();

      // Invalidate cache
      await CacheService.invalidateMeeting(meetingId);
      await CacheService.invalidateCollaboration(collaborationId);

      // Invalidate user meeting caches for all participants
      const allParticipants = [organizer, ...participants];
      await Promise.all(
        allParticipants.map(participant => 
          CacheService.invalidateUserMeetings(participant.userId, organizer.tenantId)
        )
      );

      logger.logMeeting('MEETING_SCHEDULED', meetingId, {
        caseId,
        scheduledAt: schedule.scheduledAt,
        duration: schedule.duration,
        participantCount: participants.length
      }, organizer);

      res.status(201).json({
        success: true,
        message: 'Meeting scheduled successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Schedule meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule meeting'
      });
    }
  }

  // Get meeting details
  async getMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const { userId, tenantId } = req.user;

      // Try cache first
      let meeting = await CacheService.getMeeting(meetingId);

      if (!meeting) {
        meeting = await Meeting.findOne({
          meetingId,
          tenantId
        });

        if (!meeting) {
          return res.status(404).json({
            success: false,
            message: 'Meeting not found'
          });
        }

        // Cache for future requests
        await CacheService.cacheMeeting(meetingId, meeting);
      }

      // Check if user is a participant or organizer
      const isParticipant = meeting.participants.some(p => p.userId === userId) || 
                           meeting.organizer.userId === userId;

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this meeting'
        });
      }

      res.json({
        success: true,
        data: meeting
      });
    } catch (error) {
      logger.error('Get meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve meeting'
      });
    }
  }

  // Get user's meetings
  async getUserMeetings(req, res) {
    try {
      const { userId, tenantId } = req.user;
      const { 
        status, 
        upcoming = false, 
        limit = 20, 
        page = 1 
      } = req.query;

      let meetings;

      if (upcoming === 'true') {
        const hours = parseInt(req.query.hours) || 24;
        meetings = await Meeting.findUpcoming(userId, tenantId, hours);
      } else {
        // Try cache first
        meetings = await CacheService.getUserMeetings(userId, tenantId);

        if (!meetings) {
          const query = {
            tenantId,
            $or: [
              { 'organizer.userId': userId },
              { 'participants.userId': userId }
            ]
          };

          if (status) {
            query.status = status;
          }

          meetings = await Meeting.find(query)
            .sort({ 'schedule.scheduledAt': -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

          // Cache the results
          await CacheService.cacheUserMeetings(userId, tenantId, meetings);
        }
      }

      res.json({
        success: true,
        data: meetings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: meetings.length
        }
      });
    } catch (error) {
      logger.error('Get user meetings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve meetings'
      });
    }
  }

  // Update meeting details
  async updateMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const updates = req.body;
      const currentUser = req.user;

      const meeting = await Meeting.findOne({
        meetingId,
        tenantId: currentUser.tenantId
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if user can update (must be organizer)
      if (meeting.organizer.userId !== currentUser.userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the meeting organizer can update meeting details'
        });
      }

      // Check if meeting can be updated
      if (meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update completed or cancelled meetings'
        });
      }

      // Update meeting details
      if (updates.meetingDetails) {
        Object.assign(meeting.meetingDetails, updates.meetingDetails);
      }

      if (updates.schedule) {
        Object.assign(meeting.schedule, updates.schedule);
      }

      await meeting.save();

      // Invalidate cache
      await CacheService.invalidateMeeting(meetingId);

      logger.logMeeting('MEETING_UPDATED', meetingId, {
        updates: Object.keys(updates)
      }, currentUser);

      res.json({
        success: true,
        message: 'Meeting updated successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Update meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update meeting'
      });
    }
  }

  // Cancel meeting
  async cancelMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const { reason = '' } = req.body;
      const currentUser = req.user;

      const meeting = await Meeting.findOne({
        meetingId,
        tenantId: currentUser.tenantId
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if user can cancel (must be organizer)
      if (meeting.organizer.userId !== currentUser.userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the meeting organizer can cancel the meeting'
        });
      }

      // Check if meeting can be cancelled
      if (meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Meeting is already completed or cancelled'
        });
      }

      meeting.status = 'CANCELLED';
      await meeting.save();

      // Invalidate cache
      await CacheService.invalidateMeetingCache(meetingId);

      logger.logMeeting('MEETING_CANCELLED', meetingId, {
        reason
      }, currentUser);

      res.json({
        success: true,
        message: 'Meeting cancelled successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Cancel meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel meeting'
      });
    }
  }

  // Respond to meeting invitation
  async respondToMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const { responseStatus } = req.body;
      const currentUser = req.user;

      const meeting = await Meeting.findOne({
        meetingId,
        tenantId: currentUser.tenantId
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Update participant response
      const updated = meeting.updateParticipantResponse(currentUser.userId, responseStatus);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'You are not invited to this meeting'
        });
      }

      await meeting.save();

      // Invalidate cache
      await CacheService.invalidateMeeting(meetingId);

      logger.logMeeting('MEETING_RESPONSE', meetingId, {
        responseStatus
      }, currentUser);

      res.json({
        success: true,
        message: 'Response recorded successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Respond to meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record response'
      });
    }
  }

  // Join meeting
  async joinMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const currentUser = req.user;

      const meeting = await Meeting.findOne({
        meetingId,
        tenantId: currentUser.tenantId
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if user can join
      const canJoinResult = meeting.canUserJoin(currentUser.userId);
      
      if (!canJoinResult.canJoin) {
        return res.status(403).json({
          success: false,
          message: canJoinResult.reason
        });
      }

      // Join the meeting
      meeting.joinMeeting(currentUser.userId);
      await meeting.save();

      // Invalidate cache
      await CacheService.invalidateMeeting(meetingId);

      logger.logMeeting('MEETING_JOINED', meetingId, {}, currentUser);

      res.json({
        success: true,
        message: 'Joined meeting successfully',
        data: {
          meetingId,
          accessToken: meeting.meetingAccess.accessToken,
          joinUrl: meeting.meetingAccess.joinUrl
        }
      });
    } catch (error) {
      logger.error('Join meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join meeting'
      });
    }
  }

  // Leave meeting
  async leaveMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const currentUser = req.user;

      const meeting = await Meeting.findOne({
        meetingId,
        tenantId: currentUser.tenantId
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Leave the meeting
      const left = meeting.leaveMeeting(currentUser.userId);

      if (!left) {
        return res.status(400).json({
          success: false,
          message: 'You are not currently in this meeting'
        });
      }

      await meeting.save();

      // Invalidate cache
      await CacheService.invalidateMeeting(meetingId);

      logger.logMeeting('MEETING_LEFT', meetingId, {}, currentUser);

      res.json({
        success: true,
        message: 'Left meeting successfully'
      });
    } catch (error) {
      logger.error('Leave meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to leave meeting'
      });
    }
  }

  // Complete meeting
  async completeMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const currentUser = req.user;

      const meeting = await Meeting.findOne({
        meetingId,
        tenantId: currentUser.tenantId
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Check if user can complete (must be organizer)
      if (meeting.organizer.userId !== currentUser.userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the meeting organizer can complete the meeting'
        });
      }

      // Complete the meeting
      meeting.completeMeeting();
      await meeting.save();

      // Invalidate cache
      await CacheService.invalidateMeetingCache(meetingId);

      logger.logMeeting('MEETING_COMPLETED', meetingId, {
        actualDuration: meeting.actualTiming.actualDuration
      }, currentUser);

      res.json({
        success: true,
        message: 'Meeting completed successfully',
        data: meeting
      });
    } catch (error) {
      logger.error('Complete meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete meeting'
      });
    }
  }

  // Get meetings by case
  async getMeetingsByCase(req, res) {
    try {
      const { caseId } = req.params;
      const { tenantId } = req.user;
      const { status, limit = 20 } = req.query;

      const options = {
        status,
        limit: parseInt(limit)
      };

      const meetings = await Meeting.findByCaseId(caseId, tenantId, options);

      res.json({
        success: true,
        data: meetings
      });
    } catch (error) {
      logger.error('Get meetings by case error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve meetings'
      });
    }
  }

  // Get meeting statistics
  async getMeetingStats(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { period = '30d' } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const stats = await Meeting.aggregate([
        {
          $match: {
            tenantId,
            branchId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalMeetings: { $sum: 1 },
            scheduledMeetings: {
              $sum: { $cond: [{ $eq: ['$status', 'SCHEDULED'] }, 1, 0] }
            },
            completedMeetings: {
              $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
            },
            cancelledMeetings: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
            },
            avgDuration: { $avg: '$schedule.duration' },
            avgParticipants: { $avg: { $size: '$participants' } },
            totalNotes: { $sum: '$metadata.totalNotes' }
          }
        }
      ]);

      const result = stats[0] || {
        totalMeetings: 0,
        scheduledMeetings: 0,
        completedMeetings: 0,
        cancelledMeetings: 0,
        avgDuration: 0,
        avgParticipants: 0,
        totalNotes: 0
      };

      res.json({
        success: true,
        data: {
          ...result,
          period,
          dateRange: { startDate, endDate }
        }
      });
    } catch (error) {
      logger.error('Get meeting stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics'
      });
    }
  }
}

module.exports = new MeetingController();