const express = require('express');
const router = express.Router();
const ReportService = require('../services/ReportService');
const { 
  authenticateToken, 
  validateAnalyticsAccess, 
  validateDataScope,
  validateBranchAccess 
} = require('../middleware/auth');
const { 
  validateReportRequest,
  validateDateRange,
  validatePagination,
  validateUUID 
} = require('../middleware/validation');
const logger = require('../utils/logger');
const path = require('path');

const reportService = new ReportService();

// Request a new report
router.post('/request',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validateReportRequest,
  async (req, res) => {
    try {
      const {
        reportType,
        format = 'PDF',
        parameters = {},
        priority = 'NORMAL',
        scheduledAt = null
      } = req.body;

      // Validate branch access if specified
      if (parameters.branchId && req.dataScope.level === 'BRANCH' && !req.dataScope.branchIds.includes(parameters.branchId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Branch not accessible'
        });
      }

      // Set default branch if user is branch-scoped
      if (!parameters.branchId && req.dataScope.level === 'BRANCH') {
        parameters.branchId = req.branchId;
      }

      const result = await reportService.requestReport(req.tenantId, req.userId, {
        reportType,
        format,
        parameters,
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        userRole: req.role,
        userName: req.user.name,
        userEmail: req.user.email,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        correlationId: req.headers['x-correlation-id']
      });

      logger.info('Report requested successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        reportType,
        format,
        priority,
        reportId: result.data.reportId,
        category: 'report'
      });

      res.status(201).json(result);

    } catch (error) {
      logger.error('Error requesting report', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        body: req.body,
        category: 'report'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to request report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get report status
router.get('/status/:reportId',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validateUUID,
  async (req, res) => {
    try {
      const { reportId } = req.params;

      const result = await reportService.getReportStatus(req.tenantId, reportId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      logger.info('Report status retrieved successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        reportId,
        status: result.data.status,
        category: 'report'
      });

      res.json(result);

    } catch (error) {
      logger.error('Error retrieving report status', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        reportId: req.params.reportId,
        category: 'report'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve report status'
      });
    }
  }
);

// Download report
router.get('/download/:reportId',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validateUUID,
  async (req, res) => {
    try {
      const { reportId } = req.params;

      const result = await reportService.downloadReport(req.tenantId, reportId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      const { filePath, fileName, fileSize, contentType } = result.data;

      logger.info('Report download initiated', {
        tenantId: req.tenantId,
        userId: req.userId,
        reportId,
        fileName,
        fileSize,
        category: 'report'
      });

      // Set headers for file download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileSize);

      // Stream the file
      const fs = require('fs');
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        logger.error('Error streaming report file', {
          error: error.message,
          reportId,
          filePath,
          category: 'report'
        });
        
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading report file'
          });
        }
      });

      fileStream.pipe(res);

    } catch (error) {
      logger.error('Error downloading report', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        reportId: req.params.reportId,
        category: 'report'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to download report'
      });
    }
  }
);

// Get user's reports
router.get('/user/list',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validatePagination,
  async (req, res) => {
    try {
      const {
        status,
        reportType,
        limit = 20,
        skip = 0
      } = req.query;

      const result = await reportService.getUserReports(req.tenantId, req.userId, {
        status,
        reportType,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      logger.info('User reports retrieved successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        count: result.data.length,
        status,
        reportType,
        category: 'report'
      });

      res.json(result);

    } catch (error) {
      logger.error('Error retrieving user reports', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        query: req.query,
        category: 'report'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user reports'
      });
    }
  }
);

// Get available report types for role
router.get('/types/available',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const reportTypes = {
        'SAAS_ADMIN': [
          'OPERATIONAL_SUMMARY',
          'FINANCIAL_SUMMARY',
          'HR_PAYROLL_SUMMARY',
          'PATIENT_ANALYTICS',
          'APPOINTMENT_ANALYTICS',
          'REVENUE_ANALYTICS',
          'STAFF_PERFORMANCE',
          'INSURANCE_ANALYTICS',
          'COMPLIANCE_REPORT'
        ],
        'CENTRAL_ADMIN': [
          'OPERATIONAL_SUMMARY',
          'FINANCIAL_SUMMARY',
          'HR_PAYROLL_SUMMARY',
          'INVENTORY_EXPIRY',
          'PATIENT_ANALYTICS',
          'APPOINTMENT_ANALYTICS',
          'REVENUE_ANALYTICS',
          'STAFF_PERFORMANCE',
          'CLINICAL_OUTCOMES',
          'INSURANCE_ANALYTICS',
          'QUEUE_PERFORMANCE',
          'AI_DIAGNOSIS_REPORT'
        ],
        'BRANCH_ADMIN': [
          'OPERATIONAL_SUMMARY',
          'FINANCIAL_SUMMARY',
          'INVENTORY_EXPIRY',
          'PATIENT_ANALYTICS',
          'APPOINTMENT_ANALYTICS',
          'STAFF_PERFORMANCE',
          'QUEUE_PERFORMANCE'
        ],
        'ACCOUNTS_MANAGER': [
          'FINANCIAL_SUMMARY',
          'REVENUE_ANALYTICS',
          'INSURANCE_ANALYTICS',
          'HR_PAYROLL_SUMMARY'
        ],
        'DOCTOR': [
          'PATIENT_ANALYTICS',
          'APPOINTMENT_ANALYTICS',
          'CLINICAL_OUTCOMES'
        ]
      };

      const availableTypes = reportTypes[req.role] || [];

      const reportTypeDetails = {
        'OPERATIONAL_SUMMARY': {
          name: 'Operational Summary',
          description: 'Overview of daily operations including patient flow, appointments, and efficiency metrics',
          estimatedTime: '1-2 minutes',
          formats: ['PDF', 'CSV', 'EXCEL']
        },
        'FINANCIAL_SUMMARY': {
          name: 'Financial Summary',
          description: 'Revenue, billing, and financial performance metrics',
          estimatedTime: '2-3 minutes',
          formats: ['PDF', 'CSV', 'EXCEL']
        },
        'HR_PAYROLL_SUMMARY': {
          name: 'HR & Payroll Summary',
          description: 'Staff performance, attendance, and payroll metrics',
          estimatedTime: '2-3 minutes',
          formats: ['PDF', 'CSV', 'EXCEL']
        },
        'INVENTORY_EXPIRY': {
          name: 'Inventory & Expiry Report',
          description: 'Stock levels, expiring items, and inventory turnover',
          estimatedTime: '3-5 minutes',
          formats: ['PDF', 'CSV', 'EXCEL']
        },
        'PATIENT_ANALYTICS': {
          name: 'Patient Analytics',
          description: 'Patient demographics, satisfaction, and treatment outcomes',
          estimatedTime: '3-4 minutes',
          formats: ['PDF', 'CSV']
        },
        'APPOINTMENT_ANALYTICS': {
          name: 'Appointment Analytics',
          description: 'Appointment trends, completion rates, and scheduling efficiency',
          estimatedTime: '2-3 minutes',
          formats: ['PDF', 'CSV', 'EXCEL']
        },
        'REVENUE_ANALYTICS': {
          name: 'Revenue Analytics',
          description: 'Detailed revenue analysis and financial trends',
          estimatedTime: '2-3 minutes',
          formats: ['PDF', 'CSV', 'EXCEL']
        },
        'STAFF_PERFORMANCE': {
          name: 'Staff Performance',
          description: 'Individual and team performance metrics',
          estimatedTime: '2-4 minutes',
          formats: ['PDF', 'CSV']
        },
        'CLINICAL_OUTCOMES': {
          name: 'Clinical Outcomes',
          description: 'Treatment success rates and clinical quality metrics',
          estimatedTime: '4-6 minutes',
          formats: ['PDF', 'CSV']
        },
        'INSURANCE_ANALYTICS': {
          name: 'Insurance Analytics',
          description: 'Insurance claims, approval rates, and reimbursement analysis',
          estimatedTime: '3-4 minutes',
          formats: ['PDF', 'CSV', 'EXCEL']
        },
        'QUEUE_PERFORMANCE': {
          name: 'Queue Performance',
          description: 'Wait times, queue efficiency, and patient flow analysis',
          estimatedTime: '2-3 minutes',
          formats: ['PDF', 'CSV']
        },
        'AI_DIAGNOSIS_REPORT': {
          name: 'AI Diagnosis Report',
          description: 'AI-assisted diagnosis accuracy and performance metrics',
          estimatedTime: '3-5 minutes',
          formats: ['PDF', 'CSV']
        },
        'COMPLIANCE_REPORT': {
          name: 'Compliance Report',
          description: 'Regulatory compliance and audit trail information',
          estimatedTime: '5-8 minutes',
          formats: ['PDF']
        }
      };

      const reports = availableTypes.map(type => ({
        type,
        ...reportTypeDetails[type]
      }));

      res.json({
        success: true,
        data: {
          role: req.role,
          reports
        }
      });

    } catch (error) {
      logger.error('Error retrieving available report types', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        role: req.role,
        category: 'report'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available report types'
      });
    }
  }
);

// Cancel report
router.post('/cancel/:reportId',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validateUUID,
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const { reason = 'User cancelled' } = req.body;

      const ReportRequest = require('../models/ReportRequest');
      const report = await ReportRequest.findOne({
        reportId,
        tenantId: req.tenantId,
        'requestedBy.userId': req.userId,
        status: { $in: ['PENDING', 'PROCESSING'] },
        isArchived: false
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found or cannot be cancelled'
        });
      }

      await report.cancel(reason);

      logger.info('Report cancelled successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        reportId,
        reason,
        category: 'report'
      });

      res.json({
        success: true,
        message: 'Report cancelled successfully'
      });

    } catch (error) {
      logger.error('Error cancelling report', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        reportId: req.params.reportId,
        category: 'report'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to cancel report'
      });
    }
  }
);

// Get report statistics
router.get('/stats/summary',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validateDateRange,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const ReportRequest = require('../models/ReportRequest');
      const stats = await ReportRequest.getReportStats(req.tenantId, {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined
      });

      const popularReports = await ReportRequest.getPopularReports(req.tenantId, 30);

      res.json({
        success: true,
        data: {
          stats,
          popularReports
        }
      });

    } catch (error) {
      logger.error('Error retrieving report statistics', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        category: 'report'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve report statistics'
      });
    }
  }
);

// Share report
router.post('/share/:reportId',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validateUUID,
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const { shareWith, permissions = ['VIEW'] } = req.body;

      if (!shareWith || !shareWith.userId || !shareWith.role) {
        return res.status(400).json({
          success: false,
          message: 'Share recipient information is required'
        });
      }

      const ReportRequest = require('../models/ReportRequest');
      const report = await ReportRequest.findOne({
        reportId,
        tenantId: req.tenantId,
        'requestedBy.userId': req.userId,
        status: 'COMPLETED',
        isArchived: false
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found or not accessible'
        });
      }

      await report.shareWith(
        shareWith.userId,
        shareWith.role,
        permissions,
        req.userId
      );

      logger.info('Report shared successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        reportId,
        sharedWith: shareWith.userId,
        permissions,
        category: 'report'
      });

      res.json({
        success: true,
        message: 'Report shared successfully'
      });

    } catch (error) {
      logger.error('Error sharing report', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        reportId: req.params.reportId,
        category: 'report'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to share report'
      });
    }
  }
);

module.exports = router;