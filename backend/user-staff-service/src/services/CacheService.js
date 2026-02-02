const redisConnection = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hour default
    this.isEnabled = process.env.ENABLE_CACHE !== 'false';
    this.keyPrefix = 'staff_service:';
  }

  // Generate cache keys
  generateKey(type, identifier, suffix = '') {
    const key = `${this.keyPrefix}${type}:${identifier}${suffix ? ':' + suffix : ''}`;
    return key;
  }

  async get(key) {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const fullKey = key.startsWith(this.keyPrefix) ? key : this.generateKey('generic', key);
      const value = await redisConnection.get(fullKey);
      
      if (value) {
        logger.logCacheOperation('GET', fullKey, true);
        return JSON.parse(value);
      }
      
      logger.logCacheOperation('GET', fullKey, false);
      return null;
    } catch (error) {
      logger.error('Cache GET error:', error, { key });
      return null;
    }
  }

  async set(key, value, ttl = null) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const fullKey = key.startsWith(this.keyPrefix) ? key : this.generateKey('generic', key);
      const expiry = ttl || this.defaultTTL;
      const serializedValue = JSON.stringify(value);
      
      const success = await redisConnection.set(fullKey, serializedValue, expiry);
      
      if (success) {
        logger.logCacheOperation('SET', fullKey, null, { ttl: expiry });
      }
      
      return success;
    } catch (error) {
      logger.error('Cache SET error:', error, { key, ttl });
      return false;
    }
  }

  async del(key) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const fullKey = key.startsWith(this.keyPrefix) ? key : this.generateKey('generic', key);
      const success = await redisConnection.del(fullKey);
      
      if (success) {
        logger.logCacheOperation('DEL', fullKey);
      }
      
      return success;
    } catch (error) {
      logger.error('Cache DEL error:', error, { key });
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.isEnabled) {
      return 0;
    }

    try {
      const fullPattern = pattern.startsWith(this.keyPrefix) ? pattern : `${this.keyPrefix}${pattern}`;
      const deletedCount = await redisConnection.flushPattern(fullPattern);
      
      logger.logCacheOperation('DEL_PATTERN', fullPattern, null, { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Cache DEL PATTERN error:', error, { pattern });
      return 0;
    }
  }

  // Staff-specific cache methods
  async getStaff(staffId) {
    const key = this.generateKey('staff', staffId);
    return await this.get(key);
  }

  async setStaff(staffId, staffData, ttl = 1800) { // 30 minutes
    const key = this.generateKey('staff', staffId);
    return await this.set(key, staffData, ttl);
  }

  async delStaff(staffId) {
    const key = this.generateKey('staff', staffId);
    return await this.del(key);
  }

  // Role-specific cache methods
  async getRole(roleId) {
    const key = this.generateKey('role', roleId);
    return await this.get(key);
  }

  async setRole(roleId, roleData, ttl = 3600) { // 1 hour
    const key = this.generateKey('role', roleId);
    return await this.set(key, roleData, ttl);
  }

  async delRole(roleId) {
    const key = this.generateKey('role', roleId);
    return await this.del(key);
  }

  // Staff list cache methods
  async getStaffList(tenantId, branchId = null, filters = {}) {
    const filterKey = Object.keys(filters).sort().map(k => `${k}:${filters[k]}`).join('|');
    const suffix = branchId ? `${branchId}:${filterKey}` : filterKey;
    const key = this.generateKey('staff_list', tenantId, suffix);
    return await this.get(key);
  }

  async setStaffList(tenantId, branchId = null, filters = {}, staffList, ttl = 600) { // 10 minutes
    const filterKey = Object.keys(filters).sort().map(k => `${k}:${filters[k]}`).join('|');
    const suffix = branchId ? `${branchId}:${filterKey}` : filterKey;
    const key = this.generateKey('staff_list', tenantId, suffix);
    return await this.set(key, staffList, ttl);
  }

  // Role list cache methods
  async getRoleList(scope = null) {
    const key = this.generateKey('role_list', scope || 'all');
    return await this.get(key);
  }

  async setRoleList(scope = null, roleList, ttl = 3600) { // 1 hour
    const key = this.generateKey('role_list', scope || 'all');
    return await this.set(key, roleList, ttl);
  }

  // Staff by role cache methods
  async getStaffByRole(roleName, tenantId, branchId = null) {
    const suffix = branchId ? `${tenantId}:${branchId}` : tenantId;
    const key = this.generateKey('staff_by_role', roleName, suffix);
    return await this.get(key);
  }

  async setStaffByRole(roleName, tenantId, branchId = null, staffList, ttl = 900) { // 15 minutes
    const suffix = branchId ? `${tenantId}:${branchId}` : tenantId;
    const key = this.generateKey('staff_by_role', roleName, suffix);
    return await this.set(key, staffList, ttl);
  }

  // Permission cache methods
  async getStaffPermissions(staffId) {
    const key = this.generateKey('permissions', staffId);
    return await this.get(key);
  }

  async setStaffPermissions(staffId, permissions, ttl = 1800) { // 30 minutes
    const key = this.generateKey('permissions', staffId);
    return await this.set(key, permissions, ttl);
  }

  async delStaffPermissions(staffId) {
    const key = this.generateKey('permissions', staffId);
    return await this.del(key);
  }

  // Invalidation methods
  async invalidateStaffCache(staffId) {
    const patterns = [
      this.generateKey('staff', staffId),
      this.generateKey('permissions', staffId),
      `${this.keyPrefix}staff_list:*`,
      `${this.keyPrefix}staff_by_role:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        totalDeleted += await this.delPattern(pattern);
      } else {
        const deleted = await this.del(pattern);
        if (deleted) totalDeleted++;
      }
    }

    logger.logCacheOperation('INVALIDATE_STAFF', staffId, null, { totalDeleted });
    return totalDeleted;
  }

  async invalidateRoleCache(roleId) {
    const patterns = [
      this.generateKey('role', roleId),
      `${this.keyPrefix}role_list:*`,
      `${this.keyPrefix}staff_by_role:*`,
      `${this.keyPrefix}permissions:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        totalDeleted += await this.delPattern(pattern);
      } else {
        const deleted = await this.del(pattern);
        if (deleted) totalDeleted++;
      }
    }

    logger.logCacheOperation('INVALIDATE_ROLE', roleId, null, { totalDeleted });
    return totalDeleted;
  }

  async invalidateTenantCache(tenantId) {
    const patterns = [
      `${this.keyPrefix}staff_list:${tenantId}:*`,
      `${this.keyPrefix}staff_by_role:*:${tenantId}:*`,
      `${this.keyPrefix}staff_by_role:*:${tenantId}`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.delPattern(pattern);
    }

    logger.logCacheOperation('INVALIDATE_TENANT', tenantId, null, { totalDeleted });
    return totalDeleted;
  }

  async invalidateBranchCache(tenantId, branchId) {
    const patterns = [
      `${this.keyPrefix}staff_list:${tenantId}:${branchId}:*`,
      `${this.keyPrefix}staff_by_role:*:${tenantId}:${branchId}`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.delPattern(pattern);
    }

    logger.logCacheOperation('INVALIDATE_BRANCH', `${tenantId}:${branchId}`, null, { totalDeleted });
    return totalDeleted;
  }

  // Bulk operations
  async warmupCache(tenantId, branchId = null) {
    try {
      logger.info('Starting cache warmup', { tenantId, branchId });
      
      // This would typically be called during off-peak hours
      // to pre-populate frequently accessed data
      
      // Warmup logic would go here
      // - Load active staff
      // - Load roles
      // - Load permissions
      
      logger.info('Cache warmup completed', { tenantId, branchId });
      return true;
    } catch (error) {
      logger.error('Cache warmup failed:', error, { tenantId, branchId });
      return false;
    }
  }

  async getStats() {
    try {
      const keys = await redisConnection.keys(`${this.keyPrefix}*`);
      const stats = {
        totalKeys: keys.length,
        keysByType: {},
        isEnabled: this.isEnabled,
        defaultTTL: this.defaultTTL
      };

      // Group keys by type
      keys.forEach(key => {
        const type = key.split(':')[1] || 'unknown';
        stats.keysByType[type] = (stats.keysByType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return { error: error.message };
    }
  }

  async clearAll() {
    try {
      const deletedCount = await this.delPattern(`${this.keyPrefix}*`);
      logger.info('Cache cleared', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      return 0;
    }
  }
}

module.exports = CacheService;