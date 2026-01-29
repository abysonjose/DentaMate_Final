const Measurement = require('../models/Measurement');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');
const FileStorageService = require('./FileStorageService');
const NotificationService = require('./NotificationService');

class MeasurementService {
  constructor() {
    this.cacheService = new CacheService();
    this.fileStorageService = new FileStorageService();
    this.notificationService = new NotificationService();
  }

  async uploadMeasurement(measurementData, file, uploadedBy) {
    try {
      // Upload file to storage
      const fileUploadResult = await this.fileStorageService.uploadFile(file, {
        caseId: measurementData.caseId,
        type: measurementData.type,
        uploadedBy
      });

      // Create measurement record
      const measurement = new Measurement({
        ...measurementData,
        fileName: fileUploadResult.fileName,
        originalFileName: file.originalname,
        fileUrl: fileUploadResult.fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy
      });

      await measurement.save();

      logger.info('Measurement uploaded', {
        measurementId: measurement.measurementId,
        caseId: measurement.caseId,
        type: measurement.type,
        fileSize: measurement.fileSize,
        uploadedBy
      });

      // Send notification
      await this.notificationService.notifyMeasurementUploaded(measurement);

      // Cache the measurement
      await this.cacheService.setMeasurementCache(measurement.measurementId, measurement);

      return measurement;
    } catch (error) {
      logger.error('Error uploading measurement:', error);
      
      // Clean up uploaded file if measurement creation failed
      if (file && file.filename) {
        try {
          await this.fileStorageService.deleteFile(file.filename);
        } catch (cleanupError) {
          logger.error('Error cleaning up uploaded file:', cleanupError);
        }
      }
      
      throw error;
    }
  }

  async getMeasurementById(measurementId, tenantId, userRole, userId) {
    try {
      // Try cache first
      let measurement = await this.cacheService.getMeasurementCache(measurementId);

      if (!measurement) {
        measurement = await Measurement.findOne({
          measurementId,
          tenantId
        });

        if (!measurement) {
          throw new Error('Measurement not found');
        }

        // Cache the measurement
        await this.cacheService.setMeasurementCache(measurementId, measurement);
      }

      // Apply role-based filtering
      const filteredMeasurement = this.applyRoleBasedFiltering(measurement, userRole, userId);

      return filteredMeasurement;
    } catch (error) {
      logger.error('Error getting measurement by ID:', error);
      throw error;
    }
  }

  async getMeasurements(filters, userRole, userId) {
    try {
      const query = this.buildMeasurementQuery(filters, userRole, userId);

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
      const sort = { [sortBy]: sortOrder };

      const [measurements, totalCount] = await Promise.all([
        Measurement.find(query).skip(skip).limit(limit).sort(sort),
        Measurement.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        measurements: measurements.map(measurement => 
          this.applyRoleBasedFiltering(measurement, userRole, userId)
        ),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting measurements:', error);
      throw error;
    }
  }

  async getMeasurementsForCase(caseId, tenantId, userRole, userId) {
    try {
      const cacheKey = `case_measurements_${caseId}`;
      let measurements = await this.cacheService.get(cacheKey);

      if (!measurements) {
        measurements = await Measurement.getLatestForCase(caseId, tenantId);
        
        // Cache for 5 minutes
        await this.cacheService.set(cacheKey, measurements, 300);
      }

      return measurements.map(measurement => 
        this.applyRoleBasedFiltering(measurement, userRole, userId)
      );
    } catch (error) {
      logger.error('Error getting measurements for case:', error);
      throw error;
    }
  }

  async updateMeasurementStatus(measurementId, statusData, reviewedBy, tenantId) {
    try {
      const measurement = await Measurement.findOne({
        measurementId,
        tenantId
      });

      if (!measurement) {
        throw new Error('Measurement not found');
      }

      // Update status using model method
      if (statusData.status === 'APPROVED') {
        await measurement.approve(reviewedBy, statusData.reviewNotes);
      } else if (statusData.status === 'REJECTED') {
        await measurement.reject(reviewedBy, statusData.reviewNotes);
      } else {
        measurement.status = statusData.status;
        measurement.reviewedBy = reviewedBy;
        measurement.reviewedAt = new Date();
        measurement.reviewNotes = statusData.reviewNotes || '';
        
        measurement.auditLog.push({
          action: 'UPDATED',
          performedBy: reviewedBy,
          performedAt: new Date(),
          notes: statusData.reviewNotes || ''
        });

        await measurement.save();
      }

      logger.info('Measurement status updated', {
        measurementId,
        status: statusData.status,
        reviewedBy
      });

      // Send notification
      await this.notificationService.notifyMeasurementStatusUpdate(measurement);

      // Update cache
      await this.cacheService.setMeasurementCache(measurementId, measurement);

      // Clear case measurements cache
      const cacheKey = `case_measurements_${measurement.caseId}`;
      await this.cacheService.del(cacheKey);

      return measurement;
    } catch (error) {
      logger.error('Error updating measurement status:', error);
      throw error;
    }
  }

  async getMeasurementHistory(caseId, type, tenantId) {
    try {
      const history = await Measurement.getHistory(caseId, type, tenantId);
      return history;
    } catch (error) {
      logger.error('Error getting measurement history:', error);
      throw error;
    }
  }

  async deleteMeasurement(measurementId, deletedBy, tenantId) {
    try {
      const measurement = await Measurement.findOne({
        measurementId,
        tenantId
      });

      if (!measurement) {
        throw new Error('Measurement not found');
      }

      // Only allow deletion if measurement is not approved
      if (measurement.status === 'APPROVED') {
        throw new Error('Cannot delete approved measurement');
      }

      // Delete file from storage
      await this.fileStorageService.deleteFile(measurement.fileName);

      // Delete measurement record
      await Measurement.deleteOne({ measurementId, tenantId });

      logger.info('Measurement deleted', {
        measurementId,
        caseId: measurement.caseId,
        deletedBy
      });

      // Clear caches
      await this.cacheService.del(`measurement_${measurementId}`);
      await this.cacheService.del(`case_measurements_${measurement.caseId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error deleting measurement:', error);
      throw error;
    }
  }

  async generateSignedUrl(measurementId, tenantId, userRole, userId) {
    try {
      const measurement = await this.getMeasurementById(measurementId, tenantId, userRole, userId);
      
      // Generate signed URL for file access
      const signedUrl = await this.fileStorageService.generateSignedUrl(
        measurement.fileName,
        3600 // 1 hour expiry
      );

      logger.info('Signed URL generated for measurement', {
        measurementId,
        userId,
        expiresIn: 3600
      });

      return {
        signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000)
      };
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  // Helper methods
  buildMeasurementQuery(filters, userRole, userId) {
    const query = {};

    // Apply tenant/branch filtering
    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.branchId) query.branchId = filters.branchId;

    // Apply other filters
    if (filters.caseId) query.caseId = filters.caseId;
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.latestOnly) query.isLatestVersion = true;

    // Apply role-based filtering
    switch (userRole) {
      case 'PATIENT':
        // Patients can only see measurements for their cases
        // This requires a join with cases, but for simplicity, we'll handle this at the controller level
        break;

      case 'ORTHOTIST':
        // Orthotists can only see measurements for their assigned cases
        // This also requires a join with cases
        break;

      case 'DOCTOR':
        if (!filters.caseId) {
          // If no specific case, show only measurements uploaded by this doctor
          query.uploadedBy = userId;
        }
        break;

      case 'HEAD_NURSE':
      case 'BRANCH_ADMIN':
      case 'SAAS_ADMIN':
        // Full access within their scope
        break;

      default:
        throw new Error('Invalid user role');
    }

    return query;
  }

  applyRoleBasedFiltering(measurement, userRole, userId) {
    const measurementObj = measurement.toObject ? measurement.toObject() : measurement;

    switch (userRole) {
      case 'PATIENT':
        // Patients can see basic measurement info but not technical details
        return {
          measurementId: measurementObj.measurementId,
          caseId: measurementObj.caseId,
          type: measurementObj.type,
          status: measurementObj.status,
          description: measurementObj.description,
          version: measurementObj.version,
          isLatestVersion: measurementObj.isLatestVersion,
          createdAt: measurementObj.createdAt,
          reviewedAt: measurementObj.reviewedAt
        };

      case 'ORTHOTIST':
        // Orthotists can see most details but not audit logs
        delete measurementObj.auditLog;
        return measurementObj;

      case 'HEAD_NURSE':
      case 'BRANCH_ADMIN':
        // Monitoring roles can see most information
        delete measurementObj.auditLog;
        return measurementObj;

      case 'DOCTOR':
      case 'SAAS_ADMIN':
        // Full access
        return measurementObj;

      default:
        throw new Error('Invalid user role');
    }
  }

  async getMeasurementStatistics(tenantId, branchId, userRole, userId) {
    try {
      const matchStage = { tenantId };
      
      if (branchId && userRole !== 'SAAS_ADMIN') {
        matchStage.branchId = branchId;
      }

      // Apply role-based filtering
      if (userRole === 'DOCTOR') {
        matchStage.uploadedBy = userId;
      }

      const stats = await Measurement.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalMeasurements: { $sum: 1 },
            statusBreakdown: {
              $push: '$status'
            },
            typeBreakdown: {
              $push: '$type'
            },
            avgFileSize: { $avg: '$fileSize' },
            totalFileSize: { $sum: '$fileSize' },
            pendingReviews: {
              $sum: {
                $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0]
              }
            }
          }
        }
      ]);

      if (!stats.length) {
        return {
          totalMeasurements: 0,
          statusBreakdown: {},
          typeBreakdown: {},
          avgFileSize: 0,
          totalFileSize: 0,
          pendingReviews: 0
        };
      }

      const result = stats[0];
      
      // Process breakdowns
      result.statusBreakdown = this.processBreakdown(result.statusBreakdown);
      result.typeBreakdown = this.processBreakdown(result.typeBreakdown);
      result.avgFileSize = Math.round(result.avgFileSize || 0);

      delete result._id;
      return result;
    } catch (error) {
      logger.error('Error getting measurement statistics:', error);
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

module.exports = MeasurementService;