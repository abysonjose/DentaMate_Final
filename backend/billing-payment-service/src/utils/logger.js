const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = process.env.LOG_FILE_PATH || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, tenantId, userId, ...meta }) => {
    let logEntry = `${timestamp} [${level.toUpperCase()}]`;
    
    if (service) logEntry += ` [${service}]`;
    if (tenantId) logEntry += ` [Tenant:${tenantId}]`;
    if (userId) logEntry += ` [User:${userId}]`;
    
    logEntry += `: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logEntry += ` ${JSON.stringify(meta)}`;
    }
    
    return logEntry;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'billing-payment-service' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Billing-specific logging methods
logger.logBillCreation = (billData, userId, tenantId) => {
  logger.info('Bill created', {
    billId: billData.billId,
    appointmentId: billData.appointmentId,
    patientId: billData.patientId,
    amount: billData.amount,
    userId,
    tenantId,
    action: 'BILL_CREATED'
  });
};

logger.logPaymentProcessed = (paymentData, userId, tenantId) => {
  logger.info('Payment processed', {
    paymentId: paymentData.paymentId,
    invoiceId: paymentData.invoiceId,
    amount: paymentData.amount,
    mode: paymentData.mode,
    status: paymentData.status,
    userId,
    tenantId,
    action: 'PAYMENT_PROCESSED'
  });
};

logger.logRefundApproved = (refundData, userId, tenantId) => {
  logger.info('Refund approved', {
    refundId: refundData.refundId,
    invoiceId: refundData.invoiceId,
    amount: refundData.amount,
    reason: refundData.reason,
    userId,
    tenantId,
    action: 'REFUND_APPROVED'
  });
};

logger.logSecurityEvent = (event, details, userId, tenantId) => {
  logger.warn('Security event', {
    event,
    details,
    userId,
    tenantId,
    action: 'SECURITY_EVENT'
  });
};

logger.logAuditEvent = (action, resource, resourceId, changes, userId, tenantId) => {
  logger.info('Audit event', {
    action,
    resource,
    resourceId,
    changes,
    userId,
    tenantId,
    action: 'AUDIT_EVENT'
  });
};

module.exports = logger;