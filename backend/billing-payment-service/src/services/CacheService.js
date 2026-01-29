const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.shortTTL = 300; // 5 minutes
    this.longTTL = 86400; // 24 hours
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(type, id, suffix = '') {
    const prefix = 'billing';
    return `${prefix}:${type}:${id}${suffix ? `:${suffix}` : ''}`;
  }

  /**
   * Set cache with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!redisClient.isClientConnected()) {
        return false;
      }

      await redisClient.set(key, value, ttl);
      return true;
    } catch (error) {
      logger.error('Cache SET error:', error);
      return false;
    }
  }

  /**
   * Get from cache
   */
  async get(key) {
    try {
      if (!redisClient.isClientConnected()) {
        return null;
      }

      return await redisClient.get(key);
    } catch (error) {
      logger.error('Cache GET error:', error);
      return null;
    }
  }

  /**
   * Delete from cache
   */
  async delete(key) {
    try {
      if (!redisClient.isClientConnected()) {
        return false;
      }

      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Cache DELETE error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      if (!redisClient.isClientConnected()) {
        return false;
      }

      return await redisClient.exists(key);
    } catch (error) {
      logger.error('Cache EXISTS error:', error);
      return false;
    }
  }

  // Bill caching methods
  async setBill(billId, bill, ttl = this.defaultTTL) {
    const key = this.generateKey('bill', billId);
    return await this.set(key, bill, ttl);
  }

  async getBill(billId) {
    const key = this.generateKey('bill', billId);
    return await this.get(key);
  }

  async deleteBill(billId) {
    const key = this.generateKey('bill', billId);
    return await this.delete(key);
  }

  // Invoice caching methods
  async setInvoice(invoiceId, invoice, ttl = this.defaultTTL) {
    const key = this.generateKey('invoice', invoiceId);
    return await this.set(key, invoice, ttl);
  }

  async getInvoice(invoiceId) {
    const key = this.generateKey('invoice', invoiceId);
    return await this.get(key);
  }

  async deleteInvoice(invoiceId) {
    const key = this.generateKey('invoice', invoiceId);
    return await this.delete(key);
  }

  // Payment caching methods
  async setPayment(paymentId, payment, ttl = this.shortTTL) {
    const key = this.generateKey('payment', paymentId);
    return await this.set(key, payment, ttl);
  }

  async getPayment(paymentId) {
    const key = this.generateKey('payment', paymentId);
    return await this.get(key);
  }

  async deletePayment(paymentId) {
    const key = this.generateKey('payment', paymentId);
    return await this.delete(key);
  }

  // Refund caching methods
  async setRefund(refundId, refund, ttl = this.defaultTTL) {
    const key = this.generateKey('refund', refundId);
    return await this.set(key, refund, ttl);
  }

  async getRefund(refundId) {
    const key = this.generateKey('refund', refundId);
    return await this.get(key);
  }

  async deleteRefund(refundId) {
    const key = this.generateKey('refund', refundId);
    return await this.delete(key);
  }

  // Patient billing summary caching
  async setPatientBillingSummary(patientId, tenantId, summary, ttl = this.shortTTL) {
    const key = this.generateKey('patient_billing', patientId, tenantId);
    return await this.set(key, summary, ttl);
  }

  async getPatientBillingSummary(patientId, tenantId) {
    const key = this.generateKey('patient_billing', patientId, tenantId);
    return await this.get(key);
  }

  async deletePatientBillingSummary(patientId, tenantId) {
    const key = this.generateKey('patient_billing', patientId, tenantId);
    return await this.delete(key);
  }

  // Branch billing statistics caching
  async setBranchStats(branchId, tenantId, stats, ttl = this.shortTTL) {
    const key = this.generateKey('branch_stats', branchId, tenantId);
    return await this.set(key, stats, ttl);
  }

  async getBranchStats(branchId, tenantId) {
    const key = this.generateKey('branch_stats', branchId, tenantId);
    return await this.get(key);
  }

  async deleteBranchStats(branchId, tenantId) {
    const key = this.generateKey('branch_stats', branchId, tenantId);
    return await this.delete(key);
  }

  // Payment gateway order caching
  async setPaymentOrder(orderId, orderData, ttl = this.shortTTL) {
    const key = this.generateKey('payment_order', orderId);
    return await this.set(key, orderData, ttl);
  }

  async getPaymentOrder(orderId) {
    const key = this.generateKey('payment_order', orderId);
    return await this.get(key);
  }

  async deletePaymentOrder(orderId) {
    const key = this.generateKey('payment_order', orderId);
    return await this.delete(key);
  }

  // Rate limiting cache
  async setRateLimit(identifier, count, ttl) {
    const key = this.generateKey('rate_limit', identifier);
    return await this.set(key, count, ttl);
  }

  async getRateLimit(identifier) {
    const key = this.generateKey('rate_limit', identifier);
    return await this.get(key);
  }

  async incrementRateLimit(identifier, ttl) {
    try {
      if (!redisClient.isClientConnected()) {
        return 1;
      }

      const key = this.generateKey('rate_limit', identifier);
      const client = redisClient.getClient();
      
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, ttl);
      }
      
      return count;
    } catch (error) {
      logger.error('Rate limit increment error:', error);
      return 1;
    }
  }

  // Session/token caching
  async setUserSession(userId, sessionData, ttl = this.longTTL) {
    const key = this.generateKey('session', userId);
    return await this.set(key, sessionData, ttl);
  }

  async getUserSession(userId) {
    const key = this.generateKey('session', userId);
    return await this.get(key);
  }

  async deleteUserSession(userId) {
    const key = this.generateKey('session', userId);
    return await this.delete(key);
  }

  // Bulk operations
  async deletePattern(pattern) {
    try {
      if (!redisClient.isClientConnected()) {
        return false;
      }

      const client = redisClient.getClient();
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        await client.del(keys);
      }
      
      return true;
    } catch (error) {
      logger.error('Cache pattern delete error:', error);
      return false;
    }
  }

  // Clear all billing cache for a tenant
  async clearTenantCache(tenantId) {
    const patterns = [
      this.generateKey('*', '*', tenantId),
      this.generateKey('patient_billing', '*', tenantId),
      this.generateKey('branch_stats', '*', tenantId)
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  // Clear all billing cache for a branch
  async clearBranchCache(branchId, tenantId) {
    const patterns = [
      this.generateKey('branch_stats', branchId, tenantId)
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!redisClient.isClientConnected()) {
        return {
          status: 'disconnected',
          message: 'Redis client not connected'
        };
      }

      const testKey = this.generateKey('health', 'check');
      const testValue = { timestamp: Date.now() };
      
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      await this.delete(testKey);

      if (retrieved && retrieved.timestamp === testValue.timestamp) {
        return {
          status: 'healthy',
          message: 'Cache service is working properly'
        };
      } else {
        return {
          status: 'error',
          message: 'Cache read/write test failed'
        };
      }
    } catch (error) {
      logger.error('Cache health check error:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

module.exports = CacheService;