const redis = require('redis');
const logger = require('../utils/logger');

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (process.env.REDIS_ENABLED === 'false') {
      logger.info('Redis disabled in configuration');
      this.isConnected = false;
      return null;
    }

    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 5000,
        retryDelayOnClusterDown: 300,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1
      };

      this.client = redis.createClient(redisConfig);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.warn('Redis client error (continuing without cache):', error.message);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis client connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.debug('Redis client reconnecting');
      });

      await this.client.connect();
      
      logger.info('Redis connected successfully', {
        host: redisConfig.host,
        port: redisConfig.port
      });

      return this.client;
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache:', error.message);
      this.isConnected = false;
      return null;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis disconnected successfully');
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

  async healthCheck() {
    try {
      if (!this.client || !this.isConnected) {
        return { status: 'disconnected', message: 'Redis not connected' };
      }

      const pong = await this.client.ping();
      
      if (pong === 'PONG') {
        return { 
          status: 'healthy', 
          message: 'Redis connection is healthy',
          response: pong
        };
      } else {
        return { 
          status: 'unhealthy', 
          message: 'Redis ping failed',
          response: pong
        };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: 'Redis health check failed',
        error: error.message 
      };
    }
  }

  // Cache helper methods
  async set(key, value, expireInSeconds = 3600) {
    try {
      const client = this.getClient();
      const serializedValue = JSON.stringify(value);
      
      if (expireInSeconds) {
        await client.setEx(key, expireInSeconds, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      
      if (value) {
        return JSON.parse(value);
      }
      
      return null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      const client = this.getClient();
      const result = await client.del(key);
      return result > 0;
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

  async expire(key, seconds) {
    try {
      const client = this.getClient();
      const result = await client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
  }
}

module.exports = new RedisConfig();