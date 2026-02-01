const AuditService = require('../services/AuditService');
const logger = require('../utils/logger');

class AuditController {
  /**
   * Create a single audit event
   * POST /api/v1/audit/events
   */
  async createEvent(req, res) {
    try {
      const eventData = req.body;

      // For service-to-service calls, use the provided tenant context
      if (req.service) {
        // Service calls must provide tenant context in the request
        if (!eventData.tenantId) {
          return res.status(400).json({
            success: false,
            message: 'Tenant ID is required for service calls',
            code: 'TENANT_ID_REQUIRED'
          });
        }
      } else if (req.user) {
        // For user calls, use the authenticated user's tenant context
        eventData.tenantId = req.user.tenantId;
        eventData.branchId = req.user.branchId;
      }

      const result = await AuditService.createAuditEvent(eventData);

      logger.info('Audit event created via API', {
        eventId: result.eventId,
        tenantId: eventData.tenantId,
        sourceService: eventData.sourceService,
        requestSource: req.service ? 'service' : 'user'
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error creating audit event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create audit event',
        code: 'AUDIT_CREATE_ERROR'
      });
    }
  }

  /**
   * Create multiple audit events in batch
   * POST /api/v1/audit/events/batch
   */
  async createBatchEvents(req, res) {
    try {
      const { events } = req.body;
      let tenantId = null;

      // For service-to-service calls
      if (req.service) {
        // All events in batch should have tenant context
        const missingTenant = events.find(event => !event.tenantId);
        if (missingTenant) {
          return res.status(400).json({
            success: false,
            message: 'All events must have tenant ID for service calls',
            code: 'TENANT_ID_REQUIRED'
          });
        }
      } else if (req.user) {
        // For user calls, apply user's tenant context to all events
        tenantId = req.user.tenantId;
        const branchId = req.user.branchId;
        
        events.forEach(event => {
          event.tenantId = tenantId;
          if (branchId) event.branchId = branchId;
        });
      }

      const result = await AuditService.createBatchAuditEvents(events, tenantId);

      logger.info('Batch audit events created via API', {
        eventsCount: result.eventsCreated,
        tenantId: tenantId || 'multiple',
        requestSource: req.service ? 'service' : 'user'
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error creating batch audit events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create batch audit events',
        code: 'AUDIT_BATCH_CREATE_ERROR'
      });
    }
  }

  /**
   * Query audit events with filters
   * GET /api/v1/audit/events
   */
  async queryEvents(req, res) {
    try {
      const filters = req.query;
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      // Build user context for query
      const userContext = {
        tenantId: req.user?.tenantId,
        branchId: req.user?.branchId,
        role: req.user?.role,
        auditAccess: req.auditAccess
      };

      const result = await AuditService.queryAuditEvents(filters, pagination, userContext);

      logger.info('Audit events queried', {
        userId: req.user?.userId,
        tenantId: userContext.tenantId,
        filters: Object.keys(filters).filter(key => filters[key]),
        resultCount: result.data.events.length,
        totalCount: result.data.pagination.totalCount
      });

      res.json(result);
    } catch (error) {
      logger.error('Error querying audit events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to query audit events',
        code: 'AUDIT_QUERY_ERROR'
      });
    }
  }

  /**
   * Get specific audit event by ID
   * GET /api/v1/audit/events/:eventId
   */
  async getEventById(req, res) {
    try {
      const { eventId } = req.params;

      const userContext = {
        tenantId: req.user?.tenantId,
        branchId: req.user?.branchId,
        role: req.user?.role,
        auditAccess: req.auditAccess
      };

      const result = await AuditService.getAuditEventById(eventId, userContext);

      if (!result.success) {
        return res.status(404).json(result);
      }

      logger.info('Audit event retrieved', {
        eventId,
        userId: req.user?.userId,
        tenantId: userContext.tenantId
      });

      res.json(result);
    } catch (error) {
      logger.error('Error getting audit event by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit event',
        code: 'AUDIT_GET_ERROR'
      });
    }
  }

  /**
   * Get audit summary for a period
   * GET /api/v1/audit/summary
   */
  async getSummary(req, res) {
    try {
      const { periodType, startDate, endDate, branchId } = req.query;
      const tenantId = req.user?.tenantId;

      if (!tenantId && req.user?.role !== 'SAAS_ADMIN') {
        return res.status(400).json({
          success: false,
          message: 'Tenant context is required',
          code: 'TENANT_REQUIRED'
        });
      }

      const result = await AuditService.getAuditSummary(
        tenantId,
        periodType,
        startDate,
        endDate,
        branchId
      );

      logger.info('Audit summary retrieved', {
        userId: req.user?.userId,
        tenantId,
        periodType,
        dateRange: `${startDate} to ${endDate}`,
        fromCache: result.fromCache
      });

      res.json(result);
    } catch (error) {
      logger.error('Error getting audit summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit summary',
        code: 'AUDIT_SUMMARY_ERROR'
      });
    }
  }

  /**
   * Verify audit trail integrity
   * GET /api/v1/audit/integrity
   */
  async verifyIntegrity(req, res) {
    try {
      const { limit } = req.query;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant context is required for integrity check',
          code: 'TENANT_REQUIRED'
        });
      }

      const result = await AuditService.verifyIntegrity(tenantId, parseInt(limit) || 1000);

      logger.info('Audit integrity check performed', {
        userId: req.user?.userId,
        tenantId,
        eventsChecked: result.data.eventsChecked,
        isValid: result.data.isValid,
        issuesFound: result.data.issues.length,
        fromCache: result.fromCache
      });

      res.json(result);
    } catch (error) {
      logger.error('Error verifying audit integrity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify audit integrity',
        code: 'AUDIT_INTEGRITY_ERROR'
      });
    }
  }

  /**
   * Get audit statistics for dashboard
   * GET /api/v1/audit/statistics
   */
  async getStatistics(req, res) {
    try {
      const { days, branchId } = req.query;
      const tenantId = req.user?.tenantId;

      if (!tenantId && req.user?.role !== 'SAAS_ADMIN') {
        return res.status(400).json({
          success: false,
          message: 'Tenant context is required',
          code: 'TENANT_REQUIRED'
        });
      }

      const result = await AuditService.getAuditStatistics(
        tenantId,
        branchId,
        parseInt(days) || 30
      );

      logger.info('Audit statistics retrieved', {
        userId: req.user?.userId,
        tenantId,
        days: parseInt(days) || 30,
        branchId
      });

      res.json(result);
    } catch (error) {
      logger.error('Error getting audit statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit statistics',
        code: 'AUDIT_STATISTICS_ERROR'
      });
    }
  }

  /**
   * Export audit events (limited access)
   * POST /api/v1/audit/export
   */
  async exportEvents(req, res) {
    try {
      const { format = 'json', filters = {} } = req.body;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant context is required for export',
          code: 'TENANT_REQUIRED'
        });
      }

      // Limit export to authorized roles
      const authorizedRoles = ['CENTRAL_ADMIN', 'COMPLIANCE_OFFICER', 'ACCOUNTS_MANAGER'];
      if (!authorizedRoles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for audit export',
          code: 'EXPORT_ACCESS_DENIED'
        });
      }

      // Apply role-based filtering for exports
      const userContext = {
        tenantId,
        branchId: req.user?.branchId,
        role: req.user?.role,
        auditAccess: req.auditAccess
      };

      // Limit export size
      const pagination = { page: 1, limit: 10000 }; // Max 10k records per export

      const result = await AuditService.queryAuditEvents(filters, pagination, userContext);

      // Log the export activity
      logger.warn('Audit data exported', {
        userId: req.user?.userId,
        role: req.user?.role,
        tenantId,
        recordCount: result.data.events.length,
        format,
        filters: Object.keys(filters),
        ip: req.ip
      });

      // Set appropriate headers for download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-export-${Date.now()}.json"`);

      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        recordCount: result.data.events.length,
        filters,
        data: result.data.events
      });
    } catch (error) {
      logger.error('Error exporting audit events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export audit events',
        code: 'AUDIT_EXPORT_ERROR'
      });
    }
  }

  /**
   * Health check endpoint
   * GET /health
   */
  async healthCheck(req, res) {
    try {
      const dbConfig = require('../config/database');
      const redisConfig = require('../config/redis');

      const [dbHealth, redisHealth] = await Promise.all([
        dbConfig.healthCheck(),
        redisConfig.healthCheck()
      ]);

      const isHealthy = dbHealth.healthy && redisHealth.healthy;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        service: 'audit-logging-service',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        status: isHealthy ? 'healthy' : 'unhealthy',
        checks: {
          database: dbHealth,
          redis: redisHealth
        }
      });
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(503).json({
        success: false,
        service: 'audit-logging-service',
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

module.exports = new AuditController();