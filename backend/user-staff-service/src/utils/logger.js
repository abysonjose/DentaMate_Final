const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(logColors);

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

// Create file format (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: logFormat,
    level: process.env.LOG_LEVEL || 'info'
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: fileFormat,
  transports,
  exitOnError: false
});

// Enhanced logging methods
class Logger {
  static info(message, meta = {}) {
    logger.info(message, meta);
  }

  static error(message, error = null, meta = {}) {
    if (error instanceof Error) {
      logger.error(message, { 
        error: error.message, 
        stack: error.stack, 
        ...meta 
      });
    } else {
      logger.error(message, { error, ...meta });
    }
  }

  static warn(message, meta = {}) {
    logger.warn(message, meta);
  }

  static debug(message, meta = {}) {
    logger.debug(message, meta);
  }

  static http(message, meta = {}) {
    logger.http(message, meta);
  }

  // Request logging
  static logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId,
      branchId: req.user?.branchId
    };

    if (res.statusCode >= 400) {
      this.warn('HTTP Request', logData);
    } else {
      this.http('HTTP Request', logData);
    }
  }

  // Staff operation logging
  static logStaffOperation(operation, staffId, performedBy, details = {}) {
    this.info(`Staff Operation: ${operation}`, {
      operation,
      staffId,
      performedBy,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Role operation logging
  static logRoleOperation(operation, staffId, roles, performedBy, details = {}) {
    this.info(`Role Operation: ${operation}`, {
      operation,
      staffId,
      roles,
      performedBy,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Security logging
  static logSecurityEvent(event, details = {}) {
    this.warn(`Security Event: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Database operation logging
  static logDatabaseOperation(operation, collection, details = {}) {
    this.debug(`Database Operation: ${operation}`, {
      operation,
      collection,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Cache operation logging
  static logCacheOperation(operation, key, hit = null, details = {}) {
    this.debug(`Cache Operation: ${operation}`, {
      operation,
      key,
      hit,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // External service logging
  static logExternalService(service, operation, details = {}) {
    this.info(`External Service: ${service} - ${operation}`, {
      service,
      operation,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Performance logging
  static logPerformance(operation, duration, details = {}) {
    const level = duration > 1000 ? 'warn' : 'debug';
    logger[level](`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Audit logging
  static logAudit(action, entityType, entityId, performedBy, changes = {}) {
    this.info(`Audit: ${action}`, {
      action,
      entityType,
      entityId,
      performedBy,
      changes,
      timestamp: new Date().toISOString()
    });
  }
}

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
    format: fileFormat
  })
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at Promise', reason, { promise });
});

module.exports = Logger;