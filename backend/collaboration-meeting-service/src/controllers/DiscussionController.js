const { v4: uuidv4 } = require('uuid');
const Discussion = require('../models/Discussion');
const CaseCollaboration = require('../models/CaseCollaboration');
const CacheService = require('../services/CacheService');
const logger = require('../utils/logger');

class DiscussionController {
  // Create a new discussion/comment
  async createDiscussion(req, res) {
    try {
      const {
        caseId,
        collaborationId,
        content,
        discussionType = 'COMMENT',
        parentDiscussionId = null,
        meetingId = null,
        mentions = [],
        metadata = {}
      } = req.body;
      
      const author = req.user;

      // Verify user has access to the collaboration
      const collaboration = await CaseCollaboration.findOne({
        collaborationId,
        tenantId: author.tenantId
      });

      if (!collaboration) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration not found'
        });
      }

      const accessCheck = collaboration.hasUserAccess(author.userId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this collaboration'
        });
      }

      // Check if user has comment permissions
      if (accessCheck.permissions === 'VIEW_ONLY' && discussionType !== 'COMMENT') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create this type of discussion'
        });
      }

      const discussionId = uuidv4();

      const discussion = new Discussion({
        discussionId,
        caseId,
        collaborationId,
        tenantId: author.tenantId,
        branchId: author.branchId,
        author: {
          userId: author.userId,
          name: author.name,
          role: author.role
        },
        content,
        discussionType,
        parentDiscussionId,
        meetingId,
        mentions,
        metadata: {
          isPrivate: metadata.isPrivate || false,
          priority: metadata.priority || 'MEDIUM',
          tags: metadata.tags || []
        }
      });

      await discussion.save();

      // Update collaboration metadata
      collaboration.metadata.totalComments += 1;
      collaboration.metadata.lastActivity = new Date();
      await collaboration.save();

      // Invalidate cache
      await CacheService.invalidateDiscussions(caseId, author.tenantId);
      await CacheService.invalidateCollaboration(collaborationId);

      logger.logCollaboration('DISCUSSION_CREATED', caseId, {
        discussionId,
        discussionType,
        parentDiscussionId,
        meetingId
      }, author);

      res.status(201).json({
        success: true,
        message: 'Discussion created successfully',
        data: discussion
      });
    } catch (error) {
      logger.error('Create discussion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create discussion'
      });
    }
  }

  // Get discussions for a case
  async getDiscussions(req, res) {
    try {
      const { caseId } = req.params;
      const { 
        parentOnly = false, 
        meetingId = null, 
        limit = 50, 
        page = 1,
        sortOrder = 'asc'
      } = req.query;
      
      const { tenantId, userId } = req.user;

      // Try cache first
      let discussions = await CacheService.getDiscussions(caseId, tenantId);

      if (!discussions) {
        const options = {
          parentOnly: parentOnly === 'true',
          meetingId,
          limit: parseInt(limit),
          sortOrder
        };

        discussions = await Discussion.findByCaseId(caseId, tenantId, options);
        
        // Cache the results
        await CacheService.cacheDiscussions(caseId, tenantId, discussions);
      }

      // Filter discussions based on user permissions and visibility
      const filteredDiscussions = discussions.filter(discussion => {
        if (discussion.metadata.isPrivate && discussion.author.userId !== userId) {
          return false;
        }
        return true;
      });

      res.json({
        success: true,
        data: filteredDiscussions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredDiscussions.length
        }
      });
    } catch (error) {
      logger.error('Get discussions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve discussions'
      });
    }
  }

  // Get discussion thread (parent + replies)
  async getDiscussionThread(req, res) {
    try {
      const { discussionId } = req.params;
      const { tenantId, userId } = req.user;

      const thread = await Discussion.findThread(discussionId, tenantId);

      if (!thread || thread.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Discussion thread not found'
        });
      }

      // Filter based on user permissions
      const filteredThread = thread.filter(discussion => {
        if (discussion.metadata.isPrivate && discussion.author.userId !== userId) {
          return false;
        }
        return true;
      });

      res.json({
        success: true,
        data: filteredThread
      });
    } catch (error) {
      logger.error('Get discussion thread error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve discussion thread'
      });
    }
  }

  // Update discussion content
  async updateDiscussion(req, res) {
    try {
      const { discussionId } = req.params;
      const { content, editReason = '' } = req.body;
      const currentUser = req.user;

      const discussion = await Discussion.findOne({
        discussionId,
        tenantId: currentUser.tenantId
      });

      if (!discussion) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      // Check if user can edit
      if (!discussion.canUserEdit(currentUser.userId, currentUser.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied to edit this discussion'
        });
      }

      // Edit the discussion
      discussion.editContent(content, editReason);
      await discussion.save();

      // Invalidate cache
      await CacheService.invalidateDiscussions(discussion.caseId, currentUser.tenantId);

      logger.logCollaboration('DISCUSSION_UPDATED', discussion.caseId, {
        discussionId,
        editReason
      }, currentUser);

      res.json({
        success: true,
        message: 'Discussion updated successfully',
        data: discussion
      });
    } catch (error) {
      logger.error('Update discussion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update discussion'
      });
    }
  }

  // Delete discussion
  async deleteDiscussion(req, res) {
    try {
      const { discussionId } = req.params;
      const currentUser = req.user;

      const discussion = await Discussion.findOne({
        discussionId,
        tenantId: currentUser.tenantId
      });

      if (!discussion) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      // Check if user can delete
      if (!discussion.canUserEdit(currentUser.userId, currentUser.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied to delete this discussion'
        });
      }

      // Soft delete
      discussion.status = 'DELETED';
      await discussion.save();

      // Invalidate cache
      await CacheService.invalidateDiscussions(discussion.caseId, currentUser.tenantId);

      logger.logCollaboration('DISCUSSION_DELETED', discussion.caseId, {
        discussionId
      }, currentUser);

      res.json({
        success: true,
        message: 'Discussion deleted successfully'
      });
    } catch (error) {
      logger.error('Delete discussion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete discussion'
      });
    }
  }

  // Add reaction to discussion
  async addReaction(req, res) {
    try {
      const { discussionId } = req.params;
      const { reaction } = req.body;
      const currentUser = req.user;

      const discussion = await Discussion.findOne({
        discussionId,
        tenantId: currentUser.tenantId
      });

      if (!discussion) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      // Add or update reaction
      discussion.addReaction(currentUser.userId, currentUser.name, reaction);
      await discussion.save();

      // Invalidate cache
      await CacheService.invalidateDiscussions(discussion.caseId, currentUser.tenantId);

      logger.logCollaboration('REACTION_ADDED', discussion.caseId, {
        discussionId,
        reaction
      }, currentUser);

      res.json({
        success: true,
        message: 'Reaction added successfully',
        data: discussion
      });
    } catch (error) {
      logger.error('Add reaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add reaction'
      });
    }
  }

  // Remove reaction from discussion
  async removeReaction(req, res) {
    try {
      const { discussionId } = req.params;
      const currentUser = req.user;

      const discussion = await Discussion.findOne({
        discussionId,
        tenantId: currentUser.tenantId
      });

      if (!discussion) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      // Remove reaction
      discussion.removeReaction(currentUser.userId);
      await discussion.save();

      // Invalidate cache
      await CacheService.invalidateDiscussions(discussion.caseId, currentUser.tenantId);

      logger.logCollaboration('REACTION_REMOVED', discussion.caseId, {
        discussionId
      }, currentUser);

      res.json({
        success: true,
        message: 'Reaction removed successfully',
        data: discussion
      });
    } catch (error) {
      logger.error('Remove reaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove reaction'
      });
    }
  }

  // Mark discussion as read
  async markAsRead(req, res) {
    try {
      const { discussionId } = req.params;
      const currentUser = req.user;

      const discussion = await Discussion.findOne({
        discussionId,
        tenantId: currentUser.tenantId
      });

      if (!discussion) {
        return res.status(404).json({
          success: false,
          message: 'Discussion not found'
        });
      }

      // Mark as read
      discussion.markAsRead(currentUser.userId);
      await discussion.save();

      res.json({
        success: true,
        message: 'Discussion marked as read'
      });
    } catch (error) {
      logger.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark discussion as read'
      });
    }
  }

  // Get discussion statistics
  async getDiscussionStats(req, res) {
    try {
      const { caseId } = req.params;
      const { tenantId } = req.user;

      const stats = await Discussion.aggregate([
        {
          $match: {
            caseId,
            tenantId,
            status: { $ne: 'DELETED' }
          }
        },
        {
          $group: {
            _id: null,
            totalDiscussions: { $sum: 1 },
            totalReactions: { $sum: { $size: '$reactions' } },
            discussionsByType: {
              $push: '$discussionType'
            },
            participantCount: {
              $addToSet: '$author.userId'
            }
          }
        },
        {
          $project: {
            totalDiscussions: 1,
            totalReactions: 1,
            participantCount: { $size: '$participantCount' },
            discussionTypes: {
              $reduce: {
                input: '$discussionsByType',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[{
                        k: '$$this',
                        v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] }
                      }]]
                    }
                  ]
                }
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalDiscussions: 0,
        totalReactions: 0,
        participantCount: 0,
        discussionTypes: {}
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get discussion stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve discussion statistics'
      });
    }
  }
}

module.exports = new DiscussionController();