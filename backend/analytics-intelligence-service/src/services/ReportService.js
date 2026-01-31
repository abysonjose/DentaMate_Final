const ReportRequest = require('../models/ReportRequest');
const KPIService = require('./KPIService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ReportService {
  constructor() {
    this.kpiService = new KPIService();
    this.reportGenerators = new Map();
    this.initializeReportGenerators();
  }

  initializeReportGenerators() {
    this.reportGenerators.set('OPERATIONAL_SUMMARY', this.generateOperationalSummary.bind(this));
    this.reportGenerators.set('FINANCIAL_SUMMARY', this.generateFinancialSummary.bind(this));
    this.reportGenerators.set('HR_PAYROLL_SUMMARY', this.generateHRPayrollSummary.bind(this));
    this.reportGenerators.set('INVENTORY_EXPIRY', this.generateInventoryExpiry.bind(this));
    this.reportGenerators.set('PATIENT_ANALYTICS', this.generatePatientAnalytics.bind(this));
    this.reportGenerators.set('APPOINTMENT_ANALYTICS', this.generateAppointmentAnalytics.bind(this));
    this.reportGenerators.set('REVENUE_ANALYTICS', this.generateRevenueAnalytics.bind(this));
    this.reportGenerators.set('STAFF_PERFORMANCE', this.generateStaffPerformance.bind(this));
    this.reportGenerators.set('CLINICAL_OUTCOMES', this.generateClinicalOutcomes.bind(this));
    this.reportGenerators.set('INSURANCE_ANALYTICS', this.generateInsuranceAnalytics.bind(this));
    this.reportGenerators.set('QUEUE_PERFORMANCE', this.generateQueuePerformance.bind(this));
    this.reportGenerators.set('AI_DIAGNOSIS_REPORT', this.generateAIDiagnosisReport.bind(this));
    this.reportGenerators.set('COMPLIANCE_REPORT', this.generateComplianceReport.bind(this));
  }

  async requestReport(tenantId, userId, reportRequest) {
    try {
      const {
        reportType,
        format = 'PDF',
        parameters = {},
        priority = 'NORMAL',
        scheduledAt = null
      } = reportRequest;

      logger.info('Report requested', {
        tenantId,
        userId,
        reportType,
        format,
        priority,
        category: 'report'
      });

      // Generate unique report ID
      const reportId = uuidv4();

      // Create report request record
      const request = new ReportRequest({
        reportId,
        tenantId,
        branchId: parameters.branchId,
        requestedBy: {
          userId,
          role: reportRequest.userRole,
          name: reportRequest.userName,
          email: reportRequest.userEmail
        },
        reportType,
        format,
        parameters,
        priority,
        scheduledAt,
        metadata: {
          requestSource: 'API',
          userAgent: reportRequest.userAgent,
          ipAddress: reportRequest.ipAddress,
          correlationId: reportRequest.correlationId
        }
      });

      await request.save();

      // If not scheduled, process immediately
      if (!scheduledAt || scheduledAt <= new Date()) {
        // Process in background
        this.processReport(request).catch(error => {
          logger.error('Background report processing failed', {
            error: error.message,
            reportId,
            tenantId,
            category: 'report'
          });
        });
      }

      return {
        success: true,
        data: {
          reportId,
          status: 'PENDING',
          estimatedCompletion: this.estimateCompletionTime(reportType, parameters)
        }
      };

    } catch (error) {
      logger.error('Error requesting report', {
        error: error.message,
        tenantId,
        userId,
        reportRequest,
        category: 'report'
      });
      throw error;
    }
  }

  async processReport(reportRequest) {
    try {
      logger.info('Processing report', {
        reportId: reportRequest.reportId,
        reportType: reportRequest.reportType,
        tenantId: reportRequest.tenantId,
        category: 'report'
      });

      await reportRequest.startProcessing();

      const generator = this.reportGenerators.get(reportRequest.reportType);
      if (!generator) {
        throw new Error(`Unknown report type: ${reportRequest.reportType}`);
      }

      // Generate report data
      const reportData = await generator(reportRequest.tenantId, reportRequest.parameters);

      // Generate file based on format
      const fileInfo = await this.generateReportFile(
        reportData,
        reportRequest.format,
        reportRequest.reportType,
        reportRequest.reportId
      );

      // Complete processing
      await reportRequest.completeProcessing(fileInfo, reportData);

      logger.info('Report processing completed', {
        reportId: reportRequest.reportId,
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        category: 'report'
      });

      return reportRequest;

    } catch (error) {
      logger.error('Error processing report', {
        error: error.message,
        reportId: reportRequest.reportId,
        category: 'report'
      });

      await reportRequest.failProcessing(error);
      throw error;
    }
  }

  async getReportStatus(tenantId, reportId) {
    try {
      const report = await ReportRequest.findOne({
        reportId,
        tenantId,
        isArchived: false
      });

      if (!report) {
        return {
          success: false,
          message: 'Report not found'
        };
      }

      return {
        success: true,
        data: {
          reportId: report.reportId,
          status: report.status,
          reportType: report.reportType,
          format: report.format,
          createdAt: report.createdAt,
          startedAt: report.startedAt,
          completedAt: report.completedAt,
          processingDuration: report.processingDuration,
          fileInfo: report.fileInfo,
          error: report.error
        }
      };

    } catch (error) {
      logger.error('Error getting report status', {
        error: error.message,
        tenantId,
        reportId,
        category: 'report'
      });
      throw error;
    }
  }

  async downloadReport(tenantId, reportId) {
    try {
      const report = await ReportRequest.findOne({
        reportId,
        tenantId,
        status: 'COMPLETED',
        isArchived: false
      });

      if (!report || !report.fileInfo?.filePath) {
        return {
          success: false,
          message: 'Report not found or not ready for download'
        };
      }

      // Check if file exists
      const filePath = report.fileInfo.filePath;
      try {
        await fs.access(filePath);
      } catch {
        return {
          success: false,
          message: 'Report file not found on disk'
        };
      }

      // Update download count
      await report.incrementDownload();

      return {
        success: true,
        data: {
          filePath,
          fileName: report.fileInfo.fileName,
          fileSize: report.fileInfo.fileSize,
          contentType: this.getContentType(report.format)
        }
      };

    } catch (error) {
      logger.error('Error downloading report', {
        error: error.message,
        tenantId,
        reportId,
        category: 'report'
      });
      throw error;
    }
  }

  async getUserReports(tenantId, userId, options = {}) {
    try {
      const {
        status,
        reportType,
        limit = 20,
        skip = 0
      } = options;

      const reports = await ReportRequest.getUserReports(tenantId, userId, {
        status,
        reportType,
        limit,
        skip
      });

      return {
        success: true,
        data: reports,
        pagination: {
          limit,
          skip,
          total: reports.length
        }
      };

    } catch (error) {
      logger.error('Error fetching user reports', {
        error: error.message,
        tenantId,
        userId,
        options,
        category: 'report'
      });
      throw error;
    }
  }

  // Report generators
  async generateOperationalSummary(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    const kpis = await this.kpiService.getKPIs(tenantId, {
      branchId,
      metrics: [
        'PATIENT_FOOTFALL',
        'APPOINTMENT_COUNT',
        'APPOINTMENT_COMPLETION_RATE',
        'AVERAGE_WAIT_TIME',
        'QUEUE_EFFICIENCY',
        'STAFF_UTILIZATION'
      ],
      period: 'custom',
      startDate,
      endDate
    });

    return {
      summary: {
        title: 'Operational Summary Report',
        dateRange: { startDate, endDate },
        totalRecords: Object.keys(kpis.data).length,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Patient Metrics',
          type: 'KPI',
          data: {
            patientFootfall: kpis.data.PATIENT_FOOTFALL,
            appointmentCount: kpis.data.APPOINTMENT_COUNT,
            completionRate: kpis.data.APPOINTMENT_COMPLETION_RATE
          }
        },
        {
          name: 'Operational Efficiency',
          type: 'KPI',
          data: {
            averageWaitTime: kpis.data.AVERAGE_WAIT_TIME,
            queueEfficiency: kpis.data.QUEUE_EFFICIENCY,
            staffUtilization: kpis.data.STAFF_UTILIZATION
          }
        }
      ],
      kpis: Object.entries(kpis.data).map(([name, data]) => ({
        name,
        value: data.value,
        unit: data.unit,
        trend: data.trend || null
      }))
    };
  }

  async generateFinancialSummary(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    const kpis = await this.kpiService.getKPIs(tenantId, {
      branchId,
      metrics: [
        'DAILY_REVENUE',
        'WEEKLY_REVENUE',
        'MONTHLY_REVENUE',
        'BILLING_COLLECTION_RATE',
        'OUTSTANDING_PAYMENTS',
        'INSURANCE_APPROVAL_RATE'
      ],
      period: 'custom',
      startDate,
      endDate
    });

    return {
      summary: {
        title: 'Financial Summary Report',
        dateRange: { startDate, endDate },
        totalRecords: Object.keys(kpis.data).length,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Revenue Metrics',
          type: 'KPI',
          data: {
            dailyRevenue: kpis.data.DAILY_REVENUE,
            weeklyRevenue: kpis.data.WEEKLY_REVENUE,
            monthlyRevenue: kpis.data.MONTHLY_REVENUE
          }
        },
        {
          name: 'Collection Metrics',
          type: 'KPI',
          data: {
            collectionRate: kpis.data.BILLING_COLLECTION_RATE,
            outstandingPayments: kpis.data.OUTSTANDING_PAYMENTS,
            insuranceApprovalRate: kpis.data.INSURANCE_APPROVAL_RATE
          }
        }
      ],
      kpis: Object.entries(kpis.data).map(([name, data]) => ({
        name,
        value: data.value,
        unit: data.unit,
        trend: data.trend || null
      }))
    };
  }

  async generateHRPayrollSummary(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    const kpis = await this.kpiService.getKPIs(tenantId, {
      branchId,
      metrics: [
        'STAFF_UTILIZATION',
        'STAFF_ATTENDANCE_RATE',
        'PAYROLL_COST',
        'OVERTIME_HOURS'
      ],
      period: 'custom',
      startDate,
      endDate
    });

    return {
      summary: {
        title: 'HR & Payroll Summary Report',
        dateRange: { startDate, endDate },
        totalRecords: Object.keys(kpis.data).length,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Staff Metrics',
          type: 'KPI',
          data: {
            staffUtilization: kpis.data.STAFF_UTILIZATION,
            attendanceRate: kpis.data.STAFF_ATTENDANCE_RATE
          }
        },
        {
          name: 'Payroll Metrics',
          type: 'KPI',
          data: {
            payrollCost: kpis.data.PAYROLL_COST,
            overtimeHours: kpis.data.OVERTIME_HOURS
          }
        }
      ],
      kpis: Object.entries(kpis.data).map(([name, data]) => ({
        name,
        value: data.value,
        unit: data.unit,
        trend: data.trend || null
      }))
    };
  }

  async generateInventoryExpiry(tenantId, parameters) {
    const { branchId } = parameters;

    // This would integrate with inventory service
    return {
      summary: {
        title: 'Inventory & Expiry Report',
        totalRecords: 0,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Expiring Items',
          type: 'TABLE',
          data: {
            message: 'Integration with inventory service pending'
          }
        }
      ]
    };
  }

  async generatePatientAnalytics(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    const kpis = await this.kpiService.getKPIs(tenantId, {
      branchId,
      metrics: [
        'PATIENT_FOOTFALL',
        'PATIENT_SATISFACTION',
        'TREATMENT_SUCCESS_RATE'
      ],
      period: 'custom',
      startDate,
      endDate
    });

    return {
      summary: {
        title: 'Patient Analytics Report',
        dateRange: { startDate, endDate },
        totalRecords: Object.keys(kpis.data).length,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Patient Metrics',
          type: 'KPI',
          data: kpis.data
        }
      ],
      kpis: Object.entries(kpis.data).map(([name, data]) => ({
        name,
        value: data.value,
        unit: data.unit,
        trend: data.trend || null
      }))
    };
  }

  async generateAppointmentAnalytics(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    const kpis = await this.kpiService.getKPIs(tenantId, {
      branchId,
      metrics: [
        'APPOINTMENT_COUNT',
        'APPOINTMENT_COMPLETION_RATE',
        'APPOINTMENT_CANCELLATION_RATE',
        'AVERAGE_WAIT_TIME'
      ],
      period: 'custom',
      startDate,
      endDate
    });

    return {
      summary: {
        title: 'Appointment Analytics Report',
        dateRange: { startDate, endDate },
        totalRecords: Object.keys(kpis.data).length,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Appointment Metrics',
          type: 'KPI',
          data: kpis.data
        }
      ],
      kpis: Object.entries(kpis.data).map(([name, data]) => ({
        name,
        value: data.value,
        unit: data.unit,
        trend: data.trend || null
      }))
    };
  }

  async generateRevenueAnalytics(tenantId, parameters) {
    return this.generateFinancialSummary(tenantId, parameters);
  }

  async generateStaffPerformance(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    const kpis = await this.kpiService.getKPIs(tenantId, {
      branchId,
      metrics: [
        'STAFF_UTILIZATION',
        'DOCTOR_UTILIZATION',
        'STAFF_ATTENDANCE_RATE'
      ],
      period: 'custom',
      startDate,
      endDate
    });

    return {
      summary: {
        title: 'Staff Performance Report',
        dateRange: { startDate, endDate },
        totalRecords: Object.keys(kpis.data).length,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Staff Performance Metrics',
          type: 'KPI',
          data: kpis.data
        }
      ],
      kpis: Object.entries(kpis.data).map(([name, data]) => ({
        name,
        value: data.value,
        unit: data.unit,
        trend: data.trend || null
      }))
    };
  }

  async generateClinicalOutcomes(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    return {
      summary: {
        title: 'Clinical Outcomes Report',
        dateRange: { startDate, endDate },
        totalRecords: 0,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Clinical Metrics',
          type: 'TEXT',
          data: {
            message: 'Clinical outcomes integration pending'
          }
        }
      ]
    };
  }

  async generateInsuranceAnalytics(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    const kpis = await this.kpiService.getKPIs(tenantId, {
      branchId,
      metrics: [
        'INSURANCE_APPROVAL_RATE',
        'INSURANCE_CLAIM_VALUE'
      ],
      period: 'custom',
      startDate,
      endDate
    });

    return {
      summary: {
        title: 'Insurance Analytics Report',
        dateRange: { startDate, endDate },
        totalRecords: Object.keys(kpis.data).length,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Insurance Metrics',
          type: 'KPI',
          data: kpis.data
        }
      ],
      kpis: Object.entries(kpis.data).map(([name, data]) => ({
        name,
        value: data.value,
        unit: data.unit,
        trend: data.trend || null
      }))
    };
  }

  async generateQueuePerformance(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    const kpis = await this.kpiService.getKPIs(tenantId, {
      branchId,
      metrics: [
        'QUEUE_EFFICIENCY',
        'TOKEN_PROCESSING_TIME',
        'AVERAGE_WAIT_TIME'
      ],
      period: 'custom',
      startDate,
      endDate
    });

    return {
      summary: {
        title: 'Queue Performance Report',
        dateRange: { startDate, endDate },
        totalRecords: Object.keys(kpis.data).length,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Queue Metrics',
          type: 'KPI',
          data: kpis.data
        }
      ],
      kpis: Object.entries(kpis.data).map(([name, data]) => ({
        name,
        value: data.value,
        unit: data.unit,
        trend: data.trend || null
      }))
    };
  }

  async generateAIDiagnosisReport(tenantId, parameters) {
    const { startDate, endDate, branchId } = parameters;

    const kpis = await this.kpiService.getKPIs(tenantId, {
      branchId,
      metrics: [
        'AI_DIAGNOSIS_ACCURACY',
        'LAB_TEST_COUNT'
      ],
      period: 'custom',
      startDate,
      endDate
    });

    return {
      summary: {
        title: 'AI Diagnosis Report',
        dateRange: { startDate, endDate },
        totalRecords: Object.keys(kpis.data).length,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'AI Diagnosis Metrics',
          type: 'KPI',
          data: kpis.data
        }
      ],
      kpis: Object.entries(kpis.data).map(([name, data]) => ({
        name,
        value: data.value,
        unit: data.unit,
        trend: data.trend || null
      }))
    };
  }

  async generateComplianceReport(tenantId, parameters) {
    return {
      summary: {
        title: 'Compliance Report',
        totalRecords: 0,
        generatedAt: new Date()
      },
      sections: [
        {
          name: 'Compliance Status',
          type: 'TEXT',
          data: {
            message: 'Compliance reporting integration pending'
          }
        }
      ]
    };
  }

  async generateReportFile(reportData, format, reportType, reportId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${reportType}_${reportId}_${timestamp}.${format.toLowerCase()}`;
    const filePath = path.join(process.env.REPORTS_STORAGE_PATH || './storage/reports', fileName);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    let fileContent;
    let fileSize;

    switch (format) {
      case 'JSON':
        fileContent = JSON.stringify(reportData, null, 2);
        await fs.writeFile(filePath, fileContent, 'utf8');
        fileSize = Buffer.byteLength(fileContent, 'utf8');
        break;

      case 'CSV':
        fileContent = this.convertToCSV(reportData);
        await fs.writeFile(filePath, fileContent, 'utf8');
        fileSize = Buffer.byteLength(fileContent, 'utf8');
        break;

      case 'PDF':
        // PDF generation would require a library like puppeteer or pdfkit
        // For now, create a simple text file
        fileContent = this.convertToText(reportData);
        await fs.writeFile(filePath, fileContent, 'utf8');
        fileSize = Buffer.byteLength(fileContent, 'utf8');
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return {
      fileName,
      filePath,
      fileSize
    };
  }

  convertToCSV(reportData) {
    let csv = 'Report Summary\n';
    csv += `Title,${reportData.summary.title}\n`;
    csv += `Generated At,${reportData.summary.generatedAt}\n`;
    csv += `Total Records,${reportData.summary.totalRecords}\n\n`;

    if (reportData.kpis && reportData.kpis.length > 0) {
      csv += 'KPI Name,Value,Unit,Trend Direction,Trend Percentage\n';
      reportData.kpis.forEach(kpi => {
        csv += `${kpi.name},${kpi.value},${kpi.unit},${kpi.trend?.direction || ''},${kpi.trend?.percentage || ''}\n`;
      });
    }

    return csv;
  }

  convertToText(reportData) {
    let text = `${reportData.summary.title}\n`;
    text += `Generated: ${reportData.summary.generatedAt}\n`;
    text += `Total Records: ${reportData.summary.totalRecords}\n\n`;

    if (reportData.sections) {
      reportData.sections.forEach(section => {
        text += `${section.name}\n`;
        text += '='.repeat(section.name.length) + '\n';
        
        if (section.type === 'KPI' && section.data) {
          Object.entries(section.data).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
              text += `${key}: ${value.value} ${value.unit || ''}\n`;
            }
          });
        }
        text += '\n';
      });
    }

    return text;
  }

  estimateCompletionTime(reportType, parameters) {
    // Simple estimation based on report complexity
    const baseTime = 30; // 30 seconds base
    const complexityMultiplier = {
      'OPERATIONAL_SUMMARY': 1,
      'FINANCIAL_SUMMARY': 1.5,
      'HR_PAYROLL_SUMMARY': 1.2,
      'INVENTORY_EXPIRY': 2,
      'PATIENT_ANALYTICS': 1.8,
      'APPOINTMENT_ANALYTICS': 1.5,
      'REVENUE_ANALYTICS': 1.5,
      'STAFF_PERFORMANCE': 1.3,
      'CLINICAL_OUTCOMES': 2.5,
      'INSURANCE_ANALYTICS': 1.7,
      'QUEUE_PERFORMANCE': 1.2,
      'AI_DIAGNOSIS_REPORT': 2,
      'COMPLIANCE_REPORT': 3
    };

    const multiplier = complexityMultiplier[reportType] || 1;
    const estimatedSeconds = baseTime * multiplier;
    
    return new Date(Date.now() + estimatedSeconds * 1000);
  }

  getContentType(format) {
    const contentTypes = {
      'PDF': 'application/pdf',
      'CSV': 'text/csv',
      'EXCEL': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'JSON': 'application/json'
    };
    return contentTypes[format] || 'application/octet-stream';
  }
}

module.exports = ReportService;