const redis = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.keyPrefix = 'clinic-branch:';
  }

  generateKey(type, identifier) {
    return `${this.keyPrefix}${type}:${identifier}`;
  }

  async get(key) {
    try {
      const data = await redis.get(this.generateKey('data', key));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    try {
      await redis.setex(
        this.generateKey('data', key),
        ttl,
        JSON.stringify(data)
      );
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await redis.del(this.generateKey('data', key));
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      const keys = await redis.keys(this.generateKey('data', pattern));
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Clinic-specific cache methods
  async cacheClinic(clinicId, clinicData) {
    return await this.set(`clinic:${clinicId}`, clinicData);
  }

  async getCachedClinic(clinicId) {
    return await this.get(`clinic:${clinicId}`);
  }

  async invalidateClinic(clinicId) {
    await this.del(`clinic:${clinicId}`);
    await this.delPattern(`clinic:${clinicId}:*`);
    await this.delPattern(`branch:clinic:${clinicId}:*`);
  }

  // Branch-specific cache methods
  async cacheBranch(branchId, branchData) {
    return await this.set(`branch:${branchId}`, branchData);
  }

  async getCachedBranch(branchId) {
    return await this.get(`branch:${branchId}`);
  }

  async invalidateBranch(branchId) {
    await this.del(`branch:${branchId}`);
    await this.delPattern(`branch:${branchId}:*`);
    await this.delPattern(`department:branch:${branchId}:*`);
    await this.delPattern(`room:branch:${branchId}:*`);
    await this.delPattern(`working-hours:branch:${branchId}:*`);
  }

  // Department-specific cache methods
  async cacheDepartment(departmentId, departmentData) {
    return await this.set(`department:${departmentId}`, departmentData);
  }

  async getCachedDepartment(departmentId) {
    return await this.get(`department:${departmentId}`);
  }

  async invalidateDepartment(departmentId, branchId) {
    await this.del(`department:${departmentId}`);
    await this.delPattern(`department:${departmentId}:*`);
    await this.delPattern(`room:department:${departmentId}:*`);
    await this.delPattern(`working-hours:department:${departmentId}:*`);
    if (branchId) {
      await this.delPattern(`department:branch:${branchId}:*`);
    }
  }

  // Room-specific cache methods
  async cacheRoom(roomId, roomData) {
    return await this.set(`room:${roomId}`, roomData);
  }

  async getCachedRoom(roomId) {
    return await this.get(`room:${roomId}`);
  }

  async invalidateRoom(roomId, branchId, departmentId) {
    await this.del(`room:${roomId}`);
    await this.delPattern(`room:${roomId}:*`);
    if (branchId) {
      await this.delPattern(`room:branch:${branchId}:*`);
    }
    if (departmentId) {
      await this.delPattern(`room:department:${departmentId}:*`);
    }
  }

  // Working hours cache methods
  async cacheWorkingHours(key, workingHoursData) {
    return await this.set(`working-hours:${key}`, workingHoursData);
  }

  async getCachedWorkingHours(key) {
    return await this.get(`working-hours:${key}`);
  }

  async invalidateWorkingHours(branchId, departmentId) {
    await this.delPattern(`working-hours:branch:${branchId}:*`);
    if (departmentId) {
      await this.delPattern(`working-hours:department:${departmentId}:*`);
    }
  }

  // Tenant-wide cache invalidation
  async invalidateTenant(tenantId) {
    await this.delPattern(`*:tenant:${tenantId}:*`);
  }

  // Health check
  async healthCheck() {
    try {
      await redis.ping();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

module.exports = new CacheService();