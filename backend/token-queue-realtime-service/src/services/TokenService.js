const Token = require('../models/Token');
const Queue = require('../models/Queue');
const QueueAudit = require('../models/QueueAudit');
const QRCode = require('qrcode');
const logger = require('../utils/logger');
const config = require('../config/config');

class TokenService {
  
  async generateToken(tokenData, userInfo) {
    try {
      const {
        patientId,
        patientName,
        patientPhone,
        doctorId,
        doctorName,
        departmentId,
        departmentName,
        branchId,
        tenantId,
        tokenType = 'WALK_IN',
        appointmentId,
        scheduledTime
      } = tokenData;

      // Find or create queue
      const queue = await Queue.findOrCreateQueue(
        branchId, doctorId, doctorName, departmentId, departmentName, tenantId
      );

      // Generate token number
      const tokenNumber = await Token.generateTokenNumber(branchId, doctorId, tokenType);

      // Generate QR code
      const qrData = {
        tokenId: null, // Will be set after save
        branchId,
        doctorId,
        tokenNumber,
        patientId
      };
      
      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

      // Create token
      const token = new Token({
        tokenNumber,
        tokenType,
        patientId,
        patientName,
        patientPhone,
        doctorId,
        doctorName,
        departmentId,
        departmentName,
        branchId,
        tenantId,
        appointmentId,
        scheduledTime,
        qrCode,
        status: 'GENERATED'
      });

      await token.save();

      // Update QR code with actual token ID
      qrData.tokenId = token._id.toString();
      token.qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      await token.save();

      // Update queue statistics
      queue.totalTokens += 1;
      queue.waitingTokens += 1;
      
      if (tokenType === 'APPOINTMENT') {
        queue.statistics.todayAppointments += 1;
      } else if (tokenType === 'WALK_IN') {
        queue.statistics.todayWalkIns += 1;
      }
      
      await queue.save();

      // Calculate queue position and estimated wait time
      await this.updateTokenPosition(token._id);

      // Log audit
      await QueueAudit.logAction({
        tokenId: token._id,
        queueId: queue.queueId,
        action: 'TOKEN_GENERATED',
        performedBy: userInfo,
        newState: {
          tokenNumber: token.tokenNumber,
          tokenType: token.tokenType,
          status: token.status
        },
        branchId,
        tenantId
      });

      logger.info(`Token generated: ${token.displayToken} for patient ${patientName}`);
      
      return await Token.findById(token._id);
      
    } catch (error) {
      logger.error('Error generating token:', error);
      throw error;
    }
  }

  async updateTokenPosition(tokenId) {
    try {
      const token = await Token.findById(tokenId);
      if (!token) throw new Error('Token not found');

      // Get all waiting tokens in the same queue
      const waitingTokens = await Token.find({
        branchId: token.branchId,
        doctorId: token.doctorId,
        status: { $in: ['GENERATED', 'WAITING', 'CHECKED_IN'] }
      }).sort({
        tokenType: 1, // APPOINTMENT first
        scheduledTime: 1,
        createdAt: 1
      });

      // Update positions and estimated wait times
      const queue = await Queue.findOne({ 
        branchId: token.branchId, 
        doctorId: token.doctorId 
      });

      for (let i = 0; i < waitingTokens.length; i++) {
        const currentToken = waitingTokens[i];
        currentToken.queuePosition = i + 1;
        currentToken.estimatedWaitTime = queue.calculateWaitTime(i + 1);
        await currentToken.save();
      }

      return waitingTokens;
      
    } catch (error) {
      logger.error('Error updating token positions:', error);
      throw error;
    }
  }

  async checkInToken(tokenId, checkinData, userInfo) {
    try {
      const token = await Token.findById(tokenId);
      if (!token) throw new Error('Token not found');

      if (token.status !== 'GENERATED' && token.status !== 'WAITING') {
        throw new Error('Token cannot be checked in');
      }

      const previousState = { status: token.status };
      
      await token.updateStatus('CHECKED_IN', {
        checkinMethod: checkinData.method, // QR, NFC, MANUAL
        checkinLocation: checkinData.location,
        checkinDevice: checkinData.device
      });

      // Log audit
      await QueueAudit.logAction({
        tokenId: token._id,
        queueId: `${token.branchId}_${token.doctorId}`,
        action: 'TOKEN_CHECKED_IN',
        performedBy: userInfo,
        previousState,
        newState: { status: token.status, checkedInAt: token.checkedInAt },
        metadata: new Map(Object.entries(checkinData)),
        branchId: token.branchId,
        tenantId: token.tenantId
      });

      logger.info(`Token checked in: ${token.displayToken}`);
      
      return token;
      
    } catch (error) {
      logger.error('Error checking in token:', error);
      throw error;
    }
  }

  async getQueueTokens(branchId, doctorId, includeCompleted = false) {
    try {
      const statuses = includeCompleted 
        ? [] 
        : ['GENERATED', 'WAITING', 'CHECKED_IN', 'IN_CONSULTATION'];
      
      const tokens = await Token.getQueueTokens(branchId, doctorId, statuses);
      
      return tokens;
      
    } catch (error) {
      logger.error('Error getting queue tokens:', error);
      throw error;
    }
  }

  async getPatientTokens(patientId, branchId, tenantId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tokens = await Token.find({
        patientId,
        branchId,
        tenantId,
        createdAt: { $gte: today }
      }).sort({ createdAt: -1 });
      
      return tokens;
      
    } catch (error) {
      logger.error('Error getting patient tokens:', error);
      throw error;
    }
  }

  async skipToken(tokenId, reason, userInfo) {
    try {
      const token = await Token.findById(tokenId);
      if (!token) throw new Error('Token not found');

      const previousState = { 
        status: token.status, 
        skipCount: token.skipCount 
      };
      
      await token.skip(reason);

      // Update queue statistics
      const queue = await Queue.findOne({ 
        branchId: token.branchId, 
        doctorId: token.doctorId 
      });
      
      if (queue) {
        queue.statistics.todaySkipped += 1;
        queue.waitingTokens = Math.max(0, queue.waitingTokens - 1);
        await queue.save();
      }

      // Recalculate positions for remaining tokens
      await this.updateTokenPosition(tokenId);

      // Log audit
      await QueueAudit.logAction({
        tokenId: token._id,
        queueId: `${token.branchId}_${token.doctorId}`,
        action: 'TOKEN_SKIPPED',
        performedBy: userInfo,
        previousState,
        newState: { 
          status: token.status, 
          skipCount: token.skipCount,
          skipReason: token.skipReason
        },
        reason,
        branchId: token.branchId,
        tenantId: token.tenantId
      });

      logger.info(`Token skipped: ${token.displayToken}, reason: ${reason}`);
      
      return token;
      
    } catch (error) {
      logger.error('Error skipping token:', error);
      throw error;
    }
  }

  async completeToken(tokenId, userInfo) {
    try {
      const token = await Token.findById(tokenId);
      if (!token) throw new Error('Token not found');

      if (token.status !== 'IN_CONSULTATION') {
        throw new Error('Token is not in consultation');
      }

      const previousState = { status: token.status };
      
      await token.updateStatus('COMPLETED');

      // Update queue statistics
      const queue = await Queue.findOne({ 
        branchId: token.branchId, 
        doctorId: token.doctorId 
      });
      
      if (queue) {
        queue.completedTokens += 1;
        queue.waitingTokens = Math.max(0, queue.waitingTokens - 1);
        
        // Update average consultation time
        if (token.consultationStartedAt && token.consultationEndedAt) {
          const consultationTime = Math.round(
            (token.consultationEndedAt - token.consultationStartedAt) / (1000 * 60)
          );
          
          queue.averageConsultationTime = Math.round(
            (queue.averageConsultationTime + consultationTime) / 2
          );
        }
        
        await queue.save();
      }

      // Log audit
      await QueueAudit.logAction({
        tokenId: token._id,
        queueId: `${token.branchId}_${token.doctorId}`,
        action: 'TOKEN_COMPLETED',
        performedBy: userInfo,
        previousState,
        newState: { 
          status: token.status, 
          consultationEndedAt: token.consultationEndedAt
        },
        branchId: token.branchId,
        tenantId: token.tenantId
      });

      logger.info(`Token completed: ${token.displayToken}`);
      
      return token;
      
    } catch (error) {
      logger.error('Error completing token:', error);
      throw error;
    }
  }

  async markNoShow(tokenId, userInfo) {
    try {
      const token = await Token.findById(tokenId);
      if (!token) throw new Error('Token not found');

      const previousState = { status: token.status };
      
      await token.updateStatus('NO_SHOW');

      // Update queue statistics
      const queue = await Queue.findOne({ 
        branchId: token.branchId, 
        doctorId: token.doctorId 
      });
      
      if (queue) {
        queue.statistics.todayNoShows += 1;
        queue.waitingTokens = Math.max(0, queue.waitingTokens - 1);
        await queue.save();
      }

      // Recalculate positions for remaining tokens
      await this.updateTokenPosition(tokenId);

      // Log audit
      await QueueAudit.logAction({
        tokenId: token._id,
        queueId: `${token.branchId}_${token.doctorId}`,
        action: 'TOKEN_NO_SHOW',
        performedBy: userInfo,
        previousState,
        newState: { status: token.status },
        branchId: token.branchId,
        tenantId: token.tenantId
      });

      logger.info(`Token marked as no-show: ${token.displayToken}`);
      
      return token;
      
    } catch (error) {
      logger.error('Error marking token as no-show:', error);
      throw error;
    }
  }

  async validateTokenForCheckin(tokenData) {
    try {
      const { tokenId, branchId, doctorId, patientId } = tokenData;
      
      const token = await Token.findById(tokenId);
      
      if (!token) {
        return { valid: false, reason: 'Token not found' };
      }
      
      if (token.branchId !== branchId) {
        return { valid: false, reason: 'Invalid branch' };
      }
      
      if (token.doctorId !== doctorId) {
        return { valid: false, reason: 'Invalid doctor' };
      }
      
      if (token.patientId !== patientId) {
        return { valid: false, reason: 'Invalid patient' };
      }
      
      if (token.status !== 'GENERATED' && token.status !== 'WAITING') {
        return { valid: false, reason: 'Token already processed' };
      }
      
      // Check if token is for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (token.createdAt < today) {
        return { valid: false, reason: 'Token expired' };
      }
      
      return { valid: true, token };
      
    } catch (error) {
      logger.error('Error validating token:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }
}

module.exports = new TokenService();