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
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}` +
    (info.splat !== undefined ? `${info.splat}` : ' ') +
    (info.label ? `[${info.label}]` : '') +
    (info.stack ? `\n${info.stack}` : '')
  )
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
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat
  })
];

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(process.cwd(), 'logs');
  
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: fileFormat,
  transports,
  exitOnError: false
});

// Add request logging helper
logger.logRequest = (req, res, responseTime) => {
  const { method, url, ip } = req;
  const { statusCode } = res;
  const userAgent = req.get('User-Agent') || '';
  const tenantId = req.tenantId || 'unknown';
  const userId = req.userId || 'anonymous';

  logger.http(`${method} ${url}`, {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    ip,
    userAgent,
    tenantId,
    userId
  });
};

// Add error logging helper
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context
  });
};

// Add audit logging helper
logger.logAudit = (action, resource, details = {}) => {
  logger.info(`AUDIT: ${action} ${resource}`, {
    action,
    resource,
    timestamp: new Date().toISOString(),
    ...details
  });
};

module.exports = logger;