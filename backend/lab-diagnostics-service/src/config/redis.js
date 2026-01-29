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
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      };

      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(redisConfig);

      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('Redis client ready');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis client error:', error);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.warn('Redis client disconnected');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis client disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting Redis client:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  isClientConnected() {
    return this.isConnected;
  }

  // Cache helper methods
  async get(key) {
    try {
      if (!this.isConnected) return null;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (!this.isConnected) return false;
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) return false;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }
}

module.exports = new RedisConfig();