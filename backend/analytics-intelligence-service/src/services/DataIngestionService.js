const DataIngestionLog = require('../models/DataIngestionLog');
const MetricSnapshot = require('../models/MetricSnapshot');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class DataIngestionService {
  constructor() {
    this.processors = new Map();
    this.initializeProcessors();
  }

  initializeProcessors() {
    this.processors.set('APPOINTMENT', this.processAppointmentData.bind(this));
    this.processors.set('BILLING', this.processBillingData.bind(this));
    this.processors.set('LAB_RESULT', this.processLabResultData.bind(this));
    this.processors.set('PAYROLL', this.processPayrollData.bind(this));
    this.processors.set('INVENTORY', this.processInventoryData.bind(this));
    this.processors.set('QUEUE_TOKEN', this.processQueueTokenData.bind(this));
    this.processors.set('NURSING_RECORD', this.processNursingRecordData.bind(this));
    this.processors.set('AI_DIAGNOSIS', this.processAIDiagnosisData.bind(this));
    this.processors.set('INSURANCE_CLAIM', this.processInsuranceClaimData.bind(this));
    this.processors.set('FINANCIAL_TRANSACTION', this.processFinancialTransactionData.bind(this));
    this.processors.set('COLLABORATION', this.processCollaborationData.bind(this));
    this.processors.set('NOTIFICATION', this.processNotificationData.bind(this));
  }

  async ingestData(tenantId, sourceService, dataType, data, options = {}) {
    try {
      const {
        batchId = uuidv4(),
        branchId,
        timestamp = new Date(),
        metadata = {}
      } = options;

      logger.info('Starting data ingestion', {
        tenantId,
        sourceService,
        dataType,
        recordCount: data.length,
        batchId,
        branchId,
        category: 'ingestion'
      });

      // Create ingestion log
      const ingestionLog = new DataIngestionLog({
        tenantId,
        branchId,
        sourceService,
        dataType,
        batchId,
        recordCount: data.length,
        metadata: {
          ...metadata,
          requestId: options.requestId,
          correlationId: options.correlationId
        }
      });

      await ingestionLog.save();
      await ingestionLog.startProcessing();

      // Process data
      const processor = this.processors.get(dataType);
      if (!processor) {
        throw new Error(`No processor found for data type: ${dataType}`);
      }

      const results = await processor(tenantId, data, { branchId, batchId, ingestionLog });

      // Complete ingestion
      await ingestionLog.completeProcessing({
        totalRecords: data.length,
        validRecords: results.validRecords,
        invalidRecords: results.invalidRecords,
        newRecords: results.newRecords,
        updatedRecords: results.updatedRecords
      });

      logger.info('Data ingestion completed', {
        tenantId,
        sourceService,
        dataType,
        batchId,
        results,
        category: 'ingestion'
      });

      return {
        success: true,
        data: {
          batchId,
          recordsProcessed: results.validRecords,
          recordsSkipped: results.invalidRecords,
          metricsGenerated: results.metricsGenerated || 0
        }
      };

    } catch (error) {
      logger.error('Data ingestion failed', {
        error: error.message,
        tenantId,
        sourceService,
        dataType,
        category: 'ingestion'
      });
      throw error;
    }
  }

  async getIngestionStatus(tenantId, options = {}) {
    try {
      const {
        sourceService,
        dataType,
        batchId,
        startDate,
        endDate,
        limit = 50
      } = options;

      const logs = await DataIngestionLog.findByTenant(tenantId, {
        sourceService,
        dataType,
        batchId,
        startDate,
        endDate,
        limit
      });

      const stats = await DataIngestionLog.getIngestionStats(tenantId, {
        start: startDate,
        end: endDate
      });

      return {
        success: true,
        data: {
          logs,
          stats
        }
      };

    } catch (error) {
      logger.error('Error fetching ingestion status', {
        error: error.message,
        tenantId,
        options,
        category: 'ingestion'
      });
      throw error;
    }
  }

  async getServiceHealthMetrics(tenantId, hours = 24) {
    try {
      const healthMetrics = await DataIngestionLog.getServiceHealthMetrics(tenantId, hours);

      return {
        success: true,
        data: healthMetrics
      };

    } catch (error) {
      logger.error('Error fetching service health metrics', {
        error: error.message,
        tenantId,
        hours,
        category: 'ingestion'
      });
      throw error;
    }
  }

  // Data processors
  async processAppointmentData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;
    let metricsGenerated = 0;

    for (const record of data) {
      try {
        // Validate appointment record
        if (!this.validateAppointmentRecord(record)) {
          invalidRecords++;
          await ingestionLog.addError(
            data.indexOf(record),
            'appointment',
            'VALIDATION',
            'Invalid appointment record structure',
            record
          );
          continue;
        }

        // Process appointment metrics
        await this.generateAppointmentMetrics(tenantId, record, branchId);
        
        validRecords++;
        metricsGenerated++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'appointment',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords, metricsGenerated };
  }

  async processBillingData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;
    let metricsGenerated = 0;

    for (const record of data) {
      try {
        if (!this.validateBillingRecord(record)) {
          invalidRecords++;
          await ingestionLog.addError(
            data.indexOf(record),
            'billing',
            'VALIDATION',
            'Invalid billing record structure',
            record
          );
          continue;
        }

        await this.generateBillingMetrics(tenantId, record, branchId);
        
        validRecords++;
        metricsGenerated++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'billing',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords, metricsGenerated };
  }

  async processLabResultData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;
    let metricsGenerated = 0;

    for (const record of data) {
      try {
        if (!this.validateLabResultRecord(record)) {
          invalidRecords++;
          continue;
        }

        await this.generateLabMetrics(tenantId, record, branchId);
        
        validRecords++;
        metricsGenerated++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'lab_result',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords, metricsGenerated };
  }

  async processPayrollData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;
    let metricsGenerated = 0;

    for (const record of data) {
      try {
        if (!this.validatePayrollRecord(record)) {
          invalidRecords++;
          continue;
        }

        await this.generatePayrollMetrics(tenantId, record, branchId);
        
        validRecords++;
        metricsGenerated++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'payroll',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords, metricsGenerated };
  }

  async processInventoryData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;
    let metricsGenerated = 0;

    for (const record of data) {
      try {
        if (!this.validateInventoryRecord(record)) {
          invalidRecords++;
          continue;
        }

        await this.generateInventoryMetrics(tenantId, record, branchId);
        
        validRecords++;
        metricsGenerated++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'inventory',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords, metricsGenerated };
  }

  async processQueueTokenData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;
    let metricsGenerated = 0;

    for (const record of data) {
      try {
        if (!this.validateQueueTokenRecord(record)) {
          invalidRecords++;
          continue;
        }

        await this.generateQueueMetrics(tenantId, record, branchId);
        
        validRecords++;
        metricsGenerated++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'queue_token',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords, metricsGenerated };
  }

  async processNursingRecordData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;

    for (const record of data) {
      try {
        if (!this.validateNursingRecord(record)) {
          invalidRecords++;
          continue;
        }

        // Process nursing record (no specific metrics for now)
        validRecords++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'nursing_record',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords };
  }

  async processAIDiagnosisData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;
    let metricsGenerated = 0;

    for (const record of data) {
      try {
        if (!this.validateAIDiagnosisRecord(record)) {
          invalidRecords++;
          continue;
        }

        await this.generateAIMetrics(tenantId, record, branchId);
        
        validRecords++;
        metricsGenerated++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'ai_diagnosis',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords, metricsGenerated };
  }

  async processInsuranceClaimData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;
    let metricsGenerated = 0;

    for (const record of data) {
      try {
        if (!this.validateInsuranceClaimRecord(record)) {
          invalidRecords++;
          continue;
        }

        await this.generateInsuranceMetrics(tenantId, record, branchId);
        
        validRecords++;
        metricsGenerated++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'insurance_claim',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords, metricsGenerated };
  }

  async processFinancialTransactionData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;
    let metricsGenerated = 0;

    for (const record of data) {
      try {
        if (!this.validateFinancialTransactionRecord(record)) {
          invalidRecords++;
          continue;
        }

        await this.generateFinancialMetrics(tenantId, record, branchId);
        
        validRecords++;
        metricsGenerated++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'financial_transaction',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords, metricsGenerated };
  }

  async processCollaborationData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;

    for (const record of data) {
      try {
        if (!this.validateCollaborationRecord(record)) {
          invalidRecords++;
          continue;
        }

        // Process collaboration record (no specific metrics for now)
        validRecords++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'collaboration',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords };
  }

  async processNotificationData(tenantId, data, options) {
    const { branchId, ingestionLog } = options;
    let validRecords = 0;
    let invalidRecords = 0;

    for (const record of data) {
      try {
        if (!this.validateNotificationRecord(record)) {
          invalidRecords++;
          continue;
        }

        // Process notification record (no specific metrics for now)
        validRecords++;
        await ingestionLog.incrementProcessed();

      } catch (error) {
        invalidRecords++;
        await ingestionLog.addError(
          data.indexOf(record),
          'notification',
          'PROCESSING',
          error.message,
          record
        );
      }
    }

    return { validRecords, invalidRecords };
  }

  // Metric generators
  async generateAppointmentMetrics(tenantId, record, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate appointment count metric
    await this.updateMetricSnapshot(tenantId, branchId, 'APPOINTMENT_COUNT', 1, today, 'COUNT');

    // Generate completion rate if appointment is completed
    if (record.status === 'COMPLETED') {
      await this.updateMetricSnapshot(tenantId, branchId, 'APPOINTMENT_COMPLETION_RATE', 1, today, 'COUNT');
    }

    // Generate cancellation rate if appointment is cancelled
    if (record.status === 'CANCELLED') {
      await this.updateMetricSnapshot(tenantId, branchId, 'APPOINTMENT_CANCELLATION_RATE', 1, today, 'COUNT');
    }
  }

  async generateBillingMetrics(tenantId, record, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate revenue metrics
    if (record.amount && record.amount > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'DAILY_REVENUE', record.amount, today, 'CURRENCY');
    }

    // Generate collection rate if payment is received
    if (record.status === 'PAID') {
      await this.updateMetricSnapshot(tenantId, branchId, 'BILLING_COLLECTION_RATE', 1, today, 'COUNT');
    }

    // Generate outstanding payments if payment is pending
    if (record.status === 'PENDING') {
      await this.updateMetricSnapshot(tenantId, branchId, 'OUTSTANDING_PAYMENTS', record.amount, today, 'CURRENCY');
    }
  }

  async generateLabMetrics(tenantId, record, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate lab test count
    await this.updateMetricSnapshot(tenantId, branchId, 'LAB_TEST_COUNT', 1, today, 'COUNT');
  }

  async generatePayrollMetrics(tenantId, record, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate payroll cost
    if (record.amount && record.amount > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'PAYROLL_COST', record.amount, today, 'CURRENCY');
    }

    // Generate overtime hours
    if (record.overtimeHours && record.overtimeHours > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'OVERTIME_HOURS', record.overtimeHours, today, 'TIME_HOURS');
    }

    // Generate attendance rate
    if (record.attendanceStatus === 'PRESENT') {
      await this.updateMetricSnapshot(tenantId, branchId, 'STAFF_ATTENDANCE_RATE', 1, today, 'COUNT');
    }
  }

  async generateInventoryMetrics(tenantId, record, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate medicine consumption
    if (record.type === 'CONSUMPTION' && record.quantity > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'MEDICINE_CONSUMPTION', record.quantity, today, 'COUNT');
    }
  }

  async generateQueueMetrics(tenantId, record, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate patient footfall
    if (record.status === 'CHECKED_IN') {
      await this.updateMetricSnapshot(tenantId, branchId, 'PATIENT_FOOTFALL', 1, today, 'COUNT');
    }

    // Generate wait time metrics
    if (record.waitTime && record.waitTime > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'AVERAGE_WAIT_TIME', record.waitTime, today, 'TIME_MINUTES');
    }

    // Generate token processing time
    if (record.processingTime && record.processingTime > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'TOKEN_PROCESSING_TIME', record.processingTime, today, 'TIME_MINUTES');
    }
  }

  async generateAIMetrics(tenantId, record, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate AI diagnosis accuracy
    if (record.accuracy && record.accuracy > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'AI_DIAGNOSIS_ACCURACY', record.accuracy, today, 'PERCENTAGE');
    }
  }

  async generateInsuranceMetrics(tenantId, record, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate insurance approval rate
    if (record.status === 'APPROVED') {
      await this.updateMetricSnapshot(tenantId, branchId, 'INSURANCE_APPROVAL_RATE', 1, today, 'COUNT');
    }

    // Generate insurance claim value
    if (record.claimAmount && record.claimAmount > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'INSURANCE_CLAIM_VALUE', record.claimAmount, today, 'CURRENCY');
    }
  }

  async generateFinancialMetrics(tenantId, record, branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate revenue metrics based on transaction type
    if (record.type === 'REVENUE' && record.amount > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'DAILY_REVENUE', record.amount, today, 'CURRENCY');
    }

    // Generate expense metrics
    if (record.type === 'EXPENSE' && record.amount > 0) {
      await this.updateMetricSnapshot(tenantId, branchId, 'EXPENSE_RATIO', record.amount, today, 'CURRENCY');
    }
  }

  async updateMetricSnapshot(tenantId, branchId, metric, value, period, unit) {
    try {
      // Find existing snapshot for the same period
      let snapshot = await MetricSnapshot.findOne({
        tenantId,
        branchId,
        metric,
        period,
        isActive: true
      });

      if (snapshot) {
        // Update existing snapshot
        if (unit === 'COUNT') {
          snapshot.value = (snapshot.value || 0) + value;
        } else {
          snapshot.value = (snapshot.value || 0) + value;
        }
        snapshot.metadata.calculatedAt = new Date();
        await snapshot.save();
      } else {
        // Create new snapshot
        snapshot = new MetricSnapshot({
          tenantId,
          branchId,
          metric,
          value,
          unit,
          period,
          metadata: {
            calculatedAt: new Date(),
            dataFreshness: new Date(),
            confidence: 1.0
          }
        });
        await snapshot.save();
      }

    } catch (error) {
      logger.error('Error updating metric snapshot', {
        error: error.message,
        tenantId,
        branchId,
        metric,
        value,
        category: 'ingestion'
      });
    }
  }

  // Validation methods
  validateAppointmentRecord(record) {
    return record && 
           record.appointmentId && 
           record.patientId && 
           record.doctorId && 
           record.status;
  }

  validateBillingRecord(record) {
    return record && 
           record.billId && 
           record.patientId && 
           record.amount && 
           record.status;
  }

  validateLabResultRecord(record) {
    return record && 
           record.testId && 
           record.patientId && 
           record.status;
  }

  validatePayrollRecord(record) {
    return record && 
           record.employeeId && 
           record.amount;
  }

  validateInventoryRecord(record) {
    return record && 
           record.itemId && 
           record.quantity && 
           record.type;
  }

  validateQueueTokenRecord(record) {
    return record && 
           record.tokenId && 
           record.patientId && 
           record.status;
  }

  validateNursingRecord(record) {
    return record && 
           record.patientId && 
           record.nurseId;
  }

  validateAIDiagnosisRecord(record) {
    return record && 
           record.diagnosisId && 
           record.patientId;
  }

  validateInsuranceClaimRecord(record) {
    return record && 
           record.claimId && 
           record.patientId && 
           record.claimAmount;
  }

  validateFinancialTransactionRecord(record) {
    return record && 
           record.transactionId && 
           record.amount && 
           record.type;
  }

  validateCollaborationRecord(record) {
    return record && 
           record.collaborationId;
  }

  validateNotificationRecord(record) {
    return record && 
           record.notificationId && 
           record.recipientId;
  }
}

module.exports = DataIngestionService;