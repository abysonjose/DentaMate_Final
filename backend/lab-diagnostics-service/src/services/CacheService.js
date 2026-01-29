const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initialize();
  }

  async initialize() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis cache connected');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis cache error:', error);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.warn('Redis cache connection ended');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis cache:', error);
      this.isConnected = false;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (!this.isConnected) {
        logger.warn('Cache not available, skipping set operation');
        return false;
      }

      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Cache not available, skipping get operation');
        return null;
      }

      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Cache not available, skipping delete operation');
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async flush() {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client.flushDb();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.disconnect();
        this.isConnected = false;
        logger.info('Redis cache disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis cache:', error);
    }
  }
}

module.exports = CacheService;