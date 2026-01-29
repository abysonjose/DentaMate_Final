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
        lazyConnect: true
      };

      if (process.env.REDIS_PASSWORD) {
        redisOptions.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(redisOptions);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis client connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting');
      });

      await this.client.connect();
      
      logger.info('Connected to Redis successfully', {
        service: 'accounting-finance-service',
        host: redisOptions.host,
        port: redisOptions.port
      });

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

  async healthCheck() {
    try {
      if (!this.client || !this.isConnected) {
        return { status: 'unhealthy', message: 'Redis client not connected' };
      }

      const pong = await this.client.ping();
      
      if (pong === 'PONG') {
        return { 
          status: 'healthy', 
          message: 'Redis connection is active',
          response: pong
        };
      } else {
        return { 
          status: 'unhealthy', 
          message: 'Unexpected ping response',
          response: pong
        };
      }
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { 
        status: 'unhealthy', 
        message: 'Redis health check failed',
        error: error.message 
      };
    }
  }

  // Cache utility methods
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

  // Generate cache keys
  generateKey(prefix, ...parts) {
    return `accounting:${prefix}:${parts.join(':')}`;
  }
}

// Create singleton instance
const redisConfig = new RedisConfig();

module.exports = redisConfig;