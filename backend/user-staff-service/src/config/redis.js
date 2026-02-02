const redis = require('redis');
const logger = require('../utils/logger');

class RedisConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 3000;
  }

  async connect() {
    try {
      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000
      };

      this.client = redis.createClient(redisConfig);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        logger.info('✅ Redis connected successfully', {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          database: redisConfig.database
        });
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis connection error:', error);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.warn('Redis connection ended');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      await this.client.connect();

    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;
      
      logger.error(`Redis connection failed (attempt ${this.connectionAttempts}/${this.maxRetries}):`, error);
      
      if (this.connectionAttempts < this.maxRetries) {
        logger.info(`Retrying Redis connection in ${this.retryDelay / 1000} seconds...`);
        setTimeout(() => this.connect(), this.retryDelay);
      } else {
        logger.warn('Max Redis connection attempts reached. Continuing without cache...');
        this.isConnected = false;
      }
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }

  async get(key) {
    try {
      if (!this.isConnected || !this.client) {
        return null;
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }
      
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async keys(pattern) {
    try {
      if (!this.isConnected || !this.client) {
        return [];
      }
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis KEYS error:', error);
      return [];
    }
  }

  async flushPattern(pattern) {
    try {
      if (!this.isConnected || !this.client) {
        return 0;
      }
      
      const keys = await this.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await this.client.del(keys);
      return result;
    } catch (error) {
      logger.error('Redis FLUSH PATTERN error:', error);
      return 0;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      status: this.client ? this.client.status : 'disconnected'
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected || !this.client) {
        return { status: 'disconnected', message: 'Redis not connected' };
      }

      await this.client.ping();
      
      return {
        status: 'healthy',
        message: 'Redis connection is healthy',
        details: this.getConnectionStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Redis health check failed',
        error: error.message
      };
    }
  }
}

module.exports = new RedisConnection();