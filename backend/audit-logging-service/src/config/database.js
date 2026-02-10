const mongoose = require('mongoose');
const logger = require('../utils/logger');

class DatabaseConfig {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI;
      
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is required');
      }

      // MongoDB connection options optimized for audit logging
      const options = {
        useNewUrlParser: true,
        maxPoolSize: 20, // High connection pool for write-heavy workload
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        retryWrites: true,
        w: 'majority', // Ensure write acknowledgment for audit integrity
        readPreference: 'primary', // Always read from primary for consistency
        readConcern: { level: 'majority' }, // Strong consistency for audit data
        writeConcern: { 
          w: 'majority', 
          j: true, // Journal writes for durability
          wtimeout: 10000 
        }
      };

      this.connection = await mongoose.connect(mongoUri, options);
      this.isConnected = true;

      logger.info('✅ MongoDB connected successfully for Audit Service', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        database: this.connection.connection.name
      });

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('❌ MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('🔄 MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      logger.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.isConnected = false;
        logger.info('📴 MongoDB connection closed');
      }
    } catch (error) {
      logger.error('❌ Error closing MongoDB connection:', error);
      throw error;
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

  // Health check for the database
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', healthy: false };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'connected',
        healthy: true,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        database: mongoose.connection.name
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'error',
        healthy: false,
        error: error.message
      };
    }
  }
}

module.exports = new DatabaseConfig();

