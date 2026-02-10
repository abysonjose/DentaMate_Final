const redis = require('redis');
const logger = require('../utils/logger');

class RedisConfig {
  constructor() {
    this.client = null;
  }

  async connect() {
    try {
      const redisConfig = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              logger.warn('Redis max connection retries exceeded, giving up');
              return false;
            }
            return Math.min(retries * 100, 1000);
          }
        }
      };

      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(redisConfig);

      this.client.on('error', (error) => {
        logger.warn('Redis connection error (service will continue without cache):', error.message);
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

      // Try to connect with timeout
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        )
      ]);
      
      return this.client;
    } catch (error) {
      logger.warn('Failed to connect to Redis (service will continue without cache):', error.message);
      this.client = null;
      // Don't throw - allow service to start without Redis
      return null;
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