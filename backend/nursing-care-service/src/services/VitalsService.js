const { v4: uuidv4 } = require('uuid');
const Vitals = require('../models/Vitals');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class VitalsService {
  constructor() {
    this.cacheService = new CacheService();
  }

  // Create new vitals record
  async createVitals(vitalsData, recordedBy) {
    try {
      const vitalId = uuidv4();
      
      const vitals = new Vitals({
        vitalId,
        ...vitalsData,
        recordedBy: recordedBy.userId,
        recordedByName: recordedBy.userName,
        tenantId: recordedBy.tenantId,
        timestamp: new Date()
      });

      await vitals.save();

      // Cache the vitals record
      await this.cacheService.setVitals(vitalId, vitals);

      // If vitals are abnormal, cache for quick access
      if (vitals.isAbnormal) {
        await this.cacheService.setAbnormalVitals(
          vitals.tenantId,
          vitals.branchId,
          vitals
        );
      }

      logger.info('Vitals created successfully', {
        vitalId,
        patientId: vitals.patientId,
        appointmentId: vitals.appointmentId,
        recordedBy: recordedBy.userId,
        isAbnormal: vitals.isAbnormal
      });

      return {
        success: true,
        data: vitals,
        message: 'Vitals recorded successfully'
      };

    } catch (error) {
      logger.error('Error creating vitals:', error);
      throw new Error('Failed to create vitals record');
    }
  }

  // Get vitals by ID
  async getVitalsById(vitalId, tenantId) {
    try {
      // Try cache first
      let vitals = await this.cacheService.getVitals(vitalId);
      
      if (!vitals) {
        vitals = await Vitals.findOne({
          vitalId,
          tenantId,
          isDeleted: false
        });

        if (vitals) {
          await this.cacheService.setVitals(vitalId, vitals);
        }
      }

      if (!vitals) {
        return {
          success: false,
          message: 'Vitals record not found'
        };
      }

      return {
        success: true,
        data: vitals
      };

    } catch (error) {
      logger.error('Error fetching vitals by ID:', error);
      throw new Error('Failed to fetch vitals record');
    }
  }

  // Get vitals by appointment
  async getVitalsByAppointment(appointmentId, tenantId) {
    try {
      const cacheKey = `vitals:appointment:${appointmentId}`;
      let vitals = await this.cacheService.get(cacheKey);

      if (!vitals) {
        vitals = await Vitals.findByAppointment(tenantId, appointmentId);
        await this.cacheService.set(cacheKey, vitals, 1800); // 30 minutes
      }

      return {
        success: true,
        data: vitals,
        count: vitals.length
      };

    } catch (error) {
      logger.error('Error fetching vitals by appointment:', error);
      throw new Error('Failed to fetch appointment vitals');
    }
  }

  // Get vitals by patient
  async getVitalsByPatient(patientId, tenantId, options = {}) {
    try {
      const { limit = 10, includeAbnormal = false } = options;
      
      let query = { tenantId, patientId, isDeleted: false };
      
      if (includeAbnormal) {
        query.isAbnormal = true;
      }

      const vitals = await Vitals.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);

      return {
        success: true,
        data: vitals,
        count: vitals.length
      };

    } catch (error) {
      logger.error('Error fetching vitals by patient:', error);
      throw new Error('Failed to fetch patient vitals');
    }
  }

  // Get abnormal vitals for branch
  async getAbnormalVitals(tenantId, branchId, options = {}) {
    try {
      const { 
        limit = 20, 
        severity = null,
        startDate = null,
        endDate = null 
      } = options;

      let query = {
        tenantId,
        branchId,
        isAbnormal: true,
        isDeleted: false
      };

      if (severity) {
        query['abnormalFlags.severity'] = severity;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const vitals = await Vitals.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('patientId', 'name')
        .populate('recordedBy', 'name');

      return {
        success: true,
        data: vitals,
        count: vitals.length
      };

    } catch (error) {
      logger.error('Error fetching abnormal vitals:', error);
      throw new Error('Failed to fetch abnormal vitals');
    }
  }

  // Get vitals statistics
  async getVitalsStatistics(tenantId, branchId, options = {}) {
    try {
      const { 
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate = new Date() 
      } = options;

      const pipeline = [
        {
          $match: {
            tenantId,
            branchId,
            timestamp: { $gte: startDate, $lte: endDate },
            isDeleted: false
          }
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            abnormalRecords: {
              $sum: { $cond: ['$isAbnormal', 1, 0] }
            },
            recordingTypes: {
              $push: '$recordingType'
            },
            severityDistribution: {
              $push: '$abnormalFlags.severity'
            }
          }
        }
      ];

      const [stats] = await Vitals.aggregate(pipeline);

      if (!stats) {
        return {
          success: true,
          data: {
            totalRecords: 0,
            abnormalRecords: 0,
            abnormalPercentage: 0,
            recordingTypes: {},
            severityDistribution: {}
          }
        };
      }

      // Process recording types
      const recordingTypeCounts = stats.recordingTypes.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      // Process severity distribution
      const severityDistribution = stats.severityDistribution
        .flat()
        .filter(Boolean)
        .reduce((acc, severity) => {
          acc[severity] = (acc[severity] || 0) + 1;
          return acc;
        }, {});

      const result = {
        totalRecords: stats.totalRecords,
        abnormalRecords: stats.abnormalRecords,
        abnormalPercentage: stats.totalRecords > 0 
          ? Math.round((stats.abnormalRecords / stats.totalRecords) * 100) 
          : 0,
        recordingTypes: recordingTypeCounts,
        severityDistribution
      };

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.error('Error fetching vitals statistics:', error);
      throw new Error('Failed to fetch vitals statistics');
    }
  }

  // Search vitals with filters
  async searchVitals(tenantId, filters = {}, pagination = {}) {
    try {
      const {
        branchId,
        patientId,
        appointmentId,
        recordingType,
        isAbnormal,
        startDate,
        endDate,
        recordedBy
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = pagination;

      // Build query
      let query = { tenantId, isDeleted: false };

      if (branchId) query.branchId = branchId;
      if (patientId) query.patientId = patientId;
      if (appointmentId) query.appointmentId = appointmentId;
      if (recordingType) query.recordingType = recordingType;
      if (typeof isAbnormal === 'boolean') query.isAbnormal = isAbnormal;
      if (recordedBy) query.recordedBy = recordedBy;

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [vitals, totalCount] = await Promise.all([
        Vitals.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        Vitals.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: vitals,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };

    } catch (error) {
      logger.error('Error searching vitals:', error);
      throw new Error('Failed to search vitals');
    }
  }

  // Get vitals trends for a patient
  async getVitalsTrends(patientId, tenantId, options = {}) {
    try {
      const { 
        days = 30,
        metrics = ['bloodPressure', 'pulse', 'temperature', 'oxygenSaturation']
      } = options;

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const vitals = await Vitals.find({
        tenantId,
        patientId,
        timestamp: { $gte: startDate },
        isDeleted: false
      }).sort({ timestamp: 1 });

      // Process trends data
      const trends = {};
      metrics.forEach(metric => {
        trends[metric] = vitals
          .filter(v => v.metrics[metric] !== undefined)
          .map(v => ({
            timestamp: v.timestamp,
            value: v.metrics[metric],
            isAbnormal: v.abnormalFlags.some(flag => flag.metric === metric)
          }));
      });

      return {
        success: true,
        data: {
          patientId,
          period: `${days} days`,
          trends,
          totalRecords: vitals.length
        }
      };

    } catch (error) {
      logger.error('Error fetching vitals trends:', error);
      throw new Error('Failed to fetch vitals trends');
    }
  }

  // Delete vitals record (soft delete)
  async deleteVitals(vitalId, tenantId, deletedBy) {
    try {
      const vitals = await Vitals.findOne({
        vitalId,
        tenantId,
        isDeleted: false
      });

      if (!vitals) {
        return {
          success: false,
          message: 'Vitals record not found'
        };
      }

      vitals.isDeleted = true;
      await vitals.save();

      // Remove from cache
      await this.cacheService.deleteVitals(vitalId);

      logger.info('Vitals deleted successfully', {
        vitalId,
        deletedBy: deletedBy.userId
      });

      return {
        success: true,
        message: 'Vitals record deleted successfully'
      };

    } catch (error) {
      logger.error('Error deleting vitals:', error);
      throw new Error('Failed to delete vitals record');
    }
  }

  // Validate vitals data
  validateVitalsData(metrics) {
    const errors = [];

    // Blood pressure validation
    if (metrics.bloodPressure) {
      const { systolic, diastolic } = metrics.bloodPressure;
      if (systolic && diastolic && systolic <= diastolic) {
        errors.push('Systolic pressure must be higher than diastolic pressure');
      }
    }

    // Temperature validation (assuming Fahrenheit)
    if (metrics.temperature && (metrics.temperature < 90 || metrics.temperature > 110)) {
      errors.push('Temperature reading seems unrealistic');
    }

    // Oxygen saturation validation
    if (metrics.oxygenSaturation && (metrics.oxygenSaturation < 70 || metrics.oxygenSaturation > 100)) {
      errors.push('Oxygen saturation must be between 70-100%');
    }

    // Pulse validation
    if (metrics.pulse && (metrics.pulse < 30 || metrics.pulse > 200)) {
      errors.push('Pulse rate seems unrealistic');
    }

    return errors;
  }
}

module.exports = VitalsService;