const { Server } = require('socket.io');
const logger = require('../utils/logger');
const redisClient = require('../config/redis');

class InAppService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:4200",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io'
    });

    this.setupSocketHandlers();
    logger.info('In-App notification service initialized');
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.debug('Socket connected', { socketId: socket.id });

      // Handle user authentication
      socket.on('authenticate', async (data) => {
        try {
          const { token, userId, tenantId } = data;
          
          // Verify JWT token (simplified)
          if (this.verifyToken(token, tenantId)) {
            socket.userId = userId;
            socket.tenantId = tenantId;
            socket.authenticated = true;
            
            // Store user connection
            this.connectedUsers.set(userId, socket.id);
            
            // Join tenant room for broadcast messages
            socket.join(`tenant:${tenantId}`);
            
            // Join user-specific room
            socket.join(`user:${userId}`);

            socket.emit('authenticated', { success: true });
            
            // Send any pending notifications
            await this.sendPendingNotifications(userId, tenantId);
            
            logger.info('User authenticated for in-app notifications', {
              userId,
              tenantId,
              socketId: socket.id
            });
          } else {
            socket.emit('authentication_error', { message: 'Invalid token' });
          }
        } catch (error) {
          logger.error('Socket authentication failed', {
            error: error.message,
            socketId: socket.id
          });
          socket.emit('authentication_error', { message: 'Authentication failed' });
        }
      });

      // Handle notification acknowledgment
      socket.on('notification_read', async (data) => {
        try {
          const { notificationId } = data;
          await this.markNotificationAsRead(notificationId, socket.userId);
          
          logger.debug('Notification marked as read', {
            notificationId,
            userId: socket.userId
          });
        } catch (error) {
          logger.error('Failed to mark notification as read', {
            error: error.message,
            notificationId: data.notificationId
          });
        }
      });

      // Handle notification dismissal
      socket.on('notification_dismiss', async (data) => {
        try {
          const { notificationId } = data;
          await this.dismissNotification(notificationId, socket.userId);
          
          logger.debug('Notification dismissed', {
            notificationId,
            userId: socket.userId
          });
        } catch (error) {
          logger.error('Failed to dismiss notification', {
            error: error.message,
            notificationId: data.notificationId
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          logger.debug('User disconnected from in-app notifications', {
            userId: socket.userId,
            socketId: socket.id
          });
        }
      });
    });
  }

  async send(notification) {
    try {
      const inAppNotification = this.formatInAppNotification(notification);
      
      // Try to send to connected user first
      const sent = await this.sendToConnectedUser(
        notification.recipientId, 
        inAppNotification
      );

      if (sent) {
        logger.info('In-app notification sent to connected user', {
          notificationId: notification.notificationId,
          recipientId: notification.recipientId
        });

        return {
          success: true,
          externalId: notification.notificationId,
          providerDetails: {
            provider: 'in-app-realtime',
            deliveryMethod: 'socket',
            delivered: true
          }
        };
      } else {
        // Store for later delivery when user connects
        await this.storePendingNotification(notification.recipientId, inAppNotification);
        
        logger.info('In-app notification stored for offline user', {
          notificationId: notification.notificationId,
          recipientId: notification.recipientId
        });

        return {
          success: true,
          externalId: notification.notificationId,
          providerDetails: {
            provider: 'in-app-stored',
            deliveryMethod: 'pending',
            delivered: false
          }
        };
      }

    } catch (error) {
      logger.error('In-app notification sending failed', {
        notificationId: notification.notificationId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        errorDetails: {
          errorCode: 'IN_APP_SEND_FAILED',
          errorDescription: error.message
        }
      };
    }
  }

  formatInAppNotification(notification) {
    return {
      id: notification.notificationId,
      type: this.getNotificationType(notification.templateCode),
      title: notification.subject || this.getDefaultTitle(notification.templateCode),
      message: notification.content,
      priority: notification.priority,
      category: this.getCategory(notification.templateCode),
      timestamp: new Date().toISOString(),
      actions: this.getNotificationActions(notification),
      metadata: {
        tenantId: notification.tenantId,
        branchId: notification.branchId,
        templateCode: notification.templateCode,
        entityId: notification.metadata?.entityId
      },
      styling: {
        icon: this.getNotificationIcon(notification.templateCode),
        color: this.getPriorityColor(notification.priority),
        sound: notification.priority === 'URGENT' ? 'urgent' : 'default'
      }
    };
  }

  async sendToConnectedUser(userId, notification) {
    const socketId = this.connectedUsers.get(userId);
    if (!socketId) {
      return false;
    }

    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket || !socket.authenticated) {
      this.connectedUsers.delete(userId);
      return false;
    }

    socket.emit('notification', notification);
    return true;
  }

  async storePendingNotification(userId, notification) {
    try {
      const key = `pending_notifications:${userId}`;
      const notifications = await redisClient.get(key);
      const pendingList = notifications ? JSON.parse(notifications) : [];
      
      // Add new notification
      pendingList.unshift(notification);
      
      // Keep only last 50 notifications
      if (pendingList.length > 50) {
        pendingList.splice(50);
      }
      
      await redisClient.set(key, JSON.stringify(pendingList), 86400); // 24 hours TTL
      
    } catch (error) {
      logger.error('Failed to store pending notification', {
        userId,
        notificationId: notification.id,
        error: error.message
      });
    }
  }

  async sendPendingNotifications(userId, tenantId) {
    try {
      const key = `pending_notifications:${userId}`;
      const notifications = await redisClient.get(key);
      
      if (!notifications) {
        return;
      }

      const pendingList = JSON.parse(notifications);
      const socketId = this.connectedUsers.get(userId);
      const socket = this.io.sockets.sockets.get(socketId);

      if (!socket) {
        return;
      }

      // Send all pending notifications
      for (const notification of pendingList) {
        // Verify tenant access
        if (notification.metadata.tenantId === tenantId) {
          socket.emit('notification', notification);
        }
      }

      // Clear pending notifications
      await redisClient.del(key);
      
      logger.info('Pending notifications sent', {
        userId,
        count: pendingList.length
      });

    } catch (error) {
      logger.error('Failed to send pending notifications', {
        userId,
        error: error.message
      });
    }
  }

  async broadcastToTenant(tenantId, notification) {
    try {
      this.io.to(`tenant:${tenantId}`).emit('broadcast', notification);
      
      logger.info('Broadcast notification sent to tenant', {
        tenantId,
        notificationId: notification.id
      });

    } catch (error) {
      logger.error('Failed to broadcast to tenant', {
        tenantId,
        error: error.message
      });
    }
  }

  async markNotificationAsRead(notificationId, userId) {
    try {
      const Notification = require('../models/Notification');
      await Notification.updateOne(
        { notificationId, recipientId: userId },
        { 
          $set: { 
            'deliveryDetails.readAt': new Date(),
            'deliveryDetails.readStatus': 'READ'
          }
        }
      );

    } catch (error) {
      logger.error('Failed to mark notification as read in database', {
        notificationId,
        userId,
        error: error.message
      });
    }
  }

  async dismissNotification(notificationId, userId) {
    try {
      const Notification = require('../models/Notification');
      await Notification.updateOne(
        { notificationId, recipientId: userId },
        { 
          $set: { 
            'deliveryDetails.dismissedAt': new Date(),
            'deliveryDetails.dismissedStatus': 'DISMISSED'
          }
        }
      );

    } catch (error) {
      logger.error('Failed to mark notification as dismissed in database', {
        notificationId,
        userId,
        error: error.message
      });
    }
  }

  getNotificationType(templateCode) {
    if (templateCode.includes('APPOINTMENT')) return 'appointment';
    if (templateCode.includes('BILLING')) return 'billing';
    if (templateCode.includes('QUEUE')) return 'queue';
    if (templateCode.includes('MEDICAL')) return 'medical';
    if (templateCode.includes('HR')) return 'hr';
    if (templateCode.includes('SYSTEM')) return 'system';
    return 'general';
  }

  getDefaultTitle(templateCode) {
    const titles = {
      'APPOINTMENT': 'Appointment Update',
      'BILLING': 'Billing Notification',
      'QUEUE': 'Queue Update',
      'MEDICAL': 'Medical Update',
      'HR': 'HR Notification',
      'SYSTEM': 'System Notification'
    };

    for (const [key, title] of Object.entries(titles)) {
      if (templateCode.includes(key)) {
        return title;
      }
    }

    return 'Notification';
  }

  getCategory(templateCode) {
    if (templateCode.includes('APPOINTMENT')) return 'APPOINTMENT';
    if (templateCode.includes('BILLING')) return 'BILLING';
    if (templateCode.includes('QUEUE')) return 'QUEUE';
    if (templateCode.includes('MEDICAL')) return 'MEDICAL';
    if (templateCode.includes('HR')) return 'HR';
    if (templateCode.includes('SYSTEM')) return 'SYSTEM';
    return 'GENERAL';
  }

  getNotificationActions(notification) {
    const actions = [];
    const category = this.getCategory(notification.templateCode);

    switch (category) {
      case 'APPOINTMENT':
        actions.push(
          { id: 'view', label: 'View Details', type: 'primary' },
          { id: 'reschedule', label: 'Reschedule', type: 'secondary' }
        );
        break;
      case 'BILLING':
        actions.push(
          { id: 'pay', label: 'Pay Now', type: 'primary' },
          { id: 'view', label: 'View Bill', type: 'secondary' }
        );
        break;
      case 'QUEUE':
        actions.push(
          { id: 'view_queue', label: 'View Queue', type: 'primary' }
        );
        break;
      default:
        actions.push(
          { id: 'view', label: 'View', type: 'primary' }
        );
    }

    actions.push({ id: 'dismiss', label: 'Dismiss', type: 'tertiary' });
    return actions;
  }

  getNotificationIcon(templateCode) {
    const icons = {
      'APPOINTMENT': 'calendar',
      'BILLING': 'credit-card',
      'QUEUE': 'clock',
      'MEDICAL': 'heart',
      'HR': 'users',
      'SYSTEM': 'settings'
    };

    for (const [key, icon] of Object.entries(icons)) {
      if (templateCode.includes(key)) {
        return icon;
      }
    }

    return 'bell';
  }

  getPriorityColor(priority) {
    const colors = {
      'URGENT': '#ff3838',
      'HIGH': '#ff6b6b',
      'NORMAL': '#4dabf7',
      'LOW': '#69db7c'
    };

    return colors[priority] || colors['NORMAL'];
  }

  verifyToken(token, tenantId) {
    // Simplified token verification
    // In production, this should properly verify JWT
    return token && tenantId;
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  getConnectedUsersByTenant(tenantId) {
    const users = [];
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.tenantId === tenantId) {
        users.push(userId);
      }
    }
    return users;
  }
}

module.exports = InAppService;