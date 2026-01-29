const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

winston.addColors(logColors);

// Create logger configuration
const createLogger = () => {
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
      let logMessage = `${timestamp} [${level.toUpperCase()}]`;
      
      if (service) {
        logMessage += ` [${service}]`;
      }
      
      logMessage += `: ${message}`;
      
      // Add metadata if present
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    })
  );

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, service }) => {
      let logMessage = `${timestamp} ${level}`;
      
      if (service) {
        logMessage += ` [${service}]`;
      }
      
      logMessage += `: ${message}`;
      
      return logMessage;
    })
  );

  const transports = [
    // Console transport
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  ];

  // File transport for production
  if (process.env.NODE_ENV === 'production') {
    const logDir = path.join(process.cwd(), 'logs');
    
    transports.push(
      // Error log file
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        handleExceptions: true,
        handleRejections: true
      }),
      
      // Combined log file
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
  }

  return winston.createLogger({
    levels: logLevels,
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { 
      service: 'accounting-finance-service',
      version: process.env.npm_package_version || '1.0.0'
    },
    transports,
    exitOnError: false
  });
};

const logger = createLogger();

// Add custom methods for structured logging
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    tenantId: req.user?.tenantId,
    userId: req.user?.userId
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context
  });
};

logger.logFinancialOperation = (operation, data) => {
  logger.info(`Financial Operation: ${operation}`, {
    operation,
    tenantId: data.tenantId,
    branchId: data.branchId,
    amount: data.amount,
    reference: data.reference,
    userId: data.userId
  });
};

logger.logAuditEvent = (event, userId, tenantId, details = {}) => {
  logger.info(`Audit Event: ${event}`, {
    event,
    userId,
    tenantId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = logger;