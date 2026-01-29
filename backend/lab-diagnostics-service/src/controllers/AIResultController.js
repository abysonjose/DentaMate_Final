const AIIntegrationService = require('../services/AIIntegrationService');
const DiagnosticAIResult = require('../models/DiagnosticAIResult');
const logger = require('../utils/logger');

class AIResultController {
  constructor() {
    this.aiService = new AIIntegrationService();
  }

  /**
   * Get AI analysis results for an order
   */
  async getOrderResults(req, res) {
    try {
      const { orderId } = req.params;
      const { tenantId } = req.user;

      const results = await this.aiService.getOrderAnalysisResults(orderId, tenantId);

      res.json({
        success: true,
        message: 'AI analysis results retrieved successfully',
        data: results
      });
    } catch (error) {
      logger.error('Error getting AI analysis results:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve AI analysis results'
      });
    }
  }

  /**
   * Get specific AI analysis result
   */
  async getResult(req, res) {
    try {
      const { resultId } = req.params;

      const result = await DiagnosticAIResult.findOne({
        resultId,
        tenantId: req.user.tenantId,
        isActive: true
      }).populate('order').populate('upload');

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'AI analysis result not found'
        });
      }

      // Validate access based on user role and context
      this.validateResultAccess(result, req.user);

      res.json({
        success: true,
        message: 'AI analysis result retrieved successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error getting AI analysis result:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve AI analysis result'
      });
    }
  }

  /**
   * Get analysis status
   */
  async getAnalysisStatus(req, res) {
    try {
      const { analysisId } = req.params;

      const result = await this.aiService.getAnalysisStatus(analysisId);

      res.json({
        success: true,
        message: 'Analysis status retrieved successfully',
        data: {
          analysisId: result.resultId,
          status: result.status,
          progress: this.calculateProgress(result),
          estimatedCompletion: this.estimateCompletion(result),
          lastUpdated: result.updatedAt
        }
      });
    } catch (error) {
      logger.error('Error getting analysis status:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve analysis status'
      });
    }
  }

  /**
   * Retry failed analysis
   */
  async retryAnalysis(req, res) {
    try {
      const { analysisId } = req.params;

      // Only allow admins and lab staff to retry
      if (!['LAB_STAFF', 'BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to retry analysis'
        });
      }

      const result = await this.aiService.retryAnalysis(analysisId);

      res.json({
        success: true,
        message: 'Analysis retry initiated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error retrying analysis:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Can only retry') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retry analysis'
      });
    }
  }

  /**
   * Cancel analysis
   */
  async cancelAnalysis(req, res) {
    try {
      const { analysisId } = req.params;

      // Only allow admins and lab staff to cancel
      if (!['LAB_STAFF', 'BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to cancel analysis'
        });
      }

      const result = await this.aiService.cancelAnalysis(analysisId);

      res.json({
        success: true,
        message: 'Analysis cancelled successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error cancelling analysis:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Can only cancel') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to cancel analysis'
      });
    }
  }

  /**
   * Review AI analysis result
   */
  async reviewResult(req, res) {
    try {
      const { resultId } = req.params;
      const { approved, reviewNotes } = req.body;

      // Only allow doctors and senior staff to review
      if (!['DOCTOR', 'HEAD_NURSE', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions to review results'
        });
      }

      const result = await DiagnosticAIResult.findOne({
        resultId,
        tenantId: req.user.tenantId,
        isActive: true
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'AI analysis result not found'
        });
      }

      if (result.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: 'Can only review completed analyses'
        });
      }

      await result.markAsReviewed(req.user.userId, reviewNotes, approved);

      res.json({
        success: true,
        message: 'Analysis result reviewed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error reviewing analysis result:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to review analysis result'
      });
    }
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(req, res) {
    try {
      const { tenantId, branchId, role } = req.user;

      // Only allow authorized roles to see pending reviews
      if (!['DOCTOR', 'HEAD_NURSE', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
      }

      const filterBranchId = ['CENTRAL_ADMIN'].includes(role) ? null : branchId;
      const pendingReviews = await DiagnosticAIResult.findPendingReview(tenantId, filterBranchId);

      res.json({
        success: true,
        message: 'Pending reviews retrieved successfully',
        data: pendingReviews
      });
    } catch (error) {
      logger.error('Error getting pending reviews:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve pending reviews'
      });
    }
  }

  /**
   * Get AI analytics
   */
  async getAnalytics(req, res) {
    try {
      const { tenantId, branchId, role } = req.user;
      
      const dateRange = {
        start: req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: req.query.endDate ? new Date(req.query.endDate) : new Date()
      };

      const filterBranchId = ['CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(role) ? null : branchId;
      const analytics = await this.aiService.getAnalyticsData(tenantId, filterBranchId, dateRange);

      res.json({
        success: true,
        message: 'AI analytics retrieved successfully',
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting AI analytics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve AI analytics'
      });
    }
  }

  /**
   * Handle AI analysis callback
   */
  async handleCallback(req, res) {
    try {
      const callbackData = req.body;

      // Validate callback data
      if (!callbackData.analysisId || !callbackData.status) {
        return res.status(400).json({
          success: false,
          message: 'Invalid callback data'
        });
      }

      const result = await this.aiService.handleAnalysisCallback(callbackData);

      res.json({
        success: true,
        message: 'Callback processed successfully',
        data: {
          analysisId: result.resultId,
          status: result.status
        }
      });
    } catch (error) {
      logger.error('Error handling AI callback:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process callback'
      });
    }
  }

  /**
   * Get AI service health
   */
  async getAIServiceHealth(req, res) {
    try {
      // Only allow admins to check service health
      if (!['BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
      }

      const health = await this.aiService.healthCheck();

      res.json({
        success: true,
        message: 'AI service health retrieved successfully',
        data: health
      });
    } catch (error) {
      logger.error('Error getting AI service health:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve AI service health'
      });
    }
  }

  /**
   * Validate result access based on user role
   */
  validateResultAccess(result, userContext) {
    const { role, userId, tenantId, branchId } = userContext;

    // Tenant isolation
    if (result.tenantId !== tenantId) {
      throw new Error('Access denied: Different tenant');
    }

    // Branch isolation for branch-specific roles
    if (branchId && !['CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(role) && result.branchId !== branchId) {
      throw new Error('Access denied: Different branch');
    }

    // Role-specific access control
    switch (role) {
      case 'DOCTOR':
        if (result.order && result.order.doctorId !== userId) {
          throw new Error('Access denied: Not your order');
        }
        break;
      case 'PATIENT':
        if (result.order && result.order.patientId !== userId) {
          throw new Error('Access denied: Not your results');
        }
        break;
      case 'LAB_STAFF':
        // Lab staff can access results in their branch
        break;
      case 'NURSE':
      case 'HEAD_NURSE':
      case 'BRANCH_ADMIN':
        // These roles can access results in their branch
        break;
      case 'CENTRAL_ADMIN':
      case 'SAAS_ADMIN':
        // These roles have broader access
        break;
      default:
        throw new Error('Access denied: Invalid role');
    }
  }

  /**
   * Calculate analysis progress
   */
  calculateProgress(result) {
    switch (result.status) {
      case 'PROCESSING':
        return 50;
      case 'COMPLETED':
        return 100;
      case 'FAILED':
      case 'CANCELLED':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Estimate completion time
   */
  estimateCompletion(result) {
    if (result.status === 'COMPLETED') {
      return null;
    }

    if (result.status === 'PROCESSING') {
      // Estimate based on average processing time (5 minutes for most analyses)
      const estimatedDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
      return new Date(result.createdAt.getTime() + estimatedDuration);
    }

    return null;
  }
}

module.exports = AIResultController;