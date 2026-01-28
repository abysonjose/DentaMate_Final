const redisConfig = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = redisConfig;
    this.defaultTTL = 3600; // 1 hour
  }

  // Generic cache operations
  async get(key) {
    try {
      if (!this.redis.isReady()) {
        return null;
      }

      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache GET error:', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!this.redis.isReady()) {
        return false;
      }

      await this.redis.set(key, JSON.stringify(value), ttl);
      return true;
    } catch (error) {
      logger.error('Cache SET error:', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.redis.isReady()) {
        return false;
      }

      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache DEL error:', { key, error: error.message });
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.redis.isReady()) {
        return false;
      }

      const result = await this.redis.getClient().exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache EXISTS error:', { key, error: error.message });
      return false;
    }
  }

  // Vitals-specific cache operations
  async setVitals(vitalId, vitalsData, ttl = 7200) { // 2 hours
    const key = `vitals:${vitalId}`;
    return await this.set(key, vitalsData, ttl);
  }

  async getVitals(vitalId) {
    const key = `vitals:${vitalId}`;
    return await this.get(key);
  }

  async deleteVitals(vitalId) {
    const key = `vitals:${vitalId}`;
    return await this.del(key);
  }

  async setAbnormalVitals(tenantId, branchId, vitalsData, ttl = 1800) { // 30 minutes
    const key = `abnormal_vitals:${tenantId}:${branchId}`;
    
    try {
      // Get existing abnormal vitals
      let abnormalVitals = await this.get(key) || [];
      
      // Add new abnormal vitals
      abnormalVitals.unshift(vitalsData);
      
      // Keep only latest 50 records
      abnormalVitals = abnormalVitals.slice(0, 50);
      
      return await this.set(key, abnormalVitals, ttl);
    } catch (error) {
      logger.error('Error setting abnormal vitals cache:', error);
      return false;
    }
  }

  async getAbnormalVitals(tenantId, branchId) {
    const key = `abnormal_vitals:${tenantId}:${branchId}`;
    return await this.get(key) || [];
  }

  // Care notes cache operations
  async setCareNote(noteId, noteData, ttl = 3600) { // 1 hour
    const key = `care_note:${noteId}`;
    return await this.set(key, noteData, ttl);
  }

  async getCareNote(noteId) {
    const key = `care_note:${noteId}`;
    return await this.get(key);
  }

  async deleteCareNote(noteId) {
    const key = `care_note:${noteId}`;
    return await this.del(key);
  }

  async setAppointmentCareNotes(appointmentId, notes, ttl = 1800) { // 30 minutes
    const key = `care_notes:appointment:${appointmentId}`;
    return await this.set(key, notes, ttl);
  }

  async getAppointmentCareNotes(appointmentId) {
    const key = `care_notes:appointment:${appointmentId}`;
    return await this.get(key);
  }

  // Escalation cache operations
  async setEscalation(escalationId, escalationData, ttl = 1800) { // 30 minutes
    const key = `escalation:${escalationId}`;
    return await this.set(key, escalationData, ttl);
  }

  async getEscalation(escalationId) {
    const key = `escalation:${escalationId}`;
    return await this.get(key);
  }

  async deleteEscalation(escalationId) {
    const key = `escalation:${escalationId}`;
    return await this.del(key);
  }

  async setActiveEscalations(tenantId, branchId, escalations, ttl = 300) { // 5 minutes
    const key = `active_escalations:${tenantId}:${branchId}`;
    return await this.set(key, escalations, ttl);
  }

  async getActiveEscalations(tenantId, branchId) {
    const key = `active_escalations:${tenantId}:${branchId}`;
    return await this.get(key);
  }

  async clearActiveEscalations(tenantId, branchId) {
    const key = `active_escalations:${tenantId}:${branchId}`;
    return await this.del(key);
  }

  // Ward monitoring cache operations
  async setWardMonitoring(monitoringId, monitoringData, ttl = 1800) { // 30 minutes
    const key = `ward_monitoring:${monitoringId}`;
    return await this.set(key, monitoringData, ttl);
  }

  async getWardMonitoring(monitoringId) {
    const key = `ward_monitoring:${monitoringId}`;
    return await this.get(key);
  }

  async deleteWardMonitoring(monitoringId) {
    const key = `ward_monitoring:${monitoringId}`;
    return await this.del(key);
  }

  async setBranchWardStatus(tenantId, branchId, wardStatus, ttl = 300) { // 5 minutes
    const key = `ward_status:${tenantId}:${branchId}`;
    return await this.set(key, wardStatus, ttl);
  }

  async getBranchWardStatus(tenantId, branchId) {
    const key = `ward_status:${tenantId}:${branchId}`;
    return await this.get(key);
  }

  async clearBranchWardStatus(tenantId, branchId) {
    const key = `ward_status:${tenantId}:${branchId}`;
    return await this.del(key);
  }

  // Nursing tasks cache operations
  async setNursingTask(taskId, taskData, ttl = 1800) { // 30 minutes
    const key = `nursing_task:${taskId}`;
    return await this.set(key, taskData, ttl);
  }

  async getNursingTask(taskId) {
    const key = `nursing_task:${taskId}`;
    return await this.get(key);
  }

  async deleteNursingTask(taskId) {
    const key = `nursing_task:${taskId}`;
    return await this.del(key);
  }

  async setNurseTasks(tenantId, nurseId, tasks, ttl = 600) { // 10 minutes
    const key = `nurse_tasks:${tenantId}:${nurseId}`;
    return await this.set(key, tasks, ttl);
  }

  async getNurseTasks(tenantId, nurseId) {
    const key = `nurse_tasks:${tenantId}:${nurseId}`;
    return await this.get(key);
  }

  async clearNurseTasks(tenantId, nurseId) {
    const key = `nurse_tasks:${tenantId}:${nurseId}`;
    return await this.del(key);
  }

  // User session cache operations
  async setUserSession(userId, sessionData, ttl = 86400) { // 24 hours
    const key = `user_session:${userId}`;
    return await this.set(key, sessionData, ttl);
  }

  async getUserSession(userId) {
    const key = `user_session:${userId}`;
    return await this.get(key);
  }

  async deleteUserSession(userId) {
    const key = `user_session:${userId}`;
    return await this.del(key);
  }

  // Statistics cache operations
  async setStatistics(type, tenantId, branchId, stats, ttl = 1800) { // 30 minutes
    const key = `stats:${type}:${tenantId}:${branchId}`;
    return await this.set(key, stats, ttl);
  }

  async getStatistics(type, tenantId, branchId) {
    const key = `stats:${type}:${tenantId}:${branchId}`;
    return await this.get(key);
  }

  async clearStatistics(type, tenantId, branchId) {
    const key = `stats:${type}:${tenantId}:${branchId}`;
    return await this.del(key);
  }

  // Bulk operations
  async setMultiple(keyValuePairs, ttl = this.defaultTTL) {
    try {
      if (!this.redis.isReady()) {
        return false;
      }

      const pipeline = this.redis.getClient().multi();
      
      for (const [key, value] of keyValuePairs) {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache bulk SET error:', error);
      return false;
    }
  }

  async deleteMultiple(keys) {
    try {
      if (!this.redis.isReady() || keys.length === 0) {
        return false;
      }

      await this.redis.getClient().del(keys);
      return true;
    } catch (error) {
      logger.error('Cache bulk DEL error:', error);
      return false;
    }
  }

  // Pattern-based operations
  async deleteByPattern(pattern) {
    try {
      if (!this.redis.isReady()) {
        return false;
      }

      const keys = await this.redis.getClient().keys(pattern);
      if (keys.length > 0) {
        await this.redis.getClient().del(keys);
      }
      
      return true;
    } catch (error) {
      logger.error('Cache pattern DEL error:', { pattern, error: error.message });
      return false;
    }
  }

  // Cache health check
  async healthCheck() {
    try {
      if (!this.redis.isReady()) {
        return { status: 'disconnected', message: 'Redis not connected' };
      }

      const testKey = 'health_check_test';
      const testValue = { timestamp: Date.now() };
      
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      await this.del(testKey);
      
      if (retrieved && retrieved.timestamp === testValue.timestamp) {
        return { status: 'healthy', message: 'Cache operations working' };
      } else {
        return { status: 'error', message: 'Cache operations failed' };
      }
    } catch (error) {
      logger.error('Cache health check error:', error);
      return { status: 'error', message: error.message };
    }
  }

  // Clear all cache for tenant (use with caution)
  async clearTenantCache(tenantId) {
    try {
      const patterns = [
        `vitals:*:${tenantId}:*`,
        `care_note:*:${tenantId}:*`,
        `escalation:*:${tenantId}:*`,
        `ward_monitoring:*:${tenantId}:*`,
        `nursing_task:*:${tenantId}:*`,
        `stats:*:${tenantId}:*`
      ];

      for (const pattern of patterns) {
        await this.deleteByPattern(pattern);
      }

      logger.info('Tenant cache cleared', { tenantId });
      return true;
    } catch (error) {
      logger.error('Error clearing tenant cache:', { tenantId, error });
      return false;
    }
  }
}

module.exports = CacheService;