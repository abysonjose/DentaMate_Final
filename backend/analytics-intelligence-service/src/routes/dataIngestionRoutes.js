const express = require('express');
const router = express.Router();
const DataIngestionService = require('../services/DataIngestionService');
const { 
  authenticateToken, 
  validateServiceAccess,
  validateTenantAccess 
} = require('../middleware/auth');
const { 
  validateDataIngestion,
  validateDateRange,
  validatePagination 
} = require('../middleware/validation');
const logger = require('../utils/logger');

const dataIngestionService = new DataIngestionService();

// Ingest data from services
router.post('/ingest',
  authenticateToken,
  validateServiceAccess([
    'appointment-scheduling-service',
    'billing-payment-service',
    'lab-diagnostics-service',
    'payroll-hr-service',
    'inventory-pharmacy-service',
    'token-queue-realtime-service',
    'nursing-care-service',
    'ai-diagnosis-service',
    'insurance-claims-service',
    'accounting-finance-service',
    'collaboration-meeting-service',
    'notification-communication-service'
  ]),
  validateTenantAccess,
  validateDataIngestion,
  async (req, res) => {
    try {
      const {
        sourceService,
        dataType,
        data,
        branchId,
        timestamp,
        batchId,
        metadata = {}
      } = req.body;

      // Validate that the service matches the authenticated service
      if (req.serviceId !== sourceService) {
        return res.status(403).json({
          success: false,
          message: 'Service ID mismatch'
        });
      }

      const result = await dataIngestionService.ingestData(
        req.tenantId,
        sourceService,
        dataType,
        data,
        {
          branchId,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          batchId,
          metadata: {
            ...metadata,
            requestId: req.headers['x-request-id'],
            correlationId: req.headers['x-correlation-id'],
            sourceVersion: req.headers['x-service-version'],
            apiEndpoint: req.originalUrl,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
          }
        }
      );

      logger.info('Data ingestion completed successfully', {
        tenantId: req.tenantId,
        sourceService,
        dataType,
        recordCount: data.length,
        batchId: result.data.batchId,
        recordsProcess