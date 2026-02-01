const express = require('express');
const AuditController = require('../controllers/AuditController');
const { 
  authenticateToken, 
  authenticateService, 
  enforceTenantIsolation, 
  authorizeAuditAccess 
} = require('../middleware/auth');
const {
  validateAuditEvent,
  validateBatchAuditEvents,
  validateQueryParams,
  validateSummaryQuery,
  validateIntegrityCheck,
  validateDateRange,
  validateTenantContext,
  validateBatchSize
} = require('../middleware/validation');
const {
  auditQueryLimiter,
  eventIngestionLimiter,
  batchOperationLimiter,
  integrityCheckLimiter,
  exportLimiter,
  auditAccessLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

// Health check endpoint (no authentication required)
router.get('/health', AuditController.healthCheck);

// Event Ingestion Routes (Service-to-Service)
router.post('/events',
  eventIngestionLimiter,
  authenticateService,
  validateAuditEvent,
  validateTenantContext,
  AuditController.createEvent
);

router.post('/events/batch',
  batchOperationLimiter,
  authenticateService,
  validateBatchAuditEvents,
  validateBatchSize(100),
  validateTenantContext,
  AuditController.createBatchEvents
);

// Query & Retrieval Routes (User Access)
router.get('/events',
  auditAccessLimiter,
  authenticateToken,
  enforceTenantIsolation,
  authorizeAuditAccess('read'),
  validateQueryParams,
  validateDateRange,
  AuditController.queryEvents
);

router.get('/events/:eventId',
  auditQueryLimiter,
  authenticateToken,
  enforceTenantIsolation,
  authorizeAuditAccess('read'),
  AuditController.getEventById
);

// Summary & Analytics Routes
router.get('/summary',
  auditQueryLimiter,
  authenticateToken,
  enforceTenantIsolation,
  authorizeAuditAccess('read'),
  validateSummaryQuery,
  validateDateRange,
  AuditController.getSummary
);

router.get('/statistics',
  auditQueryLimiter,
  authenticateToken,
  enforceTenantIsolation,
  authorizeAuditAccess('read'),
  AuditController.getStatistics
);

// Integrity & Compliance Routes
router.get('/integrity',
  integrityCheckLimiter,
  authenticateToken,
  enforceTenantIsolation,
  authorizeAuditAccess('read'),
  validateIntegrityCheck,
  AuditController.verifyIntegrity
);

// Export Routes (Restricted Access)
router.post('/export',
  exportLimiter,
  authenticateToken,
  enforceTenantIsolation,
  authorizeAuditAccess('read'),
  validateDateRange,
  AuditController.exportEvents
);

// Error handling middleware for this router
router.use((error, req, res, next) => {
  const logger = require('../utils/logger');
  
  logger.error('Audit route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error in audit service',
    code: 'AUDIT_ROUTE_ERROR'
  });
});

module.exports = router;