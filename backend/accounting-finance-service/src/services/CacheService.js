const redisConfig = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = redisConfig;
    this.defaultTTL = 3600; // 1 hour default TTL
  }

  /**
   * Set a value in cache
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const success = await this.redis.set(key, value, ttl);
      if (success) {
        logger.debug('Cache SET successful', { key, ttl });
      }
      return success;
    } catch (error) {
      logger.warn('Cache SET failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (value !== null) {
        logger.debug('Cache HIT', { key });
      } else {
        logger.debug('Cache MISS', { key });
      }
      return value;
    } catch (error) {
      logger.warn('Cache GET failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key) {
    try {
      const success = await this.redis.del(key);
      if (success) {
        logger.debug('Cache DEL successful', { key });
      }
      return success;
    } catch (error) {
      logger.warn('Cache DEL failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key) {
    try {
      return await this.redis.exists(key);
    } catch (error) {
      logger.warn('Cache EXISTS failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Generate a cache key with prefix
   */
  generateKey(prefix, ...parts) {
    return this.redis.generateKey(prefix, ...parts);
  }

  /**
   * Set multiple values in cache
   */
  async setMultiple(keyValuePairs, ttl = this.defaultTTL) {
    try {
      const client = this.redis.getClient();
      const pipeline = client.multi();

      for (const [key, value] of keyValuePairs) {
        const serializedValue = JSON.stringify(value);
        if (ttl) {
          pipeline.setEx(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }

      await pipeline.exec();
      logger.debug('Cache SET MULTIPLE successful', { count: keyValuePairs.length });
      return true;
    } catch (error) {
      logger.warn('Cache SET MULTIPLE failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async getMultiple(keys) {
    try {
      const client = this.redis.getClient();
      const values = await client.mGet(keys);
      
      const result = {};
      keys.forEach((key, index) => {
        if (values[index] !== null) {
          try {
            result[key] = JSON.parse(values[index]);
          } catch (parseError) {
            logger.warn('Failed to parse cached value', { key, error: parseError.message });
            result[key] = null;
          }
        } else {
          result[key] = null;
        }
      });

      const hitCount = Object.values(result).filter(v => v !== null).length;
      logger.debug('Cache GET MULTIPLE', { total: keys.length, hits: hitCount });

      return result;
    } catch (error) {
      logger.warn('Cache GET MULTIPLE failed', { error: error.message });
      return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async deleteMultiple(keys) {
    try {
      const client = this.redis.getClient();
      const result = await client.del(keys);
      logger.debug('Cache DEL MULTIPLE successful', { count: result });
      return result;
    } catch (error) {
      logger.warn('Cache DEL MULTIPLE failed', { error: error.message });
      return 0;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern) {
    try {
      const client = this.redis.getClient();
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        const result = await client.del(keys);
        logger.debug('Cache DEL PATTERN successful', { pattern, count: result });
        return result;
      }
      
      return 0;
    } catch (error) {
      logger.warn('Cache DEL PATTERN failed', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Increment a numeric value in cache
   */
  async increment(key, amount = 1, ttl = this.defaultTTL) {
    try {
      const client = this.redis.getClient();
      const newValue = await client.incrBy(key, amount);
      
      // Set TTL if this is a new key
      if (newValue === amount) {
        await client.expire(key, ttl);
      }
      
      return newValue;
    } catch (error) {
      logger.warn('Cache INCREMENT failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set a value with expiration time
   */
  async setWithExpiry(key, value, expiryDate) {
    try {
      const now = new Date();
      const ttl = Math.max(0, Math.floor((expiryDate - now) / 1000));
      
      if (ttl <= 0) {
        logger.warn('Cache SET WITH EXPIRY: expiry date is in the past', { key, expiryDate });
        return false;
      }
      
      return await this.set(key, value, ttl);
    } catch (error) {
      logger.warn('Cache SET WITH EXPIRY failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    try {
      // Try to get from cache first
      let value = await this.get(key);
      
      if (value !== null) {
        return value;
      }
      
      // If not in cache, fetch the value
      value = await fetchFunction();
      
      // Store in cache for future requests
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }
      
      return value;
    } catch (error) {
      logger.warn('Cache GET OR SET failed', { key, error: error.message });
      // If cache fails, still try to fetch the value
      try {
        return await fetchFunction();
      } catch (fetchError) {
        logger.error('Fetch function failed in GET OR SET', { key, error: fetchError.message });
        throw fetchError;
      }
    }
  }

  /**
   * Cache financial data with tenant isolation
   */
  async cacheTenantData(tenantId, branchId, dataType, data, ttl = this.defaultTTL) {
    const key = this.generateKey('tenant_data', tenantId, branchId, dataType);
    return await this.set(key, data, ttl);
  }

  /**
   * Get cached financial data for tenant
   */
  async getTenantData(tenantId, branchId, dataType) {
    const key = this.generateKey('tenant_data', tenantId, branchId, dataType);
    return await this.get(key);
  }

  /**
   * Clear all cached data for a tenant
   */
  async clearTenantCache(tenantId, branchId = '*') {
    const pattern = this.generateKey('tenant_data', tenantId, branchId, '*');
    return await this.deletePattern(pattern);
  }

  /**
   * Cache report data
   */
  async cacheReport(reportId, reportData, ttl = 7200) { // 2 hours default for reports
    const key = this.generateKey('report', reportId);
    return await this.set(key, reportData, ttl);
  }

  /**
   * Get cached report
   */
  async getCachedReport(reportId) {
    const key = this.generateKey('report', reportId);
    return await this.get(key);
  }

  /**
   * Cache user session data
   */
  async cacheUserSession(userId, sessionData, ttl = 1800) { // 30 minutes
    const key = this.generateKey('user_session', userId);
    return await this.set(key, sessionData, ttl);
  }

  /**
   * Get cached user session
   */
  async getUserSession(userId) {
    const key = this.generateKey('user_session', userId);
    return await this.get(key);
  }

  /**
   * Clear user session
   */
  async clearUserSession(userId) {
    const key = this.generateKey('user_session', userId);
    return await this.del(key);
  }

  /**
   * Cache API response
   */
  async cacheApiResponse(endpoint, params, response, ttl = 600) { // 10 minutes
    const key = this.generateKey('api_response', endpoint, JSON.stringify(params));
    return await this.set(key, response, ttl);
  }

  /**
   * Get cached API response
   */
  async getCachedApiResponse(endpoint, params) {
    const key = this.generateKey('api_response', endpoint, JSON.stringify(params));
    return await this.get(key);
  }

  /**
   * Health check for cache service
   */
  async healthCheck() {
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = { timestamp: new Date(), status: 'ok' };
      
      // Test set operation
      const setResult = await this.set(testKey, testValue, 60);
      if (!setResult) {
        return { status: 'unhealthy', message: 'Failed to set test value' };
      }
      
      // Test get operation
      const getValue = await this.get(testKey);
      if (!getValue || getValue.status !== 'ok') {
        return { status: 'unhealthy', message: 'Failed to get test value' };
      }
      
      // Test delete operation
      const delResult = await this.del(testKey);
      if (!delResult) {
        return { status: 'unhealthy', message: 'Failed to delete test value' };
      }
      
      return { 
        status: 'healthy', 
        message: 'Cache service is working properly',
        timestamp: new Date()
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: 'Cache health check failed',
        error: error.message 
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const client = this.redis.getClient();
      const info = await client.info('memory');
      
      // Parse memory info
      const memoryInfo = {};
      info.split('\r\n').forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          memoryInfo[key] = value;
        }
      });
      
      return {
        memory: memoryInfo,
        timestamp: new Date()
      };
    } catch (error) {
      logger.warn('Failed to get cache stats', { error: error.message });
      return { error: error.message };
    }
  }
}

module.exports = CacheService;