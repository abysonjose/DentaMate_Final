const redisConfig = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = redisConfig;
    this.defaultTTL = 3600; // 1 hour
  }

  // Case caching methods
  async setCaseCache(caseId, caseData, ttl = this.defaultTTL) {
    try {
      const key = `case_${caseId}`;
      await this.redis.set(key, caseData, ttl);
      logger.debug('Case cached', { caseId, ttl });
    } catch (error) {
      logger.error('Error caching case:', error);
      // Don't throw error for cache failures
    }
  }

  async getCaseCache(caseId) {
    try {
      const key = `case_${caseId}`;
      const cachedData = await this.redis.get(key);
      if (cachedData) {
        logger.debug('Case retrieved from cache', { caseId });
      }
      return cachedData;
    } catch (error) {
      logger.error('Error retrieving case from cache:', error);
      return null;
    }
  }

  async deleteCaseCache(caseId) {
    try {
      const key = `case_${caseId}`;
      await this.redis.del(key);
      logger.debug('Case cache deleted', { caseId });
    } catch (error) {
      logger.error('Error deleting case cache:', error);
    }
  }

  // Measurement caching methods
  async setMeasurementCache(measurementId, measurementData, ttl = this.defaultTTL) {
    try {
      const key = `measurement_${measurementId}`;
      await this.redis.set(key, measurementData, ttl);
      logger.debug('Measurement cached', { measurementId, ttl });
    } catch (error) {
      logger.error('Error caching measurement:', error);
    }
  }

  async getMeasurementCache(measurementId) {
    try {
      const key = `measurement_${measurementId}`;
      const cachedData = await this.redis.get(key);
      if (cachedData) {
        logger.debug('Measurement retrieved from cache', { measurementId });
      }
      return cachedData;
    } catch (error) {
      logger.error('Error retrieving measurement from cache:', error);
      return null;
    }
  }

  async deleteMeasurementCache(measurementId) {
    try {
      const key = `measurement_${measurementId}`;
      await this.redis.del(key);
      logger.debug('Measurement cache deleted', { measurementId });
    } catch (error) {
      logger.error('Error deleting measurement cache:', error);
    }
  }

  // User session caching
  async setUserSession(userId, sessionData, ttl = 86400) { // 24 hours
    try {
      const key = `user_session_${userId}`;
      await this.redis.set(key, sessionData, ttl);
      logger.debug('User session cached', { userId, ttl });
    } catch (error) {
      logger.error('Error caching user session:', error);
    }
  }

  async getUserSession(userId) {
    try {
      const key = `user_session_${userId}`;
      const sessionData = await this.redis.get(key);
      if (sessionData) {
        logger.debug('User session retrieved from cache', { userId });
      }
      return sessionData;
    } catch (error) {
      logger.error('Error retrieving user session from cache:', error);
      return null;
    }
  }

  async deleteUserSession(userId) {
    try {
      const key = `user_session_${userId}`;
      await this.redis.del(key);
      logger.debug('User session cache deleted', { userId });
    } catch (error) {
      logger.error('Error deleting user session cache:', error);
    }
  }

  // Statistics caching
  async setStatisticsCache(type, filters, data, ttl = 1800) { // 30 minutes
    try {
      const filterKey = this.generateFilterKey(filters);
      const key = `stats_${type}_${filterKey}`;
      await this.redis.set(key, data, ttl);
      logger.debug('Statistics cached', { type, filterKey, ttl });
    } catch (error) {
      logger.error('Error caching statistics:', error);
    }
  }

  async getStatisticsCache(type, filters) {
    try {
      const filterKey = this.generateFilterKey(filters);
      const key = `stats_${type}_${filterKey}`;
      const cachedData = await this.redis.get(key);
      if (cachedData) {
        logger.debug('Statistics retrieved from cache', { type, filterKey });
      }
      return cachedData;
    } catch (error) {
      logger.error('Error retrieving statistics from cache:', error);
      return null;
    }
  }

  // Rate limiting
  async checkRateLimit(identifier, limit, windowMs) {
    try {
      const key = `rate_limit_${identifier}`;
      const current = await this.redis.get(key);
      
      if (!current) {
        await this.redis.set(key, 1, Math.ceil(windowMs / 1000));
        return { allowed: true, remaining: limit - 1 };
      }

      const count = parseInt(current);
      if (count >= limit) {
        return { allowed: false, remaining: 0 };
      }

      await this.redis.set(key, count + 1, Math.ceil(windowMs / 1000));
      return { allowed: true, remaining: limit - count - 1 };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      // Allow request if cache fails
      return { allowed: true, remaining: limit };
    }
  }

  // File upload tracking
  async trackFileUpload(uploadId, fileInfo, ttl = 3600) {
    try {
      const key = `upload_${uploadId}`;
      await this.redis.set(key, fileInfo, ttl);
      logger.debug('File upload tracked', { uploadId, ttl });
    } catch (error) {
      logger.error('Error tracking file upload:', error);
    }
  }

  async getFileUploadInfo(uploadId) {
    try {
      const key = `upload_${uploadId}`;
      const uploadInfo = await this.redis.get(key);
      if (uploadInfo) {
        logger.debug('File upload info retrieved', { uploadId });
      }
      return uploadInfo;
    } catch (error) {
      logger.error('Error retrieving file upload info:', error);
      return null;
    }
  }

  async deleteFileUploadInfo(uploadId) {
    try {
      const key = `upload_${uploadId}`;
      await this.redis.del(key);
      logger.debug('File upload info deleted', { uploadId });
    } catch (error) {
      logger.error('Error deleting file upload info:', error);
    }
  }

  // Generic cache methods
  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.redis.set(key, value, ttl);
      logger.debug('Cache set', { key, ttl });
    } catch (error) {
      logger.error('Error setting cache:', error);
    }
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (value) {
        logger.debug('Cache hit', { key });
      } else {
        logger.debug('Cache miss', { key });
      }
      return value;
    } catch (error) {
      logger.error('Error getting cache:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
      logger.debug('Cache deleted', { key });
    } catch (error) {
      logger.error('Error deleting cache:', error);
    }
  }

  async exists(key) {
    try {
      return await this.redis.exists(key);
    } catch (error) {
      logger.error('Error checking cache existence:', error);
      return false;
    }
  }

  // Cache invalidation patterns
  async invalidateCaseRelatedCache(caseId) {
    try {
      const patterns = [
        `case_${caseId}`,
        `case_measurements_${caseId}`,
        `stats_case_*`,
        `stats_measurement_*`
      ];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          // For patterns with wildcards, we'd need to implement pattern matching
          // For now, we'll skip these or implement a simple key tracking system
          continue;
        }
        await this.del(pattern);
      }

      logger.debug('Case-related cache invalidated', { caseId });
    } catch (error) {
      logger.error('Error invalidating case-related cache:', error);
    }
  }

  async invalidateUserRelatedCache(userId) {
    try {
      const patterns = [
        `user_session_${userId}`,
        `stats_case_*`,
        `stats_measurement_*`
      ];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          continue;
        }
        await this.del(pattern);
      }

      logger.debug('User-related cache invalidated', { userId });
    } catch (error) {
      logger.error('Error invalidating user-related cache:', error);
    }
  }

  // Helper methods
  generateFilterKey(filters) {
    if (!filters || typeof filters !== 'object') {
      return 'default';
    }

    const sortedKeys = Object.keys(filters).sort();
    const keyParts = sortedKeys.map(key => `${key}:${filters[key]}`);
    return keyParts.join('|');
  }

  // Health check
  async healthCheck() {
    try {
      const testKey = 'health_check';
      const testValue = Date.now().toString();
      
      await this.redis.set(testKey, testValue, 10);
      const retrieved = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }
}

module.exports = CacheService;