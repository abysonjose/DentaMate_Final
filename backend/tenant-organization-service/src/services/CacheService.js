const redisConnection = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hour default
    this.isEnabled = process.env.ENABLE_CACHE !== 'false';
  }

  async get(key) {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const value = await redisConnection.get(key);
      if (value) {
        logger.debug(`Cache HIT: ${key}`);
        return value;
      }
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const expiry = ttl || this.defaultTTL;
      const success = await redisConnection.set(key, JSON.stringify(value), expiry);
      if (success) {
        logger.debug(`Cache SET: ${key} (TTL: ${expiry}s)`);
      }
      return success;
    } catch (error) {
      logger.error('Cache SET error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const success = await redisConnection.del(key);
      if (success) {
        logger.debug(`Cache DEL: ${key}`);
      }
      return success;
    } catch (error) {
      logger.error('Cache DEL error:', error);
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      // This is a simplified pattern deletion
      // In production, you might want to use SCAN for better performance
      const keys = await this.getKeysByPattern(pattern);
      if (keys.length > 0) {
        const results = await Promise.all(keys.map(key => this.del(key)));
        const deletedCount = results.filter(Boolean).length;
        logger.debug(`Cache DEL pattern: ${pattern} (${deletedCount} keys deleted)`);
        return deletedCount;
      }
      return 0;
    } catch (error) {
      logger.error('Cache DEL pattern error:', error);
      return false;
    }
  }

  async getKeysByPattern(pattern) {
    if (!this.isEnabled || !redisConnection.client) {
      return [];
    }

    try {
      // Use SCAN for production environments
      const keys = [];
      let cursor = 0;
      
      do {
        const result = await redisConnection.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      return keys;
    } catch (error) {
      logger.error('Cache pattern scan error:', error);
      return [];
    }
  }

  async exists(key) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const result = await redisConnection.client?.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache EXISTS error:', error);
      return false;
    }
  }

  async ttl(key) {
    if (!this.isEnabled) {
      return -1;
    }

    try {
      const result = await redisConnection.client?.ttl(key);
      return result || -1;
    } catch (error) {
      logger.error('Cache TTL error:', error);
      return -1;
    }
  }

  async expire(key, seconds) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const result = await redisConnection.client?.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Cache EXPIRE error:', error);
      return false;
    }
  }

  async increment(key, value = 1, ttl = null) {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const result = await redisConnection.client?.incrBy(key, value);
      if (ttl && result === value) {
        // Set TTL only if this is the first increment
        await this.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error('Cache INCREMENT error:', error);
      return null;
    }
  }

  async getStats() {
    if (!this.isEnabled) {
      return {
        enabled: false,
        connected: false
      };
    }

    try {
      const info = await redisConnection.client?.info('memory');
      const keyspace = await redisConnection.client?.info('keyspace');
      
      return {
        enabled: this.isEnabled,
        connected: redisConnection.isConnected,
        memory: info,
        keyspace: keyspace,
        defaultTTL: this.defaultTTL
      };
    } catch (error) {
      logger.error('Cache STATS error:', error);
      return {
        enabled: this.isEnabled,
        connected: false,
        error: error.message
      };
    }
  }

  async flush() {
    if (!this.isEnabled) {
      return false;
    }

    try {
      await redisConnection.client?.flushDb();
      logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Cache FLUSH error:', error);
      return false;
    }
  }

  // Utility methods for common cache patterns
  generateTenantKey(tenantId, suffix = '') {
    return `tenant:${tenantId}${suffix ? ':' + suffix : ''}`;
  }

  generateBranchKey(branchId, suffix = '') {
    return `branch:${branchId}${suffix ? ':' + suffix : ''}`;
  }

  generateUserKey(userId, suffix = '') {
    return `user:${userId}${suffix ? ':' + suffix : ''}`;
  }

  generateSessionKey(sessionId) {
    return `session:${sessionId}`;
  }

  generateRateLimitKey(identifier, window) {
    return `rate_limit:${identifier}:${window}`;
  }
}

module.exports = CacheService;