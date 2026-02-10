const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info(`Analytics MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Create indexes for analytics collections
    await createAnalyticsIndexes();

    return conn;
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

const createAnalyticsIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // MetricSnapshot indexes
    await db.collection('metricsnapshots').createIndex({ 
      tenantId: 1, 
      branchId: 1, 
      metric: 1, 
      period: -1 
    });
    await db.collection('metricsnapshots').createIndex({ 
      tenantId: 1, 
      metric: 1, 
      createdAt: -1 
    });
    await db.collection('metricsnapshots').createIndex({ 
      period: -1, 
      metric: 1 
    });

    // DataIngestionLog indexes
    await db.collection('dataingestionlogs').createIndex({ 
      tenantId: 1, 
      sourceService: 1, 
      createdAt: -1 
    });
    await db.collection('dataingestionlogs').createIndex({ 
      status: 1, 
      createdAt: -1 
    });

    // ReportRequest indexes
    await db.collection('reportrequests').createIndex({ 
      tenantId: 1, 
      reportType: 1, 
      createdAt: -1 
    });
    await db.collection('reportrequests').createIndex({ 
      status: 1, 
      createdAt: -1 
    });

    // DashboardConfig indexes
    await db.collection('dashboardconfigs').createIndex({ 
      tenantId: 1, 
      role: 1, 
      isActive: 1 
    });

    logger.info('Analytics database indexes created successfully');
  } catch (error) {
    logger.error('Failed to create analytics indexes:', error);
  }
};

module.exports = connectDB;

