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
      };

      this.client = redis.createClient(redisConfig);

      this.client.on('connect', () => {
        logger.info('🔗 Redis connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('✅ Redis connected successfully');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('❌ Redis connection error:', error);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.warn('⚠️ Redis connection ended');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      this.isConnected = false;
      logger.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        logger.info('📴 Redis disconnected gracefully');
      }
    } catch (error) {
      logger.error('❌ Error disconnecting from Redis:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  isClientConnected() {
    return this.isConnected;
  }

  // Cache operations
  async set(key, value, expireInSeconds = 3600) {
    try {
      if (!this.isConnected) {
        logger.warn('⚠️ Redis not connected, skipping cache set');
        return false;
      }

      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, expireInSeconds, serializedValue);
      return true;
    } catch (error) {
      logger.error('❌ Redis SET error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        logger.warn('⚠️ Redis not connected, skipping cache get');
        return null;
      }

      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('❌ Redis GET error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        logger.warn('⚠️ Redis not connected, skipping cache delete');
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('❌ Redis DEL error:', error);
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
      logger.error('❌ Redis EXISTS error:', error);
      return false;
    }
  }
}

module.exports = new RedisConfig();