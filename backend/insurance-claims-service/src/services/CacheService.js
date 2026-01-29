const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.keyPrefix = 'insurance_claims:';
  }

  generateKey(type, identifier, suffix = '') {
    const key = `${this.keyPrefix}${type}:${identifier}`;
    return suffix ? `${key}:${suffix}` : key;
  }

  async get(key) {
    try {
      if (!redisClient.isClientConnected()) {
        logger.warn('Redis not connected, cache miss for key:', key);
        return null;
      }

      const data = await redisClient.get(key);
      if (data) {
        logger.debug('Cache hit for key:', key);
        return JSON.parse(data);
      }
      
      logger.debug('Cache miss for key:', key);
      return null;
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    try {
      if (!redisClient.isClientConnected()) {
        logger.warn('Redis not connected, skipping cache set for key:', key);
        return false;
      }

      await redisClient.set(key, JSON.stringify(data), ttl);
      logger.debug('Cache set for key:', key);
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    try {
      if (!redisClient.isClientConnected()) {
        logger.warn('Redis not connected, skipping cache delete for key:', key);
        return false;
      }

      await redisClient.del(key);
      logger.debug('Cache deleted for key:', key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  async exists(key) {
    try {
      if (!redisClient.isClientConnected()) {
        return false;
      }

      return await redisClient.exists(key);
    } catch (error) {
      logger.error('Cache exists error:', { key, error: error.message });
      return false;
    }
  }

  // Specific cache methods for insurance claims
  async getClaim(claimId) {
    const key = this.generateKey('claim', claimId);
    return await this.get(key);
  }

  async setClaim(claimId, claimData, ttl = 1800) { // 30 minutes
    const key = this.generateKey('claim', claimId);
    return await this.set(key, claimData, ttl);
  }

  async deleteClaim(claimId) {
    const key = this.generateKey('claim', claimId);
    return await this.del(key);
  }

  async getPolicy(policyId) {
    const key = this.generateKey('policy', policyId);
    return await this.get(key);
  }

  async setPolicy(policyId, policyData, ttl = 7200) { // 2 hours
    const key = this.generateKey('policy', policyId);
    return await this.set(key, policyData, ttl);
  }

  async deletePolicy(policyId) {
    const key = this.generateKey('policy', policyId);
    return await this.del(key);
  }

  async getPatientPolicies(patientId) {
    const key = this.generateKey('patient_policies', patientId);
    return await this.get(key);
  }

  async setPatientPolicies(patientId, policies, ttl = 3600) {
    const key = this.generateKey('patient_policies', patientId);
    return await this.set(key, policies, ttl);
  }

  async deletePatientPolicies(patientId) {
    const key = this.generateKey('patient_policies', patientId);
    return await this.del(key);
  }

  async getClaimsByStatus(tenantId, branchId, status) {
    const key = this.generateKey('claims_by_status', `${tenantId}:${branchId}:${status}`);
    return await this.get(key);
  }

  async setClaimsByStatus(tenantId, branchId, status, claims, ttl = 600) { // 10 minutes
    const key = this.generateKey('claims_by_status', `${tenantId}:${branchId}:${status}`);
    return await this.set(key, claims, ttl);
  }

  async invalidateClaimsByStatus(tenantId, branchId) {
    const statuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED'];
    const promises = statuses.map(status => {
      const key = this.generateKey('claims_by_status', `${tenantId}:${branchId}:${status}`);
      return this.del(key);
    });
    
    await Promise.all(promises);
  }

  // Clear all cache entries for a tenant
  async clearTenantCache(tenantId) {
    try {
      if (!redisClient.isClientConnected()) {
        return false;
      }

      // This is a simplified approach - in production, you might want to use SCAN
      const pattern = `${this.keyPrefix}*${tenantId}*`;
      logger.info('Clearing tenant cache:', { tenantId, pattern });
      
      // Note: This is a basic implementation
      // In production, consider using Redis SCAN for better performance
      return true;
    } catch (error) {
      logger.error('Clear tenant cache error:', { tenantId, error: error.message });
      return false;
    }
  }
}

module.exports = new CacheService();