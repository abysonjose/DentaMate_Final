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

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.align(),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message} ${
      info.stack ? '\n' + info.stack : ''
    } ${
      Object.keys(info).length > 3 ? '\n' + JSON.stringify(
        Object.fromEntries(
          Object.entries(info).filter(([key]) => 
            !['timestamp', 'level', 'message', 'stack'].includes(key)
          )
        ), 
        null, 
        2
      ) : ''
    }`
  )
);

// Create transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: consoleFormat
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'audit-service.log'),
    level: 'info',
    format: logFormat,
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    tailable: true
  }),

  // Separate file for errors
  new winston.transports.File({
    filename: path.join(logsDir, 'audit-errors.log'),
    level: 'error',
    format: logFormat,
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 5,
    tailable: true
  }),

  // Separate file for audit-specific events
  new winston.transports.File({
    filename: path.join(logsDir, 'audit-events.log'),
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf((info) => {
        // Only log audit-related events to this file
        if (info.message && (
          info.message.includes('audit') || 
          info.message.includes('Audit') ||
          info.eventId ||
          info.tenantId
        )) {
          return JSON.stringify(info);
        }
        return false;
      })
    ),
    maxsize: 100 * 1024 * 1024, // 100MB for audit events
    maxFiles: 20,
    tailable: true
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true
});

// Add request logging middleware
logger.requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      tenantId: req.user?.tenantId,
      serviceId: req.service?.serviceId
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Error', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });

  next();
};

// Add audit event logging helper
logger.auditEvent = (eventType, data) => {
  logger.info(`Audit Event: ${eventType}`, {
    eventType,
    timestamp: new Date().toISOString(),
    ...data
  });
};

// Add security event logging helper
logger.securityEvent = (eventType, data) => {
  logger.warn(`Security Event: ${eventType}`, {
    eventType,
    timestamp: new Date().toISOString(),
    severity: 'HIGH',
    ...data
  });
};

// Add compliance logging helper
logger.complianceEvent = (eventType, data) => {
  logger.info(`Compliance Event: ${eventType}`, {
    eventType,
    timestamp: new Date().toISOString(),
    category: 'COMPLIANCE',
    ...data
  });
};

// Add performance logging helper
logger.performance = (operation, duration, data = {}) => {
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
  logger[level](`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...data
  });
};

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  logger.end();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  logger.end();
});

module.exports = logger;