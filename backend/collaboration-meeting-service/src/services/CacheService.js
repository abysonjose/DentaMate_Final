const redisConfig = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.keyPrefix = 'collaboration:';
  }

  // Generate cache key with prefix
  generateKey(type, identifier, suffix = '') {
    const key = `${this.keyPrefix}${type}:${identifier}`;
    return suffix ? `${key}:${suffix}` : key;
  }

  // Generic cache operations
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!redisConfig.isConnected) {
        logger.debug('Redis not connected, skipping cache set', { key });
        return false;
      }

      const fullKey = key.startsWith(this.keyPrefix) ? key : `${this.keyPrefix}${key}`;
      const success = await redisConfig.set(fullKey, value, ttl);
      
      if (success) {
        logger.debug('Cache set successful', { key: fullKey, ttl });
      } else {
        logger.warn('Cache set failed', { key: fullKey });
      }
      
      return success;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      if (!redisConfig.isConnected) {
        logger.debug('Redis not connected, cache miss', { key });
        return null;
      }

      const fullKey = key.startsWith(this.keyPrefix) ? key : `${this.keyPrefix}${key}`;
      const value = await redisConfig.get(fullKey);
      
      if (value) {
        logger.debug('Cache hit', { key: fullKey });
      } else {
        logger.debug('Cache miss', { key: fullKey });
      }
      
      return value;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      if (!redisConfig.isConnected) {
        logger.debug('Redis not connected, skipping cache delete', { key });
        return false;
      }

      const fullKey = key.startsWith(this.keyPrefix) ? key : `${this.keyPrefix}${key}`;
      const success = await redisConfig.del(fullKey);
      
      if (success) {
        logger.debug('Cache delete successful', { key: fullKey });
      }
      
      return success;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!redisConfig.isConnected) {
        return false;
      }

      const fullKey = key.startsWith(this.keyPrefix) ? key : `${this.keyPrefix}${key}`;
      return await redisConfig.exists(fullKey);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // Case collaboration caching
  async cacheCollaboration(collaborationId, collaboration, ttl = 1800) { // 30 minutes
    const key = this.generateKey('collaboration', collaborationId);
    return await this.set(key, collaboration, ttl);
  }

  async getCollaboration(collaborationId) {
    const key = this.generateKey('collaboration', collaborationId);
    return await this.get(key);
  }

  async invalidateCollaboration(collaborationId) {
    const key = this.generateKey('collaboration', collaborationId);
    return await this.del(key);
  }

  // User collaborations caching
  async cacheUserCollaborations(userId, tenantId, collaborations, ttl = 900) { // 15 minutes
    const key = this.generateKey('user_collaborations', `${tenantId}:${userId}`);
    return await this.set(key, collaborations, ttl);
  }

  async getUserCollaborations(userId, tenantId) {
    const key = this.generateKey('user_collaborations', `${tenantId}:${userId}`);
    return await this.get(key);
  }

  async invalidateUserCollaborations(userId, tenantId) {
    const key = this.generateKey('user_collaborations', `${tenantId}:${userId}`);
    return await this.del(key);
  }

  // Meeting caching
  async cacheMeeting(meetingId, meeting, ttl = 1800) { // 30 minutes
    const key = this.generateKey('meeting', meetingId);
    return await this.set(key, meeting, ttl);
  }

  async getMeeting(meetingId) {
    const key = this.generateKey('meeting', meetingId);
    return await this.get(key);
  }

  async invalidateMeeting(meetingId) {
    const key = this.generateKey('meeting', meetingId);
    return await this.del(key);
  }

  // User meetings caching
  async cacheUserMeetings(userId, tenantId, meetings, ttl = 600) { // 10 minutes
    const key = this.generateKey('user_meetings', `${tenantId}:${userId}`);
    return await this.set(key, meetings, ttl);
  }

  async getUserMeetings(userId, tenantId) {
    const key = this.generateKey('user_meetings', `${tenantId}:${userId}`);
    return await this.get(key);
  }

  async invalidateUserMeetings(userId, tenantId) {
    const key = this.generateKey('user_meetings', `${tenantId}:${userId}`);
    return await this.del(key);
  }

  // Discussion caching
  async cacheDiscussions(caseId, tenantId, discussions, ttl = 600) { // 10 minutes
    const key = this.generateKey('discussions', `${tenantId}:${caseId}`);
    return await this.set(key, discussions, ttl);
  }

  async getDiscussions(caseId, tenantId) {
    const key = this.generateKey('discussions', `${tenantId}:${caseId}`);
    return await this.get(key);
  }

  async invalidateDiscussions(caseId, tenantId) {
    const key = this.generateKey('discussions', `${tenantId}:${caseId}`);
    return await this.del(key);
  }

  // Meeting notes caching
  async cacheMeetingNotes(meetingId, notes, ttl = 900) { // 15 minutes
    const key = this.generateKey('meeting_notes', meetingId);
    return await this.set(key, notes, ttl);
  }

  async getMeetingNotes(meetingId) {
    const key = this.generateKey('meeting_notes', meetingId);
    return await this.get(key);
  }

  async invalidateMeetingNotes(meetingId) {
    const key = this.generateKey('meeting_notes', meetingId);
    return await this.del(key);
  }

  // User session caching (for active meetings, etc.)
  async cacheUserSession(userId, sessionData, ttl = 3600) { // 1 hour
    const key = this.generateKey('user_session', userId);
    return await this.set(key, sessionData, ttl);
  }

  async getUserSession(userId) {
    const key = this.generateKey('user_session', userId);
    return await this.get(key);
  }

  async invalidateUserSession(userId) {
    const key = this.generateKey('user_session', userId);
    return await this.del(key);
  }

  // Meeting access tokens caching
  async cacheMeetingToken(meetingId, token, ttl = 7200) { // 2 hours
    const key = this.generateKey('meeting_token', meetingId);
    return await this.set(key, token, ttl);
  }

  async getMeetingToken(meetingId) {
    const key = this.generateKey('meeting_token', meetingId);
    return await this.get(key);
  }

  async invalidateMeetingToken(meetingId) {
    const key = this.generateKey('meeting_token', meetingId);
    return await this.del(key);
  }

  // Bulk invalidation methods
  async invalidateUserCache(userId, tenantId) {
    try {
      const promises = [
        this.invalidateUserCollaborations(userId, tenantId),
        this.invalidateUserMeetings(userId, tenantId),
        this.invalidateUserSession(userId)
      ];
      
      await Promise.all(promises);
      logger.info('User cache invalidated', { userId, tenantId });
      return true;
    } catch (error) {
      logger.error('Bulk user cache invalidation error:', error);
      return false;
    }
  }

  async invalidateCaseCache(caseId, tenantId) {
    try {
      await this.invalidateDiscussions(caseId, tenantId);
      logger.info('Case cache invalidated', { caseId, tenantId });
      return true;
    } catch (error) {
      logger.error('Case cache invalidation error:', error);
      return false;
    }
  }

  async invalidateMeetingCache(meetingId) {
    try {
      const promises = [
        this.invalidateMeeting(meetingId),
        this.invalidateMeetingNotes(meetingId),
        this.invalidateMeetingToken(meetingId)
      ];
      
      await Promise.all(promises);
      logger.info('Meeting cache invalidated', { meetingId });
      return true;
    } catch (error) {
      logger.error('Meeting cache invalidation error:', error);
      return false;
    }
  }

  // Cache statistics
  async getCacheStats() {
    try {
      // This would require additional Redis commands to get stats
      // For now, return basic info
      return {
        connected: redisConfig.isConnected,
        keyPrefix: this.keyPrefix,
        defaultTTL: this.defaultTTL
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }

  // Cache warming methods
  async warmUserCache(userId, tenantId) {
    try {
      // Pre-load frequently accessed data
      // This would be implemented based on usage patterns
      logger.info('Cache warming initiated', { userId, tenantId });
      return true;
    } catch (error) {
      logger.error('Cache warming error:', error);
      return false;
    }
  }

  // Cache cleanup methods
  async cleanup() {
    try {
      // Implement cleanup logic for expired or unused cache entries
      logger.info('Cache cleanup completed');
      return true;
    } catch (error) {
      logger.error('Cache cleanup error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();