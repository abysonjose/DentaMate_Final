const { v4: uuidv4 } = require('uuid');
const CaseCollaboration = require('../models/CaseCollaboration');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class CollaborationService {
  // Share a case with other users
  async shareCase(caseData, sharedBy) {
    try {
      const collaborationId = uuidv4();
      
      // Create collaboration record
      const collaboration = new CaseCollaboration({
        collaborationId,
        caseId: caseData.caseId,
        patientId: caseData.patientId,
        tenantId: sharedBy.tenantId,
        branchId: sharedBy.branchId,
        sharedBy: {
          userId: sharedBy.userId,
          name: sharedBy.name,
          role: sharedBy.role
        },
        sharedWith: caseData.sharedWith,
        caseDetails: caseData.caseDetails,
        collaborationStatus: 'ACTIVE'
      });

      await collaboration.save();

      // Cache the collaboration
      await CacheService.cacheCollaboration(collaborationId, collaboration);

      // Invalidate user caches for all participants
      const allParticipants = [sharedBy, ...caseData.sharedWith];
      await Promise.all(
        allParticipants.map(participant => 
          CacheService.invalidateUserCollaborations(participant.userId, sharedBy.tenantId)
        )
      );

      logger.logCollaboration('CASE_SHARED', caseData.caseId, {
        collaborationId,
        sharedWith: caseData.sharedWith.map(p => p.userId),
        urgency: caseData.caseDetails.urgency
      }, sharedBy);

      return {
        success: true,
        data: collaboration,
        message: 'Case shared successfully'
      };
    } catch (error) {
      logger.error('Share case error:', error);
      throw new Error('Failed to share case');
    }
  }

  // Get collaboration details
  async getCollaboration(collaborationId, userId, tenantId) {
    try {
      // Try cache first
      let collaboration = await CacheService.getCollaboration(collaborationId);
      
      if (!collaboration) {
        collaboration = await CaseCollaboration.findOne({
          collaborationId,
          tenantId
        });

        if (!collaboration) {
          return {
            success: false,
            message: 'Collaboration not found'
          };
        }

        // Cache for future requests
        await CacheService.cacheCollaboration(collaborationId, collaboration);
      }

      // Check user access
      const accessCheck = collaboration.hasUserAccess(userId);
      if (!accessCheck.hasAccess) {
        return {
          success: false,
          message: 'Access denied'
        };
      }

      return {
        success: true,
        data: {
          ...collaboration.toObject(),
          userPermissions: accessCheck.permissions
        }
      };
    } catch (error) {
      logger.error('Get collaboration error:', error);
      throw new Error('Failed to retrieve collaboration');
    }
  }

  // Get user's collaborations
  async getUserCollaborations(userId, tenantId, options = {}) {
    try {
      // Try cache first
      let collaborations = await CacheService.getUserCollaborations(userId, tenantId);

      if (!collaborations) {
        collaborations = await CaseCollaboration.findByUser(userId, tenantId, options);
        
        // Cache the results
        await CacheService.cacheUserCollaborations(userId, tenantId, collaborations);
      }

      return {
        success: true,
        data: collaborations
      };
    } catch (error) {
      logger.error('Get user collaborations error:', error);
      throw new Error('Failed to retrieve user collaborations');
    }
  }

  // Update collaboration permissions
  async updatePermissions(collaborationId, userId, permissions, currentUser) {
    try {
      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: currentUser.tenantId
      });

      if (!collaboration) {
        return {
          success: false,
          message: 'Collaboration not found'
        };
      }

      // Check if current user can modify permissions
      if (collaboration.sharedBy.userId !== currentUser.userId) {
        return {
          success: false,
          message: 'Only the case owner can modify permissions'
        };
      }

      // Update permissions
      const updated = collaboration.updatePermissions(userId, permissions);

      if (!updated) {
        return {
          success: false,
          message: 'User not found in collaboration'
        };
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

      return {
        success: true,
        message: 'Permissions updated successfully',
        data: collaboration
      };
    } catch (error) {
      logger.error('Update permissions error:', error);
      throw new Error('Failed to update permissions');
    }
  }

  // Add participant to collaboration
  async addParticipant(collaborationId, userDetails, permissions, currentUser) {
    try {
      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: currentUser.tenantId
      });

      if (!collaboration) {
        return {
          success: false,
          message: 'Collaboration not found'
        };
      }

      // Check if current user can add participants
      if (collaboration.sharedBy.userId !== currentUser.userId) {
        return {
          success: false,
          message: 'Only the case owner can add participants'
        };
      }

      // Add participant
      collaboration.addParticipant(userDetails, permissions);
      await collaboration.save();

      // Invalidate cache
      await CacheService.invalidateCollaboration(collaborationId);
      await CacheService.invalidateUserCollaborations(userDetails.userId, currentUser.tenantId);

      logger.logCollaboration('PARTICIPANT_ADDED', collaboration.caseId, {
        collaborationId,
        newParticipant: { ...userDetails, permissions }
      }, currentUser);

      return {
        success: true,
        message: 'Participant added successfully',
        data: collaboration
      };
    } catch (error) {
      logger.error('Add participant error:', error);
      throw new Error('Failed to add participant');
    }
  }

  // Remove participant from collaboration
  async removeParticipant(collaborationId, userId, currentUser) {
    try {
      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: currentUser.tenantId
      });

      if (!collaboration) {
        return {
          success: false,
          message: 'Collaboration not found'
        };
      }

      // Check if current user can remove participants
      if (collaboration.sharedBy.userId !== currentUser.userId) {
        return {
          success: false,
          message: 'Only the case owner can remove participants'
        };
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

      return {
        success: true,
        message: 'Participant removed successfully',
        data: collaboration
      };
    } catch (error) {
      logger.error('Remove participant error:', error);
      throw new Error('Failed to remove participant');
    }
  }

  // Update collaboration status
  async updateStatus(collaborationId, status, currentUser) {
    try {
      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: currentUser.tenantId
      });

      if (!collaboration) {
        return {
          success: false,
          message: 'Collaboration not found'
        };
      }

      // Check if current user can update status
      if (collaboration.sharedBy.userId !== currentUser.userId) {
        return {
          success: false,
          message: 'Only the case owner can update status'
        };
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

      return {
        success: true,
        message: 'Status updated successfully',
        data: collaboration
      };
    } catch (error) {
      logger.error('Update status error:', error);
      throw new Error('Failed to update status');
    }
  }

  // Get collaboration statistics
  async getCollaborationStats(tenantId, branchId, period = '30d') {
    try {
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

      return {
        success: true,
        data: {
          ...result,
          period,
          dateRange: { startDate, endDate }
        }
      };
    } catch (error) {
      logger.error('Get collaboration stats error:', error);
      throw new Error('Failed to retrieve statistics');
    }
  }
}

module.exports = new CollaborationService();