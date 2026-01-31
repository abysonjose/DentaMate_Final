const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { 
    service: 'inventory-pharmacy-service',
    version: '1.0.0'
  },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add request logging helper
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    tenantId: req.user?.tenantId,
    branchId: req.user?.branchId,
    userId: req.user?.userId,
    role: req.user?.role
  };

  if (res.statusCode >= 400) {
    logger.error('HTTP Request Error', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

// Add audit logging helper
logger.logAudit = (action, resource, user, details = {}) => {
  logger.info('Audit Log', {
    action,
    resource,
    user: {
      userId: user.userId,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId
    },
    details,
    timestamp: new Date().toISOString()
  });
};

// Add inventory-specific logging helpers
logger.logStockChange = (medicineId, branchId, oldQuantity, newQuantity, reason, user) => {
  logger.info('Stock Change', {
    medicineId,
    branchId,
    oldQuantity,
    newQuantity,
    difference: newQuantity - oldQuantity,
    reason,
    user: {
      userId: user.userId,
      role: user.role
    },
    timestamp: new Date().toISOString()
  });
};

logger.logDispensing = (dispenseId, prescriptionId, medicines, user) => {
  logger.info('Medicine Dispensed', {
    dispenseId,
    prescriptionId,
    medicines,
    dispensedBy: {
      userId: user.userId,
      role: user.role
    },
    timestamp: new Date().toISOString()
  });
};

logger.logAlert = (type, message, data = {}) => {
  logger.warn('Inventory Alert', {
    alertType: type,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;