const { v4: uuidv4 } = require('uuid');
const CaseCollaboration = require('../models/CaseCollaboration');
const CollaborationService = require('../services/CollaborationService');
const CacheService = require('../services/CacheService');
const logger = require('../utils/logger');

class CollaborationController {
  // Share a case with other users
  async shareCase(req, res) {
    try {
      const { caseId, patientId, sharedWith, caseDetails } = req.body;
      const sharedBy = req.user;

      // Validate that the user can share this case
      // In a real implementation, you'd check if the user has access to this case
      
      const caseData = {
        caseId,
        patientId,
        sharedWith,
        caseDetails
      };

      const result = await CollaborationService.shareCase(caseData, sharedBy);

      if (result.success) {
        logger.logCollaboration('CASE_SHARED', caseId, {
          collaborationId: result.data.collaborationId,
          sharedWith: sharedWith.map(p => p.userId),
          urgency: caseDetails.urgency
        }, sharedBy);

        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Share case error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to share case'
      });
    }
  }

  // Get collaboration details
  async getCollaboration(req, res) {
    try {
      const { collaborationId } = req.params;
      const { userId, tenantId } = req.user;

      const result = await CollaborationService.getCollaboration(collaborationId, userId, tenantId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(result.message === 'Access denied' ? 403 : 404).json(result);
      }
    } catch (error) {
      logger.error('Get collaboration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve collaboration'
      });
    }
  }

  // Get user's collaborations
  async getUserCollaborations(req, res) {
    try {
      const { userId, tenantId } = req.user;
      const { status, limit = 20, page = 1 } = req.query;

      // Try cache first
      let collaborations = await CacheService.getUserCollaborations(userId, tenantId);

      if (!collaborations) {
        const options = {
          status,
          limit: parseInt(limit),
          skip: (parseInt(page) - 1) * parseInt(limit)
        };

        collaborations = await CaseCollaboration.findByUser(userId, tenantId, options);
        
        // Cache the results
        await CacheService.cacheUserCollaborations(userId, tenantId, collaborations);
      }

      res.json({
        success: true,
        data: collaborations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: collaborations.length
        }
      });
    } catch (error) {
      logger.error('Get user collaborations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve collaborations'
      });
    }
  }

  // Update collaboration permissions
  async updatePermissions(req, res) {
    try {
      const { collaborationId } = req.params;
      const { userId, permissions } = req.body;
      const currentUser = req.user;

      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: currentUser.tenantId
      });

      if (!collaboration) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration not found'
        });
      }

      // Check if current user can modify permissions (must be the owner)
      if (collaboration.sharedBy.userId !== currentUser.userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the case owner can modify permissions'
        });
      }

      // Update permissions
      const updated = collaboration.updatePermissions(userId, permissions);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'User not found in collaboration'
        });
      }

      await collaboration.save();

      // Invalidate cache
      await CacheService.invalidateCollaboration(collaborationId);
      await CacheService.invalidateUserCollaborations(userId, currentUser.tenantId);

      logger.logCollaboration('PERMISSIONS_UPDATED', collaboration.caseId, {
        collaborationId,
        targetUserId: userId,
        newPermissions: permissions
      }, currentUser);

      res.json({
        success: true,
        message: 'Permissions updated successfully',
        data: collaboration
      });
    } catch (error) {
      logger.error('Update permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update permissions'
      });
    }
  }

  // Add participant to collaboration
  async addParticipant(req, res) {
    try {
      const { collaborationId } = req.params;
      const { userId, name, role, permissions = 'VIEW_ONLY' } = req.body;
      const currentUser = req.user;

      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: currentUser.tenantId
      });

      if (!collaboration) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration not found'
        });
      }

      // Check if current user can add participants (must be the owner)
      if (collaboration.sharedBy.userId !== currentUser.userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the case owner can add participants'
        });
      }

      // Add participant
      collaboration.addParticipant({ userId, name, role }, permissions);
      await collaboration.save();

      // Invalidate cache
      await CacheService.invalidateCollaboration(collaborationId);
      await CacheService.invalidateUserCollaborations(userId, currentUser.tenantId);

      logger.logCollaboration('PARTICIPANT_ADDED', collaboration.caseId, {
        collaborationId,
        newParticipant: { userId, name, role, permissions }
      }, currentUser);

      res.json({
        success: true,
        message: 'Participant added successfully',
        data: collaboration
      });
    } catch (error) {
      logger.error('Add participant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add participant'
      });
    }
  }

  // Remove participant from collaboration
  async removeParticipant(req, res) {
    try {
      const { collaborationId, userId } = req.params;
      const currentUser = req.user;

      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: currentUser.tenantId
      });

      if (!collaboration) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration not found'
        });
      }

      // Check if current user can remove participants (must be the owner)
      if (collaboration.sharedBy.userId !== currentUser.userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the case owner can remove participants'
        });
      }

      // Remove participant
      collaboration.removeParticipant(userId);
      await collaboration.save();

      // Invalidate cache
      await CacheService.invalidateCollaboration(collaborationId);
      await CacheService.invalidateUserCollaborations(userId, currentUser.tenantId);

      logger.logCollaboration('PARTICIPANT_REMOVED', collaboration.caseId, {
        collaborationId,
        removedUserId: userId
      }, currentUser);

      res.json({
        success: true,
        message: 'Participant removed successfully',
        data: collaboration
      });
    } catch (error) {
      logger.error('Remove participant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove participant'
      });
    }
  }

  // Update collaboration status
  async updateStatus(req, res) {
    try {
      const { collaborationId } = req.params;
      const { status } = req.body;
      const currentUser = req.user;

      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: currentUser.tenantId
      });

      if (!collaboration) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration not found'
        });
      }

      // Check if current user can update status (must be the owner)
      if (collaboration.sharedBy.userId !== currentUser.userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the case owner can update status'
        });
      }

      collaboration.collaborationStatus = status;
      collaboration.metadata.lastActivity = new Date();
      await collaboration.save();

      // Invalidate cache
      await CacheService.invalidateCollaboration(collaborationId);

      logger.logCollaboration('STATUS_UPDATED', collaboration.caseId, {
        collaborationId,
        newStatus: status
      }, currentUser);

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: collaboration
      });
    } catch (error) {
      logger.error('Update status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update status'
      });
    }
  }

  // Get collaboration statistics
  async getCollaborationStats(req, res) {
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

      const stats = await CaseCollaboration.aggregate([
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
            totalCollaborations: { $sum: 1 },
            activeCollaborations: {
              $sum: { $cond: [{ $eq: ['$collaborationStatus', 'ACTIVE'] }, 1, 0] }
            },
            completedCollaborations: {
              $sum: { $cond: [{ $eq: ['$collaborationStatus', 'COMPLETED'] }, 1, 0] }
            },
            avgParticipants: { $avg: { $size: '$sharedWith' } },
            totalComments: { $sum: '$metadata.totalComments' },
            totalMeetings: { $sum: '$metadata.totalMeetings' }
          }
        }
      ]);

      const result = stats[0] || {
        totalCollaborations: 0,
        activeCollaborations: 0,
        completedCollaborations: 0,
        avgParticipants: 0,
        totalComments: 0,
        totalMeetings: 0
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
      logger.error('Get collaboration stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics'
      });
    }
  }
}

module.exports = new CollaborationController();