const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, tenantId, ...meta }) => {
    let msg = `${timestamp} [${level}]`;
    if (service) msg += ` [${service}]`;
    if (tenantId) msg += ` [tenant:${tenantId}]`;
    msg += `: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }),

  // Combined log file
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
    level: 'info'
  }),

  // Error log file
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
    level: 'error'
  }),

  // Analytics specific log file
  new DailyRotateFile({
    filename: path.join(logDir, 'analytics-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '30d',
    format: logFormat,
    level: 'info'
  })
];

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'analytics-intelligence-service',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  transports,
  exitOnError: false
});

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(logDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
  })
);

logger.rejections.handle(
  new DailyRotateFile({
    filename: path.join(logDir, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
  })
);

// Analytics-specific logging methods
logger.logDataIngestion = (tenantId, sourceService, recordCount, status, error = null) => {
  logger.info('Data ingestion event', {
    tenantId,
    sourceService,
    recordCount,
    status,
    error: error?.message,
    category: 'data_ingestion'
  });
};

logger.logMetricCalculation = (tenantId, metric, value, calculationTime) => {
  logger.info('Metric calculated', {
    tenantId,
    metric,
    value,
    calculationTime,
    category: 'metric_calculation'
  });
};

logger.logDashboardAccess = (tenantId, userId, role, dashboardType, responseTime) => {
  logger.info('Dashboard accessed', {
    tenantId,
    userId,
    role,
    dashboardType,
    responseTime,
    category: 'dashboard_access'
  });
};

logger.logReportGeneration = (tenantId, reportType, reportId, generationTime, status) => {
  logger.info('Report generated', {
    tenantId,
    reportType,
    reportId,
    generationTime,
    status,
    category: 'report_generation'
  });
};

logger.logCacheOperation = (operation, key, hit, responseTime) => {
  logger.debug('Cache operation', {
    operation,
    key,
    hit,
    responseTime,
    category: 'cache'
  });
};

logger.logPerformance = (operation, duration, tenantId = null, metadata = {}) => {
  logger.info('Performance metric', {
    operation,
    duration,
    tenantId,
    ...metadata,
    category: 'performance'
  });
};

module.exports = logger;