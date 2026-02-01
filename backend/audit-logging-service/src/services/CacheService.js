const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.keyPrefix = 'audit:';
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      const cacheKey = this.generateKey(key);
      const value = await redisClient.get(cacheKey);
      
      if (value) {
        logger.debug('Cache hit:', { key: cacheKey });
        return JSON.parse(value);
      }
      
      logger.debug('Cache miss:', { key: cacheKey });
      return null;
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const cacheKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);
      
      await redisClient.set(cacheKey, serializedValue, ttl);
      logger.debug('Cache set:', { key: cacheKey, ttl });
      
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    try {
      const cacheKey = this.generateKey(key);
      await redisClient.del(cacheKey);
      logger.debug('Cache delete:', { key: cacheKey });
      
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Cache audit statistics
   */
  async cacheAuditStats(tenantId, branchId, period, stats) {
    const key = `stats:${tenantId}:${branchId || 'all'}:${period}`;
    const ttl = this.getStatsTTL(period);
    
    return await this.set(key, stats, ttl);
  }

  /**
   * Get cached audit statistics
   */
  async getCachedAuditStats(tenantId, branchId, period) {
    const key = `stats:${tenantId}:${branchId || 'all'}:${period}`;
    return await this.get(key);
  }

  /**
   * Cache compliance report
   */
  async cacheComplianceReport(tenantId, startDate, endDate, category, report) {
    const dateKey = `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
    const key = `compliance:${tenantId}:${category || 'all'}:${dateKey}`;
    const ttl = 24 * 60 * 60; // 24 hours for compliance reports
    
    return await this.set(key, report, ttl);
  }

  /**
   * Get cached compliance report
   */
  async getCachedComplianceReport(tenantId, startDate, endDate, category) {
    const dateKey = `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
    const key = `compliance:${tenantId}:${category || 'all'}:${dateKey}`;
    
    return await this.get(key);
  }

  /**
   * Cache integrity verification results
   */
  async cacheIntegrityVerification(tenantId, verification) {
    const key = `integrity:${tenantId}`;
    const ttl = 60 * 60; // 1 hour for integrity checks
    
    return await this.set(key, verification, ttl);
  }

  /**
   * Get cached integrity verification
   */
  async getCachedIntegrityVerification(tenantId) {
    const key = `integrity:${tenantId}`;
    return await this.get(key);
  }

  /**
   * Cache query results (for expensive queries)
   */
  async cacheQueryResults(queryHash, results) {
    const key = `query:${queryHash}`;
    const ttl = 5 * 60; // 5 minutes for query results
    
    return await this.set(key, results, ttl);
  }

  /**
   * Get cached query results
   */
  async getCachedQueryResults(queryHash) {
    const key = `query:${queryHash}`;
    return await this.get(key);
  }

  /**
   * Cache user permissions for faster authorization
   */
  async cacheUserPermissions(userId, tenantId, permissions) {
    const key = `permissions:${userId}:${tenantId}`;
    const ttl = 15 * 60; // 15 minutes for permissions
    
    return await this.set(key, permissions, ttl);
  }

  /**
   * Get cached user permissions
   */
  async getCachedUserPermissions(userId, tenantId) {
    const key = `permissions:${userId}:${tenantId}`;
    return await this.get(key);
  }

  /**
   * Invalidate cache patterns
   */
  async invalidatePattern(pattern) {
    try {
      // This is a simplified version - in production, you'd use Redis SCAN
      // to find and delete keys matching the pattern
      logger.info('Cache invalidation requested:', { pattern });
      
      // For now, just log the invalidation request
      // In a full implementation, you'd scan for matching keys and delete them
      
      return true;
    } catch (error) {
      logger.error('Cache invalidation error:', { pattern, error: error.message });
      return false;
    }
  }

  /**
   * Invalidate tenant-specific cache
   */
  async invalidateTenantCache(tenantId) {
    const patterns = [
      `stats:${tenantId}:*`,
      `compliance:${tenantId}:*`,
      `integrity:${tenantId}`,
      `permissions:*:${tenantId}`
    ];
    
    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  /**
   * Get TTL based on stats period
   */
  getStatsTTL(period) {
    switch (period) {
      case '1h':
        return 5 * 60; // 5 minutes
      case '24h':
        return 15 * 60; // 15 minutes
      case '7d':
        return 60 * 60; // 1 hour
      case '30d':
        return 4 * 60 * 60; // 4 hours
      default:
        return 15 * 60; // 15 minutes
    }
  }

  /**
   * Generate query hash for caching
   */
  generateQueryHash(filters, pagination) {
    const queryString = JSON.stringify({ filters, pagination });
    const crypto = require('crypto');
    return crypto.createHash('md5').update(queryString).digest('hex');
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(tenantId) {
    try {
      logger.info('Warming up cache for tenant:', { tenantId });
      
      // Pre-cache common statistics
      const periods = ['1h', '24h', '7d'];
      for (const period of periods) {
        // This would typically call the audit service to generate and cache stats
        logger.debug('Pre-caching stats:', { tenantId, period });
      }
      
      return true;
    } catch (error) {
      logger.error('Cache warm-up error:', { tenantId, error: error.message });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      // This would return Redis info in a real implementation
      return {
        connected: redisClient.isConnected,
        keyCount: 0, // Would get actual count from Redis
        memoryUsage: 0, // Would get actual memory usage
        hitRate: 0 // Would calculate from Redis stats
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll() {
    try {
      logger.warn('Clearing all audit cache');
      // In production, you'd use Redis FLUSHDB or scan and delete by pattern
      return true;
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      return false;
    }
  }
}

module.exports = new CacheService();