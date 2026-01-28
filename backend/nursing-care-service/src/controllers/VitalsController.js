const VitalsService = require('../services/VitalsService');
const logger = require('../utils/logger');

class VitalsController {
  constructor() {
    this.vitalsService = new VitalsService();
  }

  // Create new vitals record
  async createVitals(req, res) {
    try {
      const vitalsData = req.body;
      const recordedBy = req.user;

      // Validate vitals data
      const validationErrors = this.vitalsService.validateVitalsData(vitalsData.metrics);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vitals data',
          errors: validationErrors
        });
      }

      const result = await this.vitalsService.createVitals(vitalsData, recordedBy);

      logger.info('Vitals created via API', {
        vitalId: result.data?.vitalId,
        patientId: vitalsData.patientId,
        recordedBy: recordedBy.userId
      });

      res.status(201).json(result);

    } catch (error) {
      logger.error('Error in createVitals controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get vitals by ID
  async getVitalsById(req, res) {
    try {
      const { vitalId } = req.params;
      const { tenantId } = req.user;

      const result = await this.vitalsService.getVitalsById(vitalId, tenantId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);

    } catch (error) {
      logger.error('Error in getVitalsById controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get vitals by appointment
  async getVitalsByAppointment(req, res) {
    try {
      const { appointmentId } = req.params;
      const { tenantId } = req.user;

      const result = await this.vitalsService.getVitalsByAppointment(appointmentId, tenantId);

      res.json(result);

    } catch (error) {
      logger.error('Error in getVitalsByAppointment controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get vitals by patient
  async getVitalsByPatient(req, res) {
    try {
      const { patientId } = req.params;
      const { tenantId } = req.user;
      const { limit, includeAbnormal } = req.query;

      const options = {
        limit: parseInt(limit) || 10,
        includeAbnormal: includeAbnormal === 'true'
      };

      const result = await this.vitalsService.getVitalsByPatient(patientId, tenantId, options);

      res.json(result);

    } catch (error) {
      logger.error('Error in getVitalsByPatient controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get abnormal vitals
  async getAbnormalVitals(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { limit, severity, startDate, endDate } = req.query;

      const options = {
        limit: parseInt(limit) || 20,
        severity,
        startDate,
        endDate
      };

      const result = await this.vitalsService.getAbnormalVitals(tenantId, branchId, options);

      res.json(result);

    } catch (error) {
      logger.error('Error in getAbnormalVitals controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get vitals statistics
  async getVitalsStatistics(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { startDate, endDate } = req.query;

      const options = {};
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);

      const result = await this.vitalsService.getVitalsStatistics(tenantId, branchId, options);

      res.json(result);

    } catch (error) {
      logger.error('Error in getVitalsStatistics controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Search vitals
  async searchVitals(req, res) {
    try {
      const { tenantId } = req.user;
      const filters = req.query;
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'timestamp',
        sortOrder: req.query.sortOrder || 'desc'
      };

      // Remove pagination params from filters
      delete filters.page;
      delete filters.limit;
      delete filters.sortBy;
      delete filters.sortOrder;

      const result = await this.vitalsService.searchVitals(tenantId, filters, pagination);

      res.json(result);

    } catch (error) {
      logger.error('Error in searchVitals controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get vitals trends
  async getVitalsTrends(req, res) {
    try {
      const { patientId } = req.params;
      const { tenantId } = req.user;
      const { days, metrics } = req.query;

      const options = {
        days: parseInt(days) || 30,
        metrics: metrics ? metrics.split(',') : undefined
      };

      const result = await this.vitalsService.getVitalsTrends(patientId, tenantId, options);

      res.json(result);

    } catch (error) {
      logger.error('Error in getVitalsTrends controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete vitals record
  async deleteVitals(req, res) {
    try {
      const { vitalId } = req.params;
      const { tenantId } = req.user;
      const deletedBy = req.user;

      const result = await this.vitalsService.deleteVitals(vitalId, tenantId, deletedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      logger.info('Vitals deleted via API', {
        vitalId,
        deletedBy: deletedBy.userId
      });

      res.json(result);

    } catch (error) {
      logger.error('Error in deleteVitals controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get vitals summary for dashboard
  async getVitalsSummary(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { period = '24h' } = req.query;

      // Calculate date range based on period
      let startDate;
      const endDate = new Date();

      switch (period) {
        case '1h':
          startDate = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '6h':
          startDate = new Date(Date.now() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const [statistics, abnormalVitals] = await Promise.all([
        this.vitalsService.getVitalsStatistics(tenantId, branchId, { startDate, endDate }),
        this.vitalsService.getAbnormalVitals(tenantId, branchId, { limit: 10 })
      ]);

      res.json({
        success: true,
        data: {
          period,
          statistics: statistics.data,
          recentAbnormal: abnormalVitals.data,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('Error in getVitalsSummary controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Validate vitals data endpoint
  async validateVitalsData(req, res) {
    try {
      const { metrics } = req.body;

      if (!metrics || typeof metrics !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Metrics data is required'
        });
      }

      const validationErrors = this.vitalsService.validateVitalsData(metrics);

      res.json({
        success: true,
        data: {
          isValid: validationErrors.length === 0,
          errors: validationErrors
        }
      });

    } catch (error) {
      logger.error('Error in validateVitalsData controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = VitalsController;