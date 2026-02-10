const mongoose = require('mongoose');
const logger = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000;
  }

  async connect() {
    try {
      const mongoUri = process.env.NODE_ENV === 'test' 
        ? process.env.MONGODB_TEST_URI 
        : process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error('MongoDB URI not provided in environment variables');
      }

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0
      };

      await mongoose.connect(mongoUri, options);
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      logger.info('✅ MongoDB connected successfully', {
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      });

      // Connection event handlers
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
        this.handleReconnection();
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;
      
      logger.error(`MongoDB connection failed (attempt ${this.connectionAttempts}/${this.maxRetries}):`, error);
      
      if (this.connectionAttempts < this.maxRetries) {
        logger.info(`Retrying connection in ${this.retryDelay / 1000} seconds...`);
        setTimeout(() => this.connect(), this.retryDelay);
      } else {
        logger.error('Max connection attempts reached. Exiting...');
        process.exit(1);
      }
    }
  }

  async handleReconnection() {
    if (this.connectionAttempts < this.maxRetries) {
      this.connectionAttempts++;
      logger.info(`Attempting to reconnect to MongoDB (${this.connectionAttempts}/${this.maxRetries})...`);
      
      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          logger.error('Reconnection failed:', error);
        }
      }, this.retryDelay);
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('MongoDB connection closed');
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Simple ping to check connection
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        details: this.getConnectionStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database health check failed',
        error: error.message
      };
    }
  }
}

module.exports = new DatabaseConnection();

