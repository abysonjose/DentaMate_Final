const redisConfig = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.prefix = process.env.CACHE_PREFIX || 'inventory:';
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hour
  }

  // Generate cache key with prefix
  generateKey(key) {
    return `${this.prefix}${key}`;
  }

  // Set cache with TTL
  async set(key, value, ttl = null) {
    try {
      const cacheKey = this.generateKey(key);
      const cacheTTL = ttl || this.defaultTTL;
      
      const success = await redisConfig.set(cacheKey, value, cacheTTL);
      
      if (success) {
        logger.debug('Cache set successfully', { key: cacheKey, ttl: cacheTTL });
      }
      
      return success;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // Get from cache
  async get(key) {
    try {
      const cacheKey = this.generateKey(key);
      const value = await redisConfig.get(cacheKey);
      
      if (value) {
        logger.debug('Cache hit', { key: cacheKey });
      } else {
        logger.debug('Cache miss', { key: cacheKey });
      }
      
      return value;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Delete from cache
  async del(key) {
    try {
      const cacheKey = this.generateKey(key);
      const result = await redisConfig.del(cacheKey);
      
      logger.debug('Cache delete', { key: cacheKey, deleted: result });
      return result;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      const cacheKey = this.generateKey(key);
      return await redisConfig.exists(cacheKey);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // Medicine-specific cache methods
  async cacheMedicine(medicineId, medicineData, ttl = 7200) { // 2 hours
    const key = `medicine:${medicineId}`;
    return await this.set(key, medicineData, ttl);
  }

  async getMedicine(medicineId) {
    const key = `medicine:${medicineId}`;
    return await this.get(key);
  }

  async invalidateMedicine(medicineId) {
    const key = `medicine:${medicineId}`;
    return await this.del(key);
  }

  // Stock-specific cache methods
  async cacheStock(tenantId, branchId, medicineId, stockData, ttl = 1800) { // 30 minutes
    const key = `stock:${tenantId}:${branchId}:${medicineId}`;
    return await this.set(key, stockData, ttl);
  }

  async getStock(tenantId, branchId, medicineId) {
    const key = `stock:${tenantId}:${branchId}:${medicineId}`;
    return await this.get(key);
  }

  async invalidateStock(tenantId, branchId, medicineId = null) {
    if (medicineId) {
      const key = `stock:${tenantId}:${branchId}:${medicineId}`;
      return await this.del(key);
    } else {
      // Invalidate all stock for branch (pattern-based deletion would require additional logic)
      logger.info('Stock cache invalidation requested for entire branch', { tenantId, branchId });
      return true;
    }
  }

  // Vendor-specific cache methods
  async cacheVendor(vendorId, vendorData, ttl = 3600) { // 1 hour
    const key = `vendor:${vendorId}`;
    return await this.set(key, vendorData, ttl);
  }

  async getVendor(vendorId) {
    const key = `vendor:${vendorId}`;
    return await this.get(key);
  }

  async invalidateVendor(vendorId) {
    const key = `vendor:${vendorId}`;
    return await this.del(key);
  }

  // Dispensing-specific cache methods
  async cacheDispenseRecord(dispenseId, dispenseData, ttl = 1800) { // 30 minutes
    const key = `dispense:${dispenseId}`;
    return await this.set(key, dispenseData, ttl);
  }

  async getDispenseRecord(dispenseId) {
    const key = `dispense:${dispenseId}`;
    return await this.get(key);
  }

  async invalidateDispenseRecord(dispenseId) {
    const key = `dispense:${dispenseId}`;
    return await this.del(key);
  }

  // Search results cache
  async cacheSearchResults(searchKey, results, ttl = 600) { // 10 minutes
    const key = `search:${searchKey}`;
    return await this.set(key, results, ttl);
  }

  async getSearchResults(searchKey) {
    const key = `search:${searchKey}`;
    return await this.get(key);
  }

  // Low stock alerts cache
  async cacheLowStockAlerts(tenantId, branchId, alerts, ttl = 1800) { // 30 minutes
    const key = `alerts:low_stock:${tenantId}:${branchId}`;
    return await this.set(key, alerts, ttl);
  }

  async getLowStockAlerts(tenantId, branchId) {
    const key = `alerts:low_stock:${tenantId}:${branchId}`;
    return await this.get(key);
  }

  async invalidateLowStockAlerts(tenantId, branchId) {
    const key = `alerts:low_stock:${tenantId}:${branchId}`;
    return await this.del(key);
  }

  // Expiry alerts cache
  async cacheExpiryAlerts(tenantId, branchId, alerts, ttl = 3600) { // 1 hour
    const key = `alerts:expiry:${tenantId}:${branchId}`;
    return await this.set(key, alerts, ttl);
  }

  async getExpiryAlerts(tenantId, branchId) {
    const key = `alerts:expiry:${tenantId}:${branchId}`;
    return await this.get(key);
  }

  async invalidateExpiryAlerts(tenantId, branchId) {
    const key = `alerts:expiry:${tenantId}:${branchId}`;
    return await this.del(key);
  }

  // Statistics cache
  async cacheStats(statsKey, stats, ttl = 1800) { // 30 minutes
    const key = `stats:${statsKey}`;
    return await this.set(key, stats, ttl);
  }

  async getStats(statsKey) {
    const key = `stats:${statsKey}`;
    return await this.get(key);
  }

  async invalidateStats(statsKey) {
    const key = `stats:${statsKey}`;
    return await this.del(key);
  }

  // User session cache (for temporary data)
  async cacheUserSession(userId, sessionData, ttl = 1800) { // 30 minutes
    const key = `session:${userId}`;
    return await this.set(key, sessionData, ttl);
  }

  async getUserSession(userId) {
    const key = `session:${userId}`;
    return await this.get(key);
  }

  async invalidateUserSession(userId) {
    const key = `session:${userId}`;
    return await this.del(key);
  }

  // Bulk cache operations
  async cacheMultiple(items, ttl = null) {
    const promises = items.map(({ key, value, customTTL }) => 
      this.set(key, value, customTTL || ttl)
    );
    
    try {
      const results = await Promise.all(promises);
      const successCount = results.filter(result => result).length;
      
      logger.debug('Bulk cache operation completed', {
        total: items.length,
        successful: successCount,
        failed: items.length - successCount
      });
      
      return { total: items.length, successful: successCount };
    } catch (error) {
      logger.error('Bulk cache operation error:', error);
      return { total: items.length, successful: 0 };
    }
  }

  // Cache warming methods
  async warmCache(tenantId, branchId) {
    try {
      logger.info('Starting cache warming', { tenantId, branchId });
      
      // This would typically pre-load frequently accessed data
      // Implementation would depend on specific usage patterns
      
      logger.info('Cache warming completed', { tenantId, branchId });
      return true;
    } catch (error) {
      logger.error('Cache warming error:', error);
      return false;
    }
  }

  // Cache health check
  async healthCheck() {
    try {
      const testKey = 'health_check';
      const testValue = { timestamp: Date.now() };
      
      // Test set operation
      const setResult = await this.set(testKey, testValue, 60);
      if (!setResult) {
        throw new Error('Cache set operation failed');
      }
      
      // Test get operation
      const getValue = await this.get(testKey);
      if (!getValue || getValue.timestamp !== testValue.timestamp) {
        throw new Error('Cache get operation failed');
      }
      
      // Test delete operation
      const delResult = await this.del(testKey);
      if (!delResult) {
        throw new Error('Cache delete operation failed');
      }
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        operations: {
          set: 'ok',
          get: 'ok',
          delete: 'ok'
        }
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

module.exports = new CacheService();