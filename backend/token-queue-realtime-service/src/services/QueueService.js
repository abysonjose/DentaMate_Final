const Queue = require('../models/Queue');
const Token = require('../models/Token');
const QueueAudit = require('../models/QueueAudit');
const logger = require('../utils/logger');

class QueueService {
  
  async getQueueStatus(branchId, doctorId, tenantId) {
    try {
      const queue = await Queue.findOne({ branchId, doctorId, tenantId });
      if (!queue) {
        throw new Error('Queue not found');
      }

      // Get current tokens in queue
      const tokens = await Token.getQueueTokens(branchId, doctorId, [
        'GENERATED', 'WAITING', 'CHECKED_IN', 'IN_CONSULTATION'
      ]);

      // Get current token being served
      let currentToken = null;
      if (queue.currentTokenId) {
        currentToken = await Token.findById(queue.currentTokenId);
      }

      return {
        queue,
        tokens,
        currentToken,
        queueLength: tokens.length,
        estimatedWaitTime: this.calculateQueueWaitTime(tokens, queue.averageConsultationTime)
      };
      
    } catch (error) {
      logger.error('Error getting queue status:', error);
      throw error;
    }
  }

  async getAllQueues(branchId, tenantId) {
    try {
      const queues = await Queue.getActiveQueues(branchId, tenantId);
      
      const queueStatuses = await Promise.all(
        queues.map(async (queue) => {
          const tokens = await Token.getQueueTokens(queue.branchId, queue.doctorId, [
            'GENERATED', 'WAITING', 'CHECKED_IN', 'IN_CONSULTATION'
          ]);
          
          return {
            ...queue.toObject(),
            currentQueueLength: tokens.length,
            waitingPatients: tokens.filter(t => 
              ['GENERATED', 'WAITING', 'CHECKED_IN'].includes(t.status)
            ).length
          };
        })
      );
      
      return queueStatuses;
      
    } catch (error) {
      logger.error('Error getting all queues:', error);
      throw error;
    }
  }

  async callNextToken(branchId, doctorId, userInfo) {
    try {
      const queue = await Queue.findOne({ branchId, doctorId });
      if (!queue) {
        throw new Error('Queue not found');
      }

      if (queue.status === 'PAUSED') {
        throw new Error('Queue is paused');
      }

      // Get next token in queue
      const nextToken = await Token.findOne({
        branchId,
        doctorId,
        status: { $in: ['GENERATED', 'WAITING', 'CHECKED_IN'] }
      }).sort({
        tokenType: 1, // APPOINTMENT first
        scheduledTime: 1,
        createdAt: 1
      });

      if (!nextToken) {
        throw new Error('No tokens in queue');
      }

      // Mark current token as in consultation
      const previousState = { status: nextToken.status };
      await nextToken.updateStatus('IN_CONSULTATION');

      // Update queue current token
      await queue.updateCurrentToken(nextToken._id, nextToken.tokenNumber);

      // Log audit
      await QueueAudit.logAction({
        tokenId: nextToken._id,
        queueId: queue.queueId,
        action: 'TOKEN_CALLED',
        performedBy: userInfo,
        previousState,
        newState: { 
          status: nextToken.status,
          consultationStartedAt: nextToken.consultationStartedAt
        },
        branchId,
        tenantId: queue.tenantId
      });

      logger.info(`Next token called: ${nextToken.displayToken} by ${userInfo.userName}`);
      
      return {
        token: nextToken,
        queue: await Queue.findById(queue._id)
      };
      
    } catch (error) {
      logger.error('Error calling next token:', error);
      throw error;
    }
  }

  async pauseQueue(branchId, doctorId, reason, userInfo) {
    try {
      const queue = await Queue.findOne({ branchId, doctorId });
      if (!queue) {
        throw new Error('Queue not found');
      }

      const previousState = { 
        status: queue.status,
        pausedAt: queue.pausedAt,
        pauseReason: queue.pauseReason
      };

      await queue.pause(reason);

      // Log audit
      await QueueAudit.logAction({
        tokenId: null,
        queueId: queue.queueId,
        action: 'QUEUE_PAUSED',
        performedBy: userInfo,
        previousState,
        newState: {
          status: queue.status,
          pausedAt: queue.pausedAt,
          pauseReason: queue.pauseReason
        },
        reason,
        branchId,
        tenantId: queue.tenantId
      });

      logger.info(`Queue paused: ${queue.queueId}, reason: ${reason}`);
      
      return queue;
      
    } catch (error) {
      logger.error('Error pausing queue:', error);
      throw error;
    }
  }

  async resumeQueue(branchId, doctorId, userInfo) {
    try {
      const queue = await Queue.findOne({ branchId, doctorId });
      if (!queue) {
        throw new Error('Queue not found');
      }

      const previousState = { 
        status: queue.status,
        pausedAt: queue.pausedAt,
        pauseReason: queue.pauseReason
      };

      await queue.resume();

      // Log audit
      await QueueAudit.logAction({
        tokenId: null,
        queueId: queue.queueId,
        action: 'QUEUE_RESUMED',
        performedBy: userInfo,
        previousState,
        newState: {
          status: queue.status,
          pausedAt: queue.pausedAt,
          pauseReason: queue.pauseReason
        },
        branchId,
        tenantId: queue.tenantId
      });

      logger.info(`Queue resumed: ${queue.queueId} by ${userInfo.userName}`);
      
      return queue;
      
    } catch (error) {
      logger.error('Error resuming queue:', error);
      throw error;
    }
  }

  async insertPriorityToken(tokenId, position, userInfo) {
    try {
      const token = await Token.findById(tokenId);
      if (!token) {
        throw new Error('Token not found');
      }

      // Get all tokens in the queue
      const queueTokens = await Token.find({
        branchId: token.branchId,
        doctorId: token.doctorId,
        status: { $in: ['GENERATED', 'WAITING', 'CHECKED_IN'] }
      }).sort({ queuePosition: 1 });

      // Reorder tokens
      const updatedTokens = [];
      let newPosition = 1;

      for (let i = 0; i < queueTokens.length; i++) {
        const currentToken = queueTokens[i];
        
        if (currentToken._id.toString() === tokenId) {
          currentToken.queuePosition = position;
          currentToken.tokenType = 'PRIORITY';
        } else if (newPosition === position) {
          // Insert priority token here
          newPosition++;
          currentToken.queuePosition = newPosition;
          newPosition++;
        } else {
          currentToken.queuePosition = newPosition;
          newPosition++;
        }
        
        await currentToken.save();
        updatedTokens.push(currentToken);
      }

      // Log audit
      await QueueAudit.logAction({
        tokenId: token._id,
        queueId: `${token.branchId}_${token.doctorId}`,
        action: 'PRIORITY_INSERTED',
        performedBy: userInfo,
        newState: {
          queuePosition: position,
          tokenType: 'PRIORITY'
        },
        metadata: new Map([['newPosition', position]]),
        branchId: token.branchId,
        tenantId: token.tenantId
      });

      logger.info(`Priority token inserted: ${token.displayToken} at position ${position}`);
      
      return updatedTokens;
      
    } catch (error) {
      logger.error('Error inserting priority token:', error);
      throw error;
    }
  }

  async reorderQueue(branchId, doctorId, tokenOrder, userInfo) {
    try {
      const queue = await Queue.findOne({ branchId, doctorId });
      if (!queue) {
        throw new Error('Queue not found');
      }

      // Update token positions based on new order
      const updatedTokens = [];
      
      for (let i = 0; i < tokenOrder.length; i++) {
        const token = await Token.findById(tokenOrder[i]);
        if (token) {
          token.queuePosition = i + 1;
          await token.save();
          updatedTokens.push(token);
        }
      }

      // Log audit
      await QueueAudit.logAction({
        tokenId: null,
        queueId: queue.queueId,
        action: 'QUEUE_REORDERED',
        performedBy: userInfo,
        newState: { tokenOrder },
        metadata: new Map([['reorderedTokens', tokenOrder.length]]),
        branchId,
        tenantId: queue.tenantId
      });

      logger.info(`Queue reordered: ${queue.queueId} with ${tokenOrder.length} tokens`);
      
      return updatedTokens;
      
    } catch (error) {
      logger.error('Error reordering queue:', error);
      throw error;
    }
  }

  async updateQueueSettings(branchId, doctorId, settings, userInfo) {
    try {
      const queue = await Queue.findOne({ branchId, doctorId });
      if (!queue) {
        throw new Error('Queue not found');
      }

      const previousSettings = { ...queue.settings };
      
      // Update settings
      Object.keys(settings).forEach(key => {
        if (queue.settings[key] !== undefined) {
          queue.settings[key] = settings[key];
        }
      });

      await queue.save();

      logger.info(`Queue settings updated: ${queue.queueId}`);
      
      return queue;
      
    } catch (error) {
      logger.error('Error updating queue settings:', error);
      throw error;
    }
  }

  calculateQueueWaitTime(tokens, avgConsultationTime) {
    if (!tokens || tokens.length === 0) return 0;
    
    const waitingTokens = tokens.filter(t => 
      ['GENERATED', 'WAITING', 'CHECKED_IN'].includes(t.status)
    );
    
    return waitingTokens.length * (avgConsultationTime + 5); // 5 min buffer
  }

  async getDailyQueueStatistics(branchId, tenantId, date = new Date()) {
    try {
      const stats = await Queue.getDailyStatistics(branchId, tenantId, date);
      return stats[0] || {
        totalQueues: 0,
        totalTokens: 0,
        totalCompleted: 0,
        totalWaiting: 0,
        avgWaitTime: 0,
        totalAppointments: 0,
        totalWalkIns: 0,
        totalNoShows: 0
      };
      
    } catch (error) {
      logger.error('Error getting daily queue statistics:', error);
      throw error;
    }
  }

  async getQueueAnalytics(branchId, doctorId, startDate, endDate) {
    try {
      const tokens = await Token.find({
        branchId,
        doctorId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const analytics = {
        totalTokens: tokens.length,
        completedTokens: tokens.filter(t => t.status === 'COMPLETED').length,
        noShowTokens: tokens.filter(t => t.status === 'NO_SHOW').length,
        skippedTokens: tokens.filter(t => t.status === 'SKIPPED').length,
        appointmentTokens: tokens.filter(t => t.tokenType === 'APPOINTMENT').length,
        walkInTokens: tokens.filter(t => t.tokenType === 'WALK_IN').length,
        priorityTokens: tokens.filter(t => t.tokenType === 'PRIORITY').length,
        averageWaitTime: 0,
        averageConsultationTime: 0
      };

      // Calculate average times
      const completedTokens = tokens.filter(t => 
        t.status === 'COMPLETED' && 
        t.checkedInAt && 
        t.consultationStartedAt &&
        t.consultationEndedAt
      );

      if (completedTokens.length > 0) {
        const totalWaitTime = completedTokens.reduce((sum, token) => {
          return sum + (token.consultationStartedAt - token.checkedInAt);
        }, 0);

        const totalConsultationTime = completedTokens.reduce((sum, token) => {
          return sum + (token.consultationEndedAt - token.consultationStartedAt);
        }, 0);

        analytics.averageWaitTime = Math.round(totalWaitTime / completedTokens.length / (1000 * 60));
        analytics.averageConsultationTime = Math.round(totalConsultationTime / completedTokens.length / (1000 * 60));
      }

      return analytics;
      
    } catch (error) {
      logger.error('Error getting queue analytics:', error);
      throw error;
    }
  }
}

module.exports = new QueueService();