const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const DiagnosticAIResult = require('../models/DiagnosticAIResult');
const logger = require('../utils/logger');
const NotificationService = require('./NotificationService');

class AIIntegrationService {
  constructor() {
    this.aiServiceUrl = process.env.AI_DIAGNOSIS_SERVICE_URL || 'http://ai-diagnosis-service:3008';
    this.enabled = process.env.AI_ANALYSIS_ENABLED !== 'false';
    this.notificationService = new NotificationService();
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Submit file for AI analysis
   */
  async submitForAnalysis(analysisRequest) {
    if (!this.enabled) {
      logger.info('AI analysis disabled, skipping submission');
      return { analysisId: null, status: 'DISABLED' };
    }

    try {
      const { uploadId, orderId, filePath, fileType, metadata } = analysisRequest;
      
      // Determine analysis type based on file and metadata
      const analysisType = this.determineAnalysisType(fileType, metadata);
      
      // Create AI result record
      const resultId = uuidv4();
      const aiResult = new DiagnosticAIResult({
        resultId,
        orderId,
        uploadId,
        tenantId: metadata.tenantId || analysisRequest.tenantId,
        branchId: metadata.branchId || analysisRequest.branchId,
        aiServiceVersion: 'v1.0',
        analysisType,
        status: 'PROCESSING'
      });

      await aiResult.save();

      // Submit to AI service
      const aiRequest = {
        analysisId: resultId,
        uploadId,
        orderId,
        filePath,
        fileType,
        analysisType,
        metadata: {
          ...metadata,
          priority: analysisRequest.priority || 'NORMAL',
          callback: `${process.env.SERVICE_URL}/api/diagnostics/ai-callback`
        }
      };

      const response = await this.callAIService('/analyze', aiRequest);
      
      logger.info('AI analysis submitted', {
        resultId,
        uploadId,
        orderId,
        analysisType,
        aiRequestId: response.requestId
      });

      return {
        analysisId: resultId,
        status: 'SUBMITTED',
        aiRequestId: response.requestId
      };
    } catch (error) {
      logger.error('Failed to submit for AI analysis:', error);
      throw error;
    }
  }

  /**
   * Handle AI analysis callback
   */
  async handleAnalysisCallback(callbackData) {
    try {
      const { analysisId, status, results, error } = callbackData;
      
      const aiResult = await DiagnosticAIResult.findOne({ resultId: analysisId });
      if (!aiResult) {
        throw new Error(`AI result not found: ${analysisId}`);
      }

      if (status === 'COMPLETED' && results) {
        // Update result with AI findings
        aiResult.status = 'COMPLETED';
        aiResult.confidence = results.confidence;
        aiResult.findings = results.findings || [];
        aiResult.heatmapUrl = results.heatmapUrl;
        aiResult.annotatedImageUrl = results.annotatedImageUrl;
        aiResult.processingMetrics = results.processingMetrics;
        aiResult.qualityAssessment = results.qualityAssessment;

        await aiResult.save();

        // Check for urgent findings
        const urgentFindings = aiResult.findings.filter(
          f => f.severity === 'CRITICAL' || f.severity === 'SEVERE'
        );

        // Send notifications
        await this.notificationService.notifyAIAnalysisComplete(aiResult);
        
        if (urgentFindings.length > 0) {
          await this.notificationService.notifyUrgentFindings(aiResult, urgentFindings);
        }

        logger.info('AI analysis completed', {
          analysisId,
          findingsCount: aiResult.findings.length,
          urgentFindings: urgentFindings.length,
          confidence: aiResult.confidence
        });
      } else if (status === 'FAILED') {
        aiResult.status = 'FAILED';
        aiResult.errorDetails = {
          errorCode: error?.code || 'UNKNOWN',
          errorMessage: error?.message || 'AI analysis failed',
          stackTrace: error?.stack
        };
        await aiResult.save();

        logger.error('AI analysis failed', {
          analysisId,
          error: error?.message
        });
      }

      return aiResult;
    } catch (error) {
      logger.error('Error handling AI analysis callback:', error);
      throw error;
    }
  }

  /**
   * Get analysis status
   */
  async getAnalysisStatus(analysisId) {
    try {
      const aiResult = await DiagnosticAIResult.findOne({ resultId: analysisId });
      if (!aiResult) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }

      // If still processing, check with AI service
      if (aiResult.status === 'PROCESSING') {
        try {
          const response = await this.callAIService(`/status/${analysisId}`);
          if (response.status !== aiResult.status) {
            aiResult.status = response.status;
            await aiResult.save();
          }
        } catch (error) {
          logger.warn('Failed to get status from AI service:', error);
        }
      }

      return aiResult;
    } catch (error) {
      logger.error('Error getting analysis status:', error);
      throw error;
    }
  }

  /**
   * Retry failed analysis
   */
  async retryAnalysis(analysisId) {
    try {
      const aiResult = await DiagnosticAIResult.findOne({ resultId: analysisId });
      if (!aiResult) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }

      if (aiResult.status !== 'FAILED') {
        throw new Error('Can only retry failed analyses');
      }

      // Reset status
      aiResult.status = 'PROCESSING';
      aiResult.errorDetails = undefined;
      await aiResult.save();

      // Resubmit to AI service
      const retryRequest = {
        analysisId,
        uploadId: aiResult.uploadId,
        orderId: aiResult.orderId,
        analysisType: aiResult.analysisType,
        retry: true
      };

      await this.callAIService('/retry', retryRequest);

      logger.info('AI analysis retry submitted', { analysisId });
      return aiResult;
    } catch (error) {
      logger.error('Error retrying analysis:', error);
      throw error;
    }
  }

  /**
   * Cancel analysis
   */
  async cancelAnalysis(analysisId) {
    try {
      const aiResult = await DiagnosticAIResult.findOne({ resultId: analysisId });
      if (!aiResult) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }

      if (!['PROCESSING'].includes(aiResult.status)) {
        throw new Error('Can only cancel processing analyses');
      }

      // Cancel with AI service
      try {
        await this.callAIService(`/cancel/${analysisId}`, {}, 'DELETE');
      } catch (error) {
        logger.warn('Failed to cancel with AI service:', error);
      }

      // Update status
      aiResult.status = 'CANCELLED';
      await aiResult.save();

      logger.info('AI analysis cancelled', { analysisId });
      return aiResult;
    } catch (error) {
      logger.error('Error cancelling analysis:', error);
      throw error;
    }
  }

  /**
   * Get analysis results for order
   */
  async getOrderAnalysisResults(orderId, tenantId) {
    try {
      const results = await DiagnosticAIResult.findByOrder(orderId, {
        tenantId,
        isActive: true
      });

      return results.map(result => result.getSummary());
    } catch (error) {
      logger.error('Error getting order analysis results:', error);
      throw error;
    }
  }

  /**
   * Get analytics data
   */
  async getAnalyticsData(tenantId, branchId, dateRange) {
    try {
      return await DiagnosticAIResult.getAnalyticsData(tenantId, branchId, dateRange);
    } catch (error) {
      logger.error('Error getting AI analytics data:', error);
      throw error;
    }
  }

  /**
   * Determine analysis type based on file and metadata
   */
  determineAnalysisType(fileType, metadata) {
    if (!fileType.startsWith('image/')) {
      return 'DOCUMENT_ANALYSIS';
    }

    // Check metadata for specific analysis type hints
    if (metadata.testType) {
      switch (metadata.testType.toLowerCase()) {
        case 'xray':
        case 'panoramic':
        case 'bitewing':
        case 'periapical':
          return 'XRAY_ANALYSIS';
        case 'cbct':
          return 'CBCT_ANALYSIS';
        case 'dental_scan':
          return 'DENTAL_SCAN_ANALYSIS';
        default:
          return 'XRAY_ANALYSIS';
      }
    }

    // Default to X-ray analysis for dental images
    return 'XRAY_ANALYSIS';
  }

  /**
   * Call AI service with retry logic
   */
  async callAIService(endpoint, data = {}, method = 'POST') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const config = {
          method,
          url: `${this.aiServiceUrl}${endpoint}`,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Name': 'lab-diagnostics-service'
          }
        };

        if (method !== 'GET' && method !== 'DELETE') {
          config.data = data;
        }

        const response = await axios(config);
        return response.data;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          logger.warn(`AI service call failed (attempt ${attempt}/${this.maxRetries}), retrying...`, {
            endpoint,
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    logger.error(`AI service call failed after ${this.maxRetries} attempts`, {
      endpoint,
      error: lastError.message
    });
    
    throw lastError;
  }

  /**
   * Health check for AI service
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.aiServiceUrl}/health`, {
        timeout: 5000
      });
      
      return {
        status: 'healthy',
        version: response.data.version,
        uptime: response.data.uptime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = AIIntegrationService;