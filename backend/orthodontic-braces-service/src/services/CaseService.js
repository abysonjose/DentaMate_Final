const OrthodonticCase = require('../models/OrthodonticCase');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');
const NotificationService = require('./NotificationService');

class CaseService {
  constructor() {
    this.cacheService = new CacheService();
    this.notificationService = new NotificationService();
  }

  async createCase(caseData, createdBy) {
    try {
      const orthodonticCase = new OrthodonticCase({
        ...caseData,
        createdBy,
        updatedBy: createdBy,
        statusHistory: [{
          status: 'CREATED',
          changedBy: createdBy,
          changedAt: new Date(),
          notes: 'Case created'
        }]
      });

      await orthodonticCase.save();

      logger.info('Orthodontic case created', {
        caseId: orthodonticCase.caseId,
        patientId: orthodonticCase.patientId,
        doctorId: orthodonticCase.doctorId,
        caseType: orthodonticCase.caseType,
        tenantId: orthodonticCase.tenantId
      });

      // Send notification to relevant parties
      await this.notificationService.notifyCaseCreated(orthodonticCase);

      // Cache the case
      await this.cacheService.setCaseCache(orthodonticCase.caseId, orthodonticCase);

      return orthodonticCase;
    } catch (error) {
      logger.error('Error creating orthodontic case:', error);
      throw error;
    }
  }

  async getCaseById(caseId, tenantId, userRole, userId) {
    try {
      // Try to get from cache first
      let orthodonticCase = await this.cacheService.getCaseCache(caseId);

      if (!orthodonticCase) {
        orthodonticCase = await OrthodonticCase.findOne({
          caseId,
          tenantId
        });

        if (!orthodonticCase) {
          throw new Error('Case not found');
        }

        // Cache the case
        await this.cacheService.setCaseCache(caseId, orthodonticCase);
      }

      // Apply role-based filtering
      const filteredCase = this.applyRoleBasedFiltering(orthodonticCase, userRole, userId);

      return filteredCase;
    } catch (error) {
      logger.error('Error getting case by ID:', error);
      throw error;
    }
  }

  async getCases(filters, userRole, userId) {
    try {
      const query = OrthodonticCase.findByFilters(filters);

      // Apply role-based filtering to query
      this.applyRoleBasedQueryFiltering(query, filters, userRole, userId);

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
      const sort = { [sortBy]: sortOrder };

      const [cases, totalCount] = await Promise.all([
        query.skip(skip).limit(limit).sort(sort).exec(),
        OrthodonticCase.countDocuments(query.getQuery())
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        cases: cases.map(caseItem => this.applyRoleBasedFiltering(caseItem, userRole, userId)),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting cases:', error);
      throw error;
    }
  }

  async updateCaseStatus(caseId, statusData, updatedBy, userRole) {
    try {
      const orthodonticCase = await OrthodonticCase.findOne({
        caseId,
        tenantId: statusData.tenantId
      });

      if (!orthodonticCase) {
        throw new Error('Case not found');
      }

      // Validate status transition
      this.validateStatusTransition(orthodonticCase.status, statusData.status, userRole);

      // Update case
      orthodonticCase.status = statusData.status;
      orthodonticCase.updatedBy = updatedBy;

      if (statusData.notes) {
        orthodonticCase.statusHistory[orthodonticCase.statusHistory.length - 1].notes = statusData.notes;
      }

      if (statusData.orthotistNotes && userRole === 'ORTHOTIST') {
        orthodonticCase.orthotistNotes = statusData.orthotistNotes;
      }

      if (statusData.fabricationDetails && userRole === 'ORTHOTIST') {
        orthodonticCase.fabricationDetails = {
          ...orthodonticCase.fabricationDetails,
          ...statusData.fabricationDetails
        };
      }

      // Set delivery date for DELIVERED status
      if (statusData.status === 'DELIVERED') {
        orthodonticCase.actualDeliveryDate = new Date();
      }

      await orthodonticCase.save();

      logger.info('Case status updated', {
        caseId,
        oldStatus: orthodonticCase.status,
        newStatus: statusData.status,
        updatedBy,
        userRole
      });

      // Send notifications
      await this.notificationService.notifyStatusChange(orthodonticCase, statusData.status);

      // Update cache
      await this.cacheService.setCaseCache(caseId, orthodonticCase);

      return orthodonticCase;
    } catch (error) {
      logger.error('Error updating case status:', error);
      throw error;
    }
  }

  async updateDeliveryDate(caseId, deliveryData, updatedBy, tenantId) {
    try {
      const orthodonticCase = await OrthodonticCase.findOne({
        caseId,
        tenantId
      });

      if (!orthodonticCase) {
        throw new Error('Case not found');
      }

      orthodonticCase.estimatedDeliveryDate = deliveryData.estimatedDeliveryDate;
      orthodonticCase.updatedBy = updatedBy;

      if (deliveryData.notes) {
        orthodonticCase.orthotistNotes += `\nDelivery date updated: ${deliveryData.notes}`;
      }

      await orthodonticCase.save();

      logger.info('Delivery date updated', {
        caseId,
        estimatedDeliveryDate: deliveryData.estimatedDeliveryDate,
        updatedBy
      });

      // Send notification
      await this.notificationService.notifyDeliveryDateUpdate(orthodonticCase);

      // Update cache
      await this.cacheService.setCaseCache(caseId, orthodonticCase);

      return orthodonticCase;
    } catch (error) {
      logger.error('Error updating delivery date:', error);
      throw error;
    }
  }

  async assignOrthotist(caseId, orthotistId, assignedBy, tenantId) {
    try {
      const orthodonticCase = await OrthodonticCase.findOne({
        caseId,
        tenantId
      });

      if (!orthodonticCase) {
        throw new Error('Case not found');
      }

      orthodonticCase.orthotistId = orthotistId;
      orthodonticCase.updatedBy = assignedBy;

      // Update status to RECEIVED if it's still CREATED
      if (orthodonticCase.status === 'CREATED') {
        orthodonticCase.status = 'RECEIVED';
      }

      await orthodonticCase.save();

      logger.info('Orthotist assigned to case', {
        caseId,
        orthotistId,
        assignedBy
      });

      // Send notification to orthotist
      await this.notificationService.notifyOrthotistAssignment(orthodonticCase);

      // Update cache
      await this.cacheService.setCaseCache(caseId, orthodonticCase);

      return orthodonticCase;
    } catch (error) {
      logger.error('Error assigning orthotist:', error);
      throw error;
    }
  }

  async reportIssue(caseId, issueData, reportedBy, tenantId) {
    try {
      const orthodonticCase = await OrthodonticCase.findOne({
        caseId,
        tenantId
      });

      if (!orthodonticCase) {
        throw new Error('Case not found');
      }

      const issue = {
        type: issueData.type,
        description: issueData.description,
        reportedBy,
        reportedAt: new Date(),
        status: 'OPEN'
      };

      orthodonticCase.issues.push(issue);
      orthodonticCase.updatedBy = reportedBy;

      await orthodonticCase.save();

      const newIssue = orthodonticCase.issues[orthodonticCase.issues.length - 1];

      logger.info('Issue reported for case', {
        caseId,
        issueId: newIssue.issueId,
        type: issueData.type,
        reportedBy
      });

      // Send notification
      await this.notificationService.notifyIssueReported(orthodonticCase, newIssue);

      // Update cache
      await this.cacheService.setCaseCache(caseId, orthodonticCase);

      return newIssue;
    } catch (error) {
      logger.error('Error reporting issue:', error);
      throw error;
    }
  }

  async updateIssue(caseId, issueId, updateData, updatedBy, tenantId) {
    try {
      const orthodonticCase = await OrthodonticCase.findOne({
        caseId,
        tenantId
      });

      if (!orthodonticCase) {
        throw new Error('Case not found');
      }

      const issue = orthodonticCase.issues.id(issueId);
      if (!issue) {
        throw new Error('Issue not found');
      }

      issue.status = updateData.status;
      if (updateData.resolution) {
        issue.resolution = updateData.resolution;
      }

      if (updateData.status === 'RESOLVED') {
        issue.resolvedAt = new Date();
      }

      orthodonticCase.updatedBy = updatedBy;
      await orthodonticCase.save();

      logger.info('Issue updated', {
        caseId,
        issueId,
        status: updateData.status,
        updatedBy
      });

      // Send notification
      await this.notificationService.notifyIssueUpdate(orthodonticCase, issue);

      // Update cache
      await this.cacheService.setCaseCache(caseId, orthodonticCase);

      return issue;
    } catch (error) {
      logger.error('Error updating issue:', error);
      throw error;
    }
  }

  // Helper methods
  validateStatusTransition(currentStatus, newStatus, userRole) {
    const allowedTransitions = {
      'DOCTOR': {
        'CREATED': ['RECEIVED'],
        'RECEIVED': [],
        'IN_REVIEW': [],
        'IN_FABRICATION': [],
        'QUALITY_CHECK': [],
        'READY': [],
        'DELIVERED': []
      },
      'ORTHOTIST': {
        'CREATED': [],
        'RECEIVED': ['IN_REVIEW'],
        'IN_REVIEW': ['IN_FABRICATION'],
        'IN_FABRICATION': ['QUALITY_CHECK'],
        'QUALITY_CHECK': ['READY', 'IN_FABRICATION'],
        'READY': ['DELIVERED'],
        'DELIVERED': []
      }
    };

    const userTransitions = allowedTransitions[userRole] || {};
    const validTransitions = userTransitions[currentStatus] || [];

    if (!validTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus} for role ${userRole}`);
    }
  }

  applyRoleBasedFiltering(orthodonticCase, userRole, userId) {
    const caseObj = orthodonticCase.toObject ? orthodonticCase.toObject() : orthodonticCase;

    switch (userRole) {
      case 'PATIENT':
        // Patients can only see basic status information
        return {
          caseId: caseObj.caseId,
          caseType: caseObj.caseType,
          status: caseObj.status,
          priority: caseObj.priority,
          estimatedDeliveryDate: caseObj.estimatedDeliveryDate,
          actualDeliveryDate: caseObj.actualDeliveryDate,
          createdAt: caseObj.createdAt,
          updatedAt: caseObj.updatedAt
        };

      case 'ORTHOTIST':
        // Orthotists can see cases assigned to them with fabrication details
        if (caseObj.orthotistId !== userId) {
          throw new Error('Access denied: Case not assigned to you');
        }
        // Remove sensitive doctor notes for orthotists
        delete caseObj.doctorNotes;
        return caseObj;

      case 'HEAD_NURSE':
      case 'BRANCH_ADMIN':
        // Monitoring roles can see most information but not sensitive notes
        delete caseObj.doctorNotes;
        delete caseObj.orthotistNotes;
        return caseObj;

      case 'DOCTOR':
      case 'SAAS_ADMIN':
        // Full access
        return caseObj;

      default:
        throw new Error('Invalid user role');
    }
  }

  applyRoleBasedQueryFiltering(query, filters, userRole, userId) {
    switch (userRole) {
      case 'PATIENT':
        query.where({ patientId: userId });
        break;

      case 'ORTHOTIST':
        query.where({ orthotistId: userId });
        break;

      case 'DOCTOR':
        if (!filters.patientId && !filters.orthotistId) {
          query.where({ doctorId: userId });
        }
        break;

      case 'HEAD_NURSE':
      case 'BRANCH_ADMIN':
        // Can see all cases in their branch (already filtered by tenantId/branchId)
        break;

      case 'SAAS_ADMIN':
        // Can see all cases (no additional filtering)
        break;

      default:
        throw new Error('Invalid user role');
    }
  }

  async getCaseStatistics(tenantId, branchId, userRole, userId) {
    try {
      const matchStage = { tenantId };
      
      if (branchId && userRole !== 'SAAS_ADMIN') {
        matchStage.branchId = branchId;
      }

      // Apply role-based filtering
      if (userRole === 'DOCTOR') {
        matchStage.doctorId = userId;
      } else if (userRole === 'ORTHOTIST') {
        matchStage.orthotistId = userId;
      } else if (userRole === 'PATIENT') {
        matchStage.patientId = userId;
      }

      const stats = await OrthodonticCase.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCases: { $sum: 1 },
            statusBreakdown: {
              $push: '$status'
            },
            caseTypeBreakdown: {
              $push: '$caseType'
            },
            priorityBreakdown: {
              $push: '$priority'
            },
            overdueCases: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$estimatedDeliveryDate', null] },
                      { $lt: ['$estimatedDeliveryDate', new Date()] },
                      { $ne: ['$status', 'DELIVERED'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            avgCaseAge: {
              $avg: {
                $divide: [
                  { $subtract: [new Date(), '$createdAt'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              }
            }
          }
        }
      ]);

      if (!stats.length) {
        return {
          totalCases: 0,
          statusBreakdown: {},
          caseTypeBreakdown: {},
          priorityBreakdown: {},
          overdueCases: 0,
          avgCaseAge: 0
        };
      }

      const result = stats[0];
      
      // Process breakdowns
      result.statusBreakdown = this.processBreakdown(result.statusBreakdown);
      result.caseTypeBreakdown = this.processBreakdown(result.caseTypeBreakdown);
      result.priorityBreakdown = this.processBreakdown(result.priorityBreakdown);
      result.avgCaseAge = Math.round(result.avgCaseAge || 0);

      delete result._id;
      return result;
    } catch (error) {
      logger.error('Error getting case statistics:', error);
      throw error;
    }
  }

  processBreakdown(array) {
    return array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = CaseService;