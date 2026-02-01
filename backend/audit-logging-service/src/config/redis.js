const redis = require('redis');
const logger = require('../utils/logger');

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnClusterDown: 300,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: null,
        db: 0 // Use database 0 for audit service
      };

      this.client = redis.createClient(redisConfig);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('🔄 Redis client connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('✅ Redis connected successfully for Audit Service', {
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db
        });
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('❌ Redis connection error:', error);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.warn('⚠️ Redis connection ended');
      });

      this.client.on('reconnecting', () => {
        logger.info('🔄 Redis reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('📴 Redis connection closed');
      }
    } catch (error) {
      logger.error('❌ Error closing Redis connection:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  async healthCheck() {
    try {
      if (!this.client || !this.isConnected) {
        return { status: 'disconnected', healthy: false };
      }

      const pong = await this.client.ping();
      
      return {
        status: 'connected',
        healthy: true,
        response: pong,
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'error',
        healthy: false,
        error: error.message
      };
    }
  }

  // Cache methods for audit service
  async cacheAuditSummary(key, data, ttl = 300) {
    try {
      const client = this.getClient();
      await client.setEx(`audit:summary:${key}`, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Failed to cache audit summary:', error);
      return false;
    }
  }

  async getCachedAuditSummary(key) {
    try {
      const client = this.getClient();
      const cached = await client.get(`audit:summary:${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached audit summary:', error);
      return null;
    }
  }

  async cacheIntegrityCheck(tenantId, result, ttl = 3600) {
    try {
      const client = this.getClient();
      await client.setEx(`audit:integrity:${tenantId}`, ttl, JSON.stringify(result));
      return true;
    } catch (error) {
      logger.error('Failed to cache integrity check:', error);
      return false;
    }
  }

  async getCachedIntegrityCheck(tenantId) {
    try {
      const client = this.getClient();
      const cached = await client.get(`audit:integrity:${tenantId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached integrity check:', error);
      return null;
    }
  }

  async incrementEventCounter(tenantId, eventType) {
    try {
      const client = this.getClient();
      const key = `audit:counter:${tenantId}:${eventType}`;
      const count = await client.incr(key);
      
      // Set expiry for daily counters
      if (count === 1) {
        await client.expire(key, 86400); // 24 hours
      }
      
      return count;
    } catch (error) {
      logger.error('Failed to increment event counter:', error);
      return 0;
    }
  }
}

module.exports = new RedisConfig();