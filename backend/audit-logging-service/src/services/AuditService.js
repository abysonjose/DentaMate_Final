const AuditEvent = require('../models/AuditEvent');
const AuditSummary = require('../models/AuditSummary');
const logger = require('../utils/logger');
const redisConfig = require('../config/redis');
const { v4: uuidv4 } = require('uuid');

class AuditService {
  constructor() {
    this.batchBuffer = new Map(); // For batching events
    this.batchTimeout = 5000; // 5 seconds
    this.maxBatchSize = 100;
  }

  /**
   * Create a single audit event
   */
  async createAuditEvent(eventData) {
    try {
      // Validate required fields
      if (!eventData.tenantId || !eventData.actorId || !eventData.action) {
        throw new Error('Missing required audit event fields');
      }

      // Create the audit event
      const auditEvent = new AuditEvent({
        ...eventData,
        eventId: uuidv4(),
        timestamp: eventData.timestamp || new Date()
      });

      // Save to database
      const savedEvent = await auditEvent.save();

      // Update counters in Redis
      await this.updateEventCounters(savedEvent);

      // Log critical events
      if (savedEvent.severity === 'CRITICAL') {
        logger.warn('Critical audit event created', {
          eventId: savedEvent.eventId,
          tenantId: savedEvent.tenantId,
          action: savedEvent.action,
          resource: savedEvent.resource,
          actorId: savedEvent.actorId
        });
      }

      logger.info('Audit event created', {
        eventId: savedEvent.eventId,
        tenantId: savedEvent.tenantId,
        category: savedEvent.category,
        action: savedEvent.action
      });

      return {
        success: true,
        eventId: savedEvent.eventId,
        timestamp: savedEvent.timestamp
      };
    } catch (error) {
      logger.error('Failed to create audit event:', error);
      throw error;
    }
  }

  /**
   * Create multiple audit events in batch
   */
  async createBatchAuditEvents(eventsData, tenantId = null) {
    try {
      const events = eventsData.map(eventData => ({
        ...eventData,
        eventId: uuidv4(),
        timestamp: eventData.timestamp || new Date(),
        tenantId: tenantId || eventData.tenantId
      }));

      // Validate all events have required fields
      for (const event of events) {
        if (!event.tenantId || !event.actorId || !event.action) {
          throw new Error('Missing required fields in batch event');
        }
      }

      // Insert all events
      const savedEvents = await AuditEvent.insertMany(events, { ordered: false });

      // Update counters for all events
      await Promise.all(savedEvents.map(event => this.updateEventCounters(event)));

      // Log batch creation
      logger.info('Batch audit events created', {
        count: savedEvents.length,
        tenantId: tenantId || 'multiple',
        categories: [...new Set(savedEvents.map(e => e.category))]
      });

      return {
        success: true,
        eventsCreated: savedEvents.length,
        eventIds: savedEvents.map(e => e.eventId)
      };
    } catch (error) {
      logger.error('Failed to create batch audit events:', error);
      throw error;
    }
  }

  /**
   * Query audit events with filters
   */
  async queryAuditEvents(filters, pagination, userContext) {
    try {
      const {
        tenantId,
        branchId,
        startDate,
        endDate,
        category,
        action,
        actorId,
        actorRole,
        sourceService,
        severity,
        resourceType,
        resourceId,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = filters;

      const { page = 1, limit = 50 } = pagination;

      // Build query based on user context and filters
      let query = this.buildQuery(filters, userContext);

      // Apply date range if provided
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [events, totalCount] = await Promise.all([
        AuditEvent.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditEvent.countDocuments(query)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          events,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit
          }
        }
      };
    } catch (error) {
      logger.error('Failed to query audit events:', error);
      throw error;
    }
  }

  /**
   * Get audit event by ID
   */
  async getAuditEventById(eventId, userContext) {
    try {
      const query = { eventId };

      // Apply tenant filtering based on user context
      if (userContext.tenantId) {
        query.tenantId = userContext.tenantId;
      }

      if (userContext.branchId) {
        query.branchId = userContext.branchId;
      }

      const event = await AuditEvent.findOne(query).lean();

      if (!event) {
        return {
          success: false,
          message: 'Audit event not found',
          code: 'EVENT_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: event
      };
    } catch (error) {
      logger.error('Failed to get audit event by ID:', error);
      throw error;
    }
  }

  /**
   * Get audit summary for a tenant
   */
  async getAuditSummary(tenantId, periodType, startDate, endDate, branchId = null) {
    try {
      // Check cache first
      const cacheKey = `${tenantId}:${periodType}:${startDate}:${endDate}:${branchId || 'all'}`;
      const cached = await redisConfig.getCachedAuditSummary(cacheKey);
      
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }

      // Build aggregation pipeline
      const pipeline = this.buildSummaryPipeline(tenantId, startDate, endDate, branchId);

      // Execute aggregation
      const results = await AuditEvent.aggregate(pipeline);

      // Format summary data
      const summary = this.formatSummaryResults(results, periodType, startDate, endDate);

      // Cache the results
      await redisConfig.cacheAuditSummary(cacheKey, summary, 300); // 5 minutes

      return {
        success: true,
        data: summary,
        fromCache: false
      };
    } catch (error) {
      logger.error('Failed to get audit summary:', error);
      throw error;
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyIntegrity(tenantId, limit = 1000) {
    try {
      // Check cache first
      const cached = await redisConfig.getCachedIntegrityCheck(tenantId);
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }

      // Perform integrity check
      const result = await AuditEvent.verifyIntegrity(tenantId, limit);

      // Cache the result
      await redisConfig.cacheIntegrityCheck(tenantId, result, 3600); // 1 hour

      logger.info('Integrity check completed', {
        tenantId,
        eventsChecked: result.eventsChecked,
        isValid: result.isValid,
        issuesFound: result.issues.length
      });

      return {
        success: true,
        data: result,
        fromCache: false
      };
    } catch (error) {
      logger.error('Failed to verify integrity:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  async getAuditStatistics(tenantId, branchId = null, days = 30) {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      const endDate = new Date();

      const query = { tenantId, timestamp: { $gte: startDate, $lte: endDate } };
      if (branchId) query.branchId = branchId;

      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            criticalEvents: {
              $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] }
            },
            securityEvents: {
              $sum: { $cond: [{ $eq: ['$category', 'SECURITY'] }, 1, 0] }
            },
            financialEvents: {
              $sum: { $cond: [{ $eq: ['$category', 'FINANCIAL'] }, 1, 0] }
            },
            clinicalEvents: {
              $sum: { $cond: [{ $eq: ['$category', 'CLINICAL'] }, 1, 0] }
            },
            uniqueActors: { $addToSet: '$actorId' },
            uniqueServices: { $addToSet: '$sourceService' }
          }
        },
        {
          $project: {
            totalEvents: 1,
            criticalEvents: 1,
            securityEvents: 1,
            financialEvents: 1,
            clinicalEvents: 1,
            uniqueActors: { $size: '$uniqueActors' },
            uniqueServices: { $size: '$uniqueServices' }
          }
        }
      ];

      const [stats] = await AuditEvent.aggregate(pipeline);

      return {
        success: true,
        data: stats || {
          totalEvents: 0,
          criticalEvents: 0,
          securityEvents: 0,
          financialEvents: 0,
          clinicalEvents: 0,
          uniqueActors: 0,
          uniqueServices: 0
        }
      };
    } catch (error) {
      logger.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  /**
   * Helper method to build query based on filters and user context
   */
  buildQuery(filters, userContext) {
    let query = {};

    // Apply tenant isolation
    if (userContext.tenantId) {
      query.tenantId = userContext.tenantId;
    }

    if (userContext.branchId) {
      query.branchId = userContext.branchId;
    }

    // Apply role-based filtering
    if (userContext.auditAccess?.financialOnly) {
      query.category = 'FINANCIAL';
    }

    if (userContext.auditAccess?.platformOnly) {
      // For SaaS Admin - only platform-level events
      query.category = 'SAAS_GOVERNANCE';
    }

    // Apply additional filters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        switch (key) {
          case 'category':
          case 'action':
          case 'actorId':
          case 'actorRole':
          case 'sourceService':
          case 'severity':
            query[key] = filters[key];
            break;
          case 'resourceType':
            query['resource.type'] = filters[key];
            break;
          case 'resourceId':
            query['resource.id'] = filters[key];
            break;
        }
      }
    });

    return query;
  }

  /**
   * Helper method to build summary aggregation pipeline
   */
  buildSummaryPipeline(tenantId, startDate, endDate, branchId) {
    const matchStage = {
      tenantId,
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (branchId) {
      matchStage.branchId = branchId;
    }

    return [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          eventsByCategory: {
            $push: {
              category: '$category',
              count: 1
            }
          },
          eventsByAction: {
            $push: {
              action: '$action',
              count: 1
            }
          },
          eventsBySeverity: {
            $push: {
              severity: '$severity',
              count: 1
            }
          },
          topActors: {
            $push: {
              actorId: '$actorId',
              actorRole: '$actorRole'
            }
          },
          serviceActivity: {
            $push: {
              service: '$sourceService'
            }
          }
        }
      }
    ];
  }

  /**
   * Helper method to format summary results
   */
  formatSummaryResults(results, periodType, startDate, endDate) {
    if (!results || results.length === 0) {
      return {
        totalEvents: 0,
        eventsByCategory: {},
        eventsByAction: {},
        eventsBySeverity: {},
        topActors: [],
        serviceActivity: [],
        period: { type: periodType, start: startDate, end: endDate }
      };
    }

    const result = results[0];

    // Process category counts
    const categoryCount = {};
    result.eventsByCategory.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });

    // Process action counts
    const actionCount = {};
    result.eventsByAction.forEach(item => {
      actionCount[item.action] = (actionCount[item.action] || 0) + 1;
    });

    // Process severity counts
    const severityCount = {};
    result.eventsBySeverity.forEach(item => {
      severityCount[item.severity] = (severityCount[item.severity] || 0) + 1;
    });

    return {
      totalEvents: result.totalEvents,
      eventsByCategory: categoryCount,
      eventsByAction: actionCount,
      eventsBySeverity: severityCount,
      topActors: result.topActors.slice(0, 10),
      serviceActivity: result.serviceActivity.slice(0, 10),
      period: { type: periodType, start: startDate, end: endDate }
    };
  }

  /**
   * Helper method to update event counters in Redis
   */
  async updateEventCounters(event) {
    try {
      await Promise.all([
        redisConfig.incrementEventCounter(event.tenantId, event.category),
        redisConfig.incrementEventCounter(event.tenantId, event.action),
        redisConfig.incrementEventCounter(event.tenantId, 'total')
      ]);
    } catch (error) {
      logger.error('Failed to update event counters:', error);
      // Don't throw - this is not critical
    }
  }
}

module.exports = new AuditService();