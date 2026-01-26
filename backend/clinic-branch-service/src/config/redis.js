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
        lazyConnect: true
      };

      this.client = redis.createClient(redisConfig);

      // Handle connection events
      this.client.on('connect', () => {
        logger.info('Connected to Redis successfully');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Reconnecting to Redis...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Disconnected from Redis');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  async get(key) {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const client = this.getClient();
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await client.setEx(key, ttl, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      const client = this.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async flushPattern(pattern) {
    try {
      const client = this.getClient();
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        await client.del(keys);
      }
      
      return keys.length;
    } catch (error) {
      logger.error('Redis FLUSH PATTERN error:', error);
      return 0;
    }
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Not connected to Redis' };
      }

      const client = this.getClient();
      await client.ping();
      
      return { 
        status: 'healthy', 
        message: 'Redis connection is healthy',
        isConnected: this.isConnected
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { 
        status: 'unhealthy', 
        message: 'Redis health check failed',
        error: error.message 
      };
    }
  }

  generateKey(prefix, ...parts) {
    const cachePrefix = process.env.CACHE_PREFIX || 'clinic_branch_';
    return `${cachePrefix}${prefix}:${parts.join(':')}`;
  }
}

module.exports = new RedisConfig();