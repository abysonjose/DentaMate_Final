const redis = require('redis');
const logger = require('../utils/logger');

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      };

      if (process.env.REDIS_PASSWORD) {
        redisOptions.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(redisOptions);

      // Handle connection events
      this.client.on('connect', () => {
        logger.info('🔗 Redis connecting...');
      });

      this.client.on('ready', () => {
        logger.info('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('❌ Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('⚠️ Redis connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('🔄 Redis reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('❌ Redis connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('📴 Redis disconnected gracefully');
      }
    } catch (error) {
      logger.error('❌ Error disconnecting from Redis:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    return this.client;
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
      logger.error('❌ Redis SET error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('❌ Redis GET error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      const client = this.getClient();
      return await client.del(key);
    } catch (error) {
      logger.error('❌ Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const client = this.getClient();
      return await client.exists(key);
    } catch (error) {
      logger.error('❌ Redis EXISTS error:', error);
      return false;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      status: this.client ? this.client.status : 'disconnected'
    };
  }
}

module.exports = new RedisConfig();