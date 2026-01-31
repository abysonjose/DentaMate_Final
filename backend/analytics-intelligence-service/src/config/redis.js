const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const config = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      };

      if (process.env.REDIS_PASSWORD) {
        config.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(config);

      this.client.on('error', (err) => {
        logger.error('Analytics Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Analytics Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Analytics Redis Client Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.warn('Analytics Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Analytics Redis connection failed:', error);
      this.isConnected = false;
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      const prefixedKey = `${process.env.CACHE_PREFIX || 'analytics:'}${key}`;
      return await this.client.get(prefixedKey);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, expireInSeconds = null) {
    if (!this.isConnected) return false;
    try {
      const prefixedKey = `${process.env.CACHE_PREFIX || 'analytics:'}${key}`;
      const ttl = expireInSeconds || parseInt(process.env.CACHE_TTL) || 300;
      
      await this.client.setEx(prefixedKey, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    try {
      const prefixedKey = `${process.env.CACHE_PREFIX || 'analytics:'}${key}`;
      await this.client.del(prefixedKey);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  async mget(keys) {
    if (!this.isConnected) return [];
    try {
      const prefixedKeys = keys.map(key => `${process.env.CACHE_PREFIX || 'analytics:'}${key}`);
      const values = await this.client.mGet(prefixedKeys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Redis MGET error:', error);
      return [];
    }
  }

  async mset(keyValuePairs, expireInSeconds = null) {
    if (!this.isConnected) return false;
    try {
      const ttl = expireInSeconds || parseInt(process.env.CACHE_TTL) || 300;
      const pipeline = this.client.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const prefixedKey = `${process.env.CACHE_PREFIX || 'analytics:'}${key}`;
        pipeline.setEx(prefixedKey, ttl, JSON.stringify(value));
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Redis MSET error:', error);
      return false;
    }
  }

  async keys(pattern) {
    if (!this.isConnected) return [];
    try {
      const prefixedPattern = `${process.env.CACHE_PREFIX || 'analytics:'}${pattern}`;
      return await this.client.keys(prefixedPattern);
    } catch (error) {
      logger.error('Redis KEYS error:', error);
      return [];
    }
  }

  async flushCache(pattern = '*') {
    if (!this.isConnected) return false;
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis FLUSH error:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  // Analytics-specific cache methods
  async cacheMetrics(tenantId, branchId, metrics, ttl = 300) {
    const key = `metrics:${tenantId}:${branchId || 'all'}`;
    return await this.set(key, metrics, ttl);
  }

  async getCachedMetrics(tenantId, branchId = null) {
    const key = `metrics:${tenantId}:${branchId || 'all'}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheDashboard(tenantId, role, branchId, dashboard, ttl = 180) {
    const key = `dashboard:${tenantId}:${role}:${branchId || 'all'}`;
    return await this.set(key, dashboard, ttl);
  }

  async getCachedDashboard(tenantId, role, branchId = null) {
    const key = `dashboard:${tenantId}:${role}:${branchId || 'all'}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheReport(reportId, reportData, ttl = 3600) {
    const key = `report:${reportId}`;
    return await this.set(key, reportData, ttl);
  }

  async getCachedReport(reportId) {
    const key = `report:${reportId}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }
}

module.exports = new RedisClient();