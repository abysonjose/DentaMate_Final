const CaseService = require('../services/CaseService');
const logger = require('../utils/logger');

class CaseController {
  constructor() {
    this.caseService = new CaseService();
  }

  async createCase(req, res) {
    try {
      const { patientId, appointmentId, caseType, priority, doctorNotes } = req.body;
      const { userId, tenantId, branchId, role } = req.user;

      // Validate that only doctors can create cases
      if (role !== 'DOCTOR') {
        return res.status(403).json({
          success: false,
          message: 'Only doctors can create orthodontic cases'
        });
      }

      const caseData = {
        patientId,
        appointmentId,
        doctorId: userId,
        tenantId,
        branchId,
        caseType,
        priority: priority || 'NORMAL',
        doctorNotes
      };

      const orthodonticCase = await this.caseService.createCase(caseData, userId);

      logger.info('Orthodontic case created successfully', {
        caseId: orthodonticCase.caseId,
        doctorId: userId,
        patientId,
        caseType
      });

      res.status(201).json({
        success: true,
        message: 'Orthodontic case created successfully',
        data: orthodonticCase
      });
    } catch (error) {
      logger.error('Error creating orthodontic case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create orthodontic case',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getCaseById(req, res) {
    try {
      const { caseId } = req.params;
      const { tenantId, role, userId } = req.user;

      const orthodonticCase = await this.caseService.getCaseById(caseId, tenantId, role, userId);

      res.json({
        success: true,
        data: orthodonticCase
      });
    } catch (error) {
      logger.error('Error getting orthodontic case:', error);
      
      if (error.message === 'Case not found') {
        return res.status(404).json({
          success: false,
          message: 'Orthodontic case not found'
        });
      }

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve orthodontic case',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getCases(req, res) {
    try {
      const { role, userId, tenantId, branchId } = req.user;
      const filters = {
        ...req.query,
        tenantId,
        branchId: role === 'SAAS_ADMIN' ? req.query.branchId : branchId
      };

      const result = await this.caseService.getCases(filters, role, userId);

      res.json({
        success: true,
        data: result.cases,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting orthodontic cases:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve orthodontic cases',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async updateCaseStatus(req, res) {
    try {
      const { caseId } = req.params;
      const { status, notes, orthotistNotes, fabricationDetails } = req.body;
      const { userId, tenantId, role } = req.user;

      const statusData = {
        status,
        notes,
        orthotistNotes,
        fabricationDetails,
        tenantId
      };

      const orthodonticCase = await this.caseService.updateCaseStatus(
        caseId,
        statusData,
        userId,
        role
      );

      logger.info('Case status updated successfully', {
        caseId,
        newStatus: status,
        updatedBy: userId,
        role
      });

      res.json({
        success: true,
        message: 'Case status updated successfully',
        data: orthodonticCase
      });
    } catch (error) {
      logger.error('Error updating case status:', error);
      
      if (error.message === 'Case not found') {
        return res.status(404).json({
          success: false,
          message: 'Orthodontic case not found'
        });
      }

      if (error.message.includes('Invalid status transition')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update case status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async updateDeliveryDate(req, res) {
    try {
      const { caseId } = req.params;
      const { estimatedDeliveryDate, notes } = req.body;
      const { userId, tenantId, role } = req.user;

      // Only orthotists and doctors can update delivery dates
      if (!['DOCTOR', 'ORTHOTIST'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Only doctors and orthotists can update delivery dates'
        });
      }

      const deliveryData = {
        estimatedDeliveryDate: new Date(estimatedDeliveryDate),
        notes
      };

      const orthodonticCase = await this.caseService.updateDeliveryDate(
        caseId,
        deliveryData,
        userId,
        tenantId
      );

      logger.info('Delivery date updated successfully', {
        caseId,
        estimatedDeliveryDate,
        updatedBy: userId
      });

      res.json({
        success: true,
        message: 'Delivery date updated successfully',
        data: orthodonticCase
      });
    } catch (error) {
      logger.error('Error updating delivery date:', error);
      
      if (error.message === 'Case not found') {
        return res.status(404).json({
          success: false,
          message: 'Orthodontic case not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update delivery date',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async assignOrthotist(req, res) {
    try {
      const { caseId } = req.params;
      const { orthotistId } = req.body;
      const { userId, tenantId, role } = req.user;

      // Only doctors and branch admins can assign orthotists
      if (!['DOCTOR', 'BRANCH_ADMIN'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Only doctors and branch admins can assign orthotists'
        });
      }

      const orthodonticCase = await this.caseService.assignOrthotist(
        caseId,
        orthotistId,
        userId,
        tenantId
      );

      logger.info('Orthotist assigned successfully', {
        caseId,
        orthotistId,
        assignedBy: userId
      });

      res.json({
        success: true,
        message: 'Orthotist assigned successfully',
        data: orthodonticCase
      });
    } catch (error) {
      logger.error('Error assigning orthotist:', error);
      
      if (error.message === 'Case not found') {
        return res.status(404).json({
          success: false,
          message: 'Orthodontic case not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to assign orthotist',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async reportIssue(req, res) {
    try {
      const { caseId } = req.params;
      const { type, description } = req.body;
      const { userId, tenantId, role } = req.user;

      // Only orthotists can report issues
      if (role !== 'ORTHOTIST') {
        return res.status(403).json({
          success: false,
          message: 'Only orthotists can report issues'
        });
      }

      const issueData = {
        type,
        description
      };

      const issue = await this.caseService.reportIssue(
        caseId,
        issueData,
        userId,
        tenantId
      );

      logger.info('Issue reported successfully', {
        caseId,
        issueId: issue.issueId,
        type,
        reportedBy: userId
      });

      res.status(201).json({
        success: true,
        message: 'Issue reported successfully',
        data: issue
      });
    } catch (error) {
      logger.error('Error reporting issue:', error);
      
      if (error.message === 'Case not found') {
        return res.status(404).json({
          success: false,
          message: 'Orthodontic case not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to report issue',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async updateIssue(req, res) {
    try {
      const { caseId, issueId } = req.params;
      const { status, resolution } = req.body;
      const { userId, tenantId, role } = req.user;

      // Only doctors can update issues
      if (role !== 'DOCTOR') {
        return res.status(403).json({
          success: false,
          message: 'Only doctors can update issues'
        });
      }

      const updateData = {
        status,
        resolution
      };

      const issue = await this.caseService.updateIssue(
        caseId,
        issueId,
        updateData,
        userId,
        tenantId
      );

      logger.info('Issue updated successfully', {
        caseId,
        issueId,
        status,
        updatedBy: userId
      });

      res.json({
        success: true,
        message: 'Issue updated successfully',
        data: issue
      });
    } catch (error) {
      logger.error('Error updating issue:', error);
      
      if (error.message === 'Case not found') {
        return res.status(404).json({
          success: false,
          message: 'Orthodontic case not found'
        });
      }

      if (error.message === 'Issue not found') {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update issue',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getCaseStatistics(req, res) {
    try {
      const { tenantId, branchId, role, userId } = req.user;
      const targetBranchId = role === 'SAAS_ADMIN' ? req.query.branchId : branchId;

      const statistics = await this.caseService.getCaseStatistics(
        tenantId,
        targetBranchId,
        role,
        userId
      );

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error getting case statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve case statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getWorkflowHistory(req, res) {
    try {
      const { caseId } = req.params;
      const { tenantId, role, userId } = req.user;

      const orthodonticCase = await this.caseService.getCaseById(caseId, tenantId, role, userId);

      // Return only the status history for workflow tracking
      const workflowHistory = orthodonticCase.statusHistory.map(entry => ({
        status: entry.status,
        changedBy: entry.changedBy,
        changedAt: entry.changedAt,
        notes: entry.notes
      }));

      res.json({
        success: true,
        data: {
          caseId,
          currentStatus: orthodonticCase.status,
          workflowHistory
        }
      });
    } catch (error) {
      logger.error('Error getting workflow history:', error);
      
      if (error.message === 'Case not found') {
        return res.status(404).json({
          success: false,
          message: 'Orthodontic case not found'
        });
      }

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workflow history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = CaseController;