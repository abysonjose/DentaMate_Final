const redis = require('redis');
const logger = require('../utils/logger');

class RedisConfig {
  constructor() {
    this.client = null;
  }

  async connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      };

      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(redisConfig);

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      this.client.on('ready', () => {
        logger.info('Redis ready for operations');
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        logger.info('Redis disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  async set(key, value, expireInSeconds = 3600) {
    try {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      throw error;
    }
  }
}

module.exports = new RedisConfig();