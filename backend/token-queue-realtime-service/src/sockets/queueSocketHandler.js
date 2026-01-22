const logger = require('../utils/logger');
const TokenService = require('../services/TokenService');
const QueueService = require('../services/QueueService');

class QueueSocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map(); // Store client info
    this.queueRooms = new Map(); // Track queue room subscriptions
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Store client information
      this.connectedClients.set(socket.id, {
        userId: socket.user?.userId,
        userName: socket.user?.userName,
        userRole: socket.user?.userRole,
        tenantId: socket.user?.tenantId,
        branchId: socket.user?.branchId,
        connectedAt: new Date()
      });

      // Join queue room based on user role and permissions
      this.handleJoinQueue(socket);
      
      // Handle queue-related events
      this.handleQueueEvents(socket);
      
      // Handle token events
      this.handleTokenEvents(socket);
      
      // Handle doctor events
      this.handleDoctorEvents(socket);
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  handleJoinQueue(socket) {
    socket.on('join-queue', async (data) => {
      try {
        const { branchId, doctorId, queueType } = data;
        const client = this.connectedClients.get(socket.id);
        
        if (!client) {
          socket.emit('error', { message: 'Client not authenticated' });
          return;
        }

        // Validate permissions
        if (!this.validateQueueAccess(client, branchId, doctorId, queueType)) {
          socket.emit('error', { message: 'Access denied to queue' });
          return;
        }

        const roomName = this.getQueueRoomName(branchId, doctorId);
        
        // Leave previous rooms
        socket.rooms.forEach(room => {
          if (room !== socket.id && room.startsWith('queue_')) {
            socket.leave(room);
          }
        });
        
        // Join new room
        socket.join(roomName);
        
        // Track room subscription
        if (!this.queueRooms.has(roomName)) {
          this.queueRooms.set(roomName, new Set());
        }
        this.queueRooms.get(roomName).add(socket.id);
        
        // Send current queue status
        const queueStatus = await QueueService.getQueueStatus(branchId, doctorId, client.tenantId);
        socket.emit('queue-status', queueStatus);
        
        logger.info(`Client ${socket.id} joined queue room: ${roomName}`);
        
      } catch (error) {
        logger.error('Error joining queue:', error);
        socket.emit('error', { message: 'Failed to join queue' });
      }
    });

    socket.on('leave-queue', (data) => {
      const { branchId, doctorId } = data;
      const roomName = this.getQueueRoomName(branchId, doctorId);
      
      socket.leave(roomName);
      
      if (this.queueRooms.has(roomName)) {
        this.queueRooms.get(roomName).delete(socket.id);
      }
      
      logger.info(`Client ${socket.id} left queue room: ${roomName}`);
    });
  }

  handleQueueEvents(socket) {
    socket.on('get-queue-status', async (data) => {
      try {
        const { branchId, doctorId } = data;
        const client = this.connectedClients.get(socket.id);
        
        const queueStatus = await QueueService.getQueueStatus(branchId, doctorId, client.tenantId);
        socket.emit('queue-status', queueStatus);
        
      } catch (error) {
        logger.error('Error getting queue status:', error);
        socket.emit('error', { message: 'Failed to get queue status' });
      }
    });

    socket.on('pause-queue', async (data) => {
      try {
        const { branchId, doctorId, reason } = data;
        const client = this.connectedClients.get(socket.id);
        
        if (!this.validateDoctorAccess(client, doctorId)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const userInfo = {
          userId: client.userId,
          userName: client.userName,
          userRole: client.userRole
        };

        const queue = await QueueService.pauseQueue(branchId, doctorId, reason, userInfo);
        
        // Broadcast to all clients in the queue room
        const roomName = this.getQueueRoomName(branchId, doctorId);
        this.io.to(roomName).emit('queue-paused', {
          queue,
          reason,
          pausedBy: client.userName
        });
        
      } catch (error) {
        logger.error('Error pausing queue:', error);
        socket.emit('error', { message: 'Failed to pause queue' });
      }
    });

    socket.on('resume-queue', async (data) => {
      try {
        const { branchId, doctorId } = data;
        const client = this.connectedClients.get(socket.id);
        
        if (!this.validateDoctorAccess(client, doctorId)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const userInfo = {
          userId: client.userId,
          userName: client.userName,
          userRole: client.userRole
        };

        const queue = await QueueService.resumeQueue(branchId, doctorId, userInfo);
        
        // Broadcast to all clients in the queue room
        const roomName = this.getQueueRoomName(branchId, doctorId);
        this.io.to(roomName).emit('queue-resumed', {
          queue,
          resumedBy: client.userName
        });
        
      } catch (error) {
        logger.error('Error resuming queue:', error);
        socket.emit('error', { message: 'Failed to resume queue' });
      }
    });
  }

  handleTokenEvents(socket) {
    socket.on('call-next-token', async (data) => {
      try {
        const { branchId, doctorId } = data;
        const client = this.connectedClients.get(socket.id);
        
        if (!this.validateDoctorAccess(client, doctorId)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const userInfo = {
          userId: client.userId,
          userName: client.userName,
          userRole: client.userRole
        };

        const result = await QueueService.callNextToken(branchId, doctorId, userInfo);
        
        // Broadcast to all clients in the queue room
        const roomName = this.getQueueRoomName(branchId, doctorId);
        this.io.to(roomName).emit('token-called', {
          token: result.token,
          queue: result.queue,
          calledBy: client.userName
        });
        
        // Update queue status for all clients
        const queueStatus = await QueueService.getQueueStatus(branchId, doctorId, client.tenantId);
        this.io.to(roomName).emit('queue-updated', queueStatus);
        
      } catch (error) {
        logger.error('Error calling next token:', error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('skip-token', async (data) => {
      try {
        const { tokenId, reason } = data;
        const client = this.connectedClients.get(socket.id);

        const userInfo = {
          userId: client.userId,
          userName: client.userName,
          userRole: client.userRole
        };

        const token = await TokenService.skipToken(tokenId, reason, userInfo);
        
        // Broadcast to queue room
        const roomName = this.getQueueRoomName(token.branchId, token.doctorId);
        this.io.to(roomName).emit('token-skipped', {
          token,
          reason,
          skippedBy: client.userName
        });
        
        // Update queue status
        const queueStatus = await QueueService.getQueueStatus(token.branchId, token.doctorId, client.tenantId);
        this.io.to(roomName).emit('queue-updated', queueStatus);
        
      } catch (error) {
        logger.error('Error skipping token:', error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('complete-token', async (data) => {
      try {
        const { tokenId } = data;
        const client = this.connectedClients.get(socket.id);

        const userInfo = {
          userId: client.userId,
          userName: client.userName,
          userRole: client.userRole
        };

        const token = await TokenService.completeToken(tokenId, userInfo);
        
        // Broadcast to queue room
        const roomName = this.getQueueRoomName(token.branchId, token.doctorId);
        this.io.to(roomName).emit('token-completed', {
          token,
          completedBy: client.userName
        });
        
        // Update queue status
        const queueStatus = await QueueService.getQueueStatus(token.branchId, token.doctorId, client.tenantId);
        this.io.to(roomName).emit('queue-updated', queueStatus);
        
      } catch (error) {
        logger.error('Error completing token:', error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('check-in-token', async (data) => {
      try {
        const { tokenId, checkinData } = data;
        const client = this.connectedClients.get(socket.id);

        const userInfo = {
          userId: client.userId,
          userName: client.userName,
          userRole: client.userRole
        };

        const token = await TokenService.checkInToken(tokenId, checkinData, userInfo);
        
        // Broadcast to queue room
        const roomName = this.getQueueRoomName(token.branchId, token.doctorId);
        this.io.to(roomName).emit('token-checked-in', {
          token,
          checkedInBy: client.userName
        });
        
        // Update queue status
        const queueStatus = await QueueService.getQueueStatus(token.branchId, token.doctorId, client.tenantId);
        this.io.to(roomName).emit('queue-updated', queueStatus);
        
      } catch (error) {
        logger.error('Error checking in token:', error);
        socket.emit('error', { message: error.message });
      }
    });
  }

  handleDoctorEvents(socket) {
    socket.on('get-my-queue', async (data) => {
      try {
        const client = this.connectedClients.get(socket.id);
        
        if (client.userRole !== 'DOCTOR') {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const queueStatus = await QueueService.getQueueStatus(
          client.branchId, 
          client.userId, 
          client.tenantId
        );
        
        socket.emit('my-queue-status', queueStatus);
        
      } catch (error) {
        logger.error('Error getting doctor queue:', error);
        socket.emit('error', { message: 'Failed to get queue status' });
      }
    });

    socket.on('update-queue-settings', async (data) => {
      try {
        const { branchId, doctorId, settings } = data;
        const client = this.connectedClients.get(socket.id);
        
        if (!this.validateDoctorAccess(client, doctorId)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const userInfo = {
          userId: client.userId,
          userName: client.userName,
          userRole: client.userRole
        };

        const queue = await QueueService.updateQueueSettings(branchId, doctorId, settings, userInfo);
        
        socket.emit('queue-settings-updated', { queue });
        
      } catch (error) {
        logger.error('Error updating queue settings:', error);
        socket.emit('error', { message: 'Failed to update queue settings' });
      }
    });
  }

  handleDisconnect(socket) {
    logger.info(`Client disconnected: ${socket.id}`);
    
    // Clean up client tracking
    this.connectedClients.delete(socket.id);
    
    // Clean up room tracking
    this.queueRooms.forEach((clients, roomName) => {
      clients.delete(socket.id);
      if (clients.size === 0) {
        this.queueRooms.delete(roomName);
      }
    });
  }

  // Utility methods
  getQueueRoomName(branchId, doctorId) {
    return `queue_${branchId}_${doctorId}`;
  }

  validateQueueAccess(client, branchId, doctorId, queueType) {
    // Branch access validation
    if (client.branchId !== branchId && client.userRole !== 'CENTRAL_ADMIN') {
      return false;
    }

    // Role-based access
    const allowedRoles = ['DOCTOR', 'RECEPTIONIST', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(client.userRole)) {
      return false;
    }

    // Doctor-specific queue access
    if (queueType === 'doctor' && client.userRole === 'DOCTOR' && client.userId !== doctorId) {
      return false;
    }

    return true;
  }

  validateDoctorAccess(client, doctorId) {
    return client.userRole === 'DOCTOR' && client.userId === doctorId ||
           client.userRole === 'BRANCH_ADMIN' ||
           client.userRole === 'CENTRAL_ADMIN';
  }

  // Public methods for broadcasting from other services
  broadcastToQueue(branchId, doctorId, event, data) {
    const roomName = this.getQueueRoomName(branchId, doctorId);
    this.io.to(roomName).emit(event, data);
  }

  broadcastToAllQueues(branchId, event, data) {
    // Broadcast to all queue rooms in a branch
    this.queueRooms.forEach((clients, roomName) => {
      if (roomName.includes(`queue_${branchId}_`)) {
        this.io.to(roomName).emit(event, data);
      }
    });
  }

  getConnectedClients() {
    return Array.from(this.connectedClients.values());
  }

  getQueueRoomClients(branchId, doctorId) {
    const roomName = this.getQueueRoomName(branchId, doctorId);
    const clientIds = this.queueRooms.get(roomName) || new Set();
    
    return Array.from(clientIds).map(id => this.connectedClients.get(id)).filter(Boolean);
  }
}

module.exports = (io) => {
  return new QueueSocketHandler(io);
};