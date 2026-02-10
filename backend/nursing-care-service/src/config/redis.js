const redis = require('redis');
const logger = require('../utils/logger');

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Redis is optional for local development
      logger.info('Redis disabled for local development - running without cache');
      this.isConnected = false;
      this.client = null;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      // Don't exit process - service can work without Redis
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      logger.info('Redis disconnected');
    }
  }

  getClient() {
    return this.client;
  }

  isReady() {
    return this.isConnected && this.client;
  }

  async get(key) {
    if (!this.isReady()) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, expireInSeconds = 3600) {
    if (!this.isReady()) return false;
    try {
      await this.client.setEx(key, expireInSeconds, value);
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isReady()) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }
}

module.exports = new RedisConfig();