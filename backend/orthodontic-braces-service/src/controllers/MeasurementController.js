const MeasurementService = require('../services/MeasurementService');
const logger = require('../utils/logger');

class MeasurementController {
  constructor() {
    this.measurementService = new MeasurementService();
  }

  async uploadMeasurement(req, res) {
    try {
      const { caseId, type, description, metadata } = req.body;
      const { userId, tenantId, branchId, role } = req.user;
      const file = req.file;

      // Validate that only doctors can upload measurements
      if (role !== 'DOCTOR') {
        return res.status(403).json({
          success: false,
          message: 'Only doctors can upload measurements'
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'File is required'
        });
      }

      const measurementData = {
        caseId,
        type,
        description: description || '',
        tenantId,
        branchId,
        metadata: metadata ? JSON.parse(metadata) : {}
      };

      const measurement = await this.measurementService.uploadMeasurement(
        measurementData,
        file,
        userId
      );

      logger.info('Measurement uploaded successfully', {
        measurementId: measurement.measurementId,
        caseId,
        type,
        uploadedBy: userId
      });

      res.status(201).json({
        success: true,
        message: 'Measurement uploaded successfully',
        data: measurement
      });
    } catch (error) {
      logger.error('Error uploading measurement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload measurement',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getMeasurementById(req, res) {
    try {
      const { measurementId } = req.params;
      const { tenantId, role, userId } = req.user;

      const measurement = await this.measurementService.getMeasurementById(
        measurementId,
        tenantId,
        role,
        userId
      );

      res.json({
        success: true,
        data: measurement
      });
    } catch (error) {
      logger.error('Error getting measurement:', error);
      
      if (error.message === 'Measurement not found') {
        return res.status(404).json({
          success: false,
          message: 'Measurement not found'
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
        message: 'Failed to retrieve measurement',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getMeasurements(req, res) {
    try {
      const { role, userId, tenantId, branchId } = req.user;
      const filters = {
        ...req.query,
        tenantId,
        branchId: role === 'SAAS_ADMIN' ? req.query.branchId : branchId
      };

      const result = await this.measurementService.getMeasurements(filters, role, userId);

      res.json({
        success: true,
        data: result.measurements,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting measurements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve measurements',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getMeasurementsForCase(req, res) {
    try {
      const { caseId } = req.params;
      const { tenantId, role, userId } = req.user;

      const measurements = await this.measurementService.getMeasurementsForCase(
        caseId,
        tenantId,
        role,
        userId
      );

      res.json({
        success: true,
        data: measurements
      });
    } catch (error) {
      logger.error('Error getting measurements for case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve measurements for case',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async updateMeasurementStatus(req, res) {
    try {
      const { measurementId } = req.params;
      const { status, reviewNotes } = req.body;
      const { userId, tenantId, role } = req.user;

      // Only doctors can update measurement status
      if (role !== 'DOCTOR') {
        return res.status(403).json({
          success: false,
          message: 'Only doctors can update measurement status'
        });
      }

      const statusData = {
        status,
        reviewNotes: reviewNotes || ''
      };

      const measurement = await this.measurementService.updateMeasurementStatus(
        measurementId,
        statusData,
        userId,
        tenantId
      );

      logger.info('Measurement status updated successfully', {
        measurementId,
        status,
        reviewedBy: userId
      });

      res.json({
        success: true,
        message: 'Measurement status updated successfully',
        data: measurement
      });
    } catch (error) {
      logger.error('Error updating measurement status:', error);
      
      if (error.message === 'Measurement not found') {
        return res.status(404).json({
          success: false,
          message: 'Measurement not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update measurement status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getMeasurementHistory(req, res) {
    try {
      const { caseId } = req.params;
      const { type } = req.query;
      const { tenantId, role, userId } = req.user;

      if (!type) {
        return res.status(400).json({
          success: false,
          message: 'Measurement type is required'
        });
      }

      const history = await this.measurementService.getMeasurementHistory(
        caseId,
        type,
        tenantId
      );

      // Apply role-based filtering to each measurement in history
      const filteredHistory = history.map(measurement => 
        this.measurementService.applyRoleBasedFiltering(measurement, role, userId)
      );

      res.json({
        success: true,
        data: filteredHistory
      });
    } catch (error) {
      logger.error('Error getting measurement history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve measurement history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async deleteMeasurement(req, res) {
    try {
      const { measurementId } = req.params;
      const { userId, tenantId, role } = req.user;

      // Only doctors can delete measurements
      if (role !== 'DOCTOR') {
        return res.status(403).json({
          success: false,
          message: 'Only doctors can delete measurements'
        });
      }

      const result = await this.measurementService.deleteMeasurement(
        measurementId,
        userId,
        tenantId
      );

      logger.info('Measurement deleted successfully', {
        measurementId,
        deletedBy: userId
      });

      res.json({
        success: true,
        message: 'Measurement deleted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error deleting measurement:', error);
      
      if (error.message === 'Measurement not found') {
        return res.status(404).json({
          success: false,
          message: 'Measurement not found'
        });
      }

      if (error.message === 'Cannot delete approved measurement') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete approved measurement'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete measurement',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async generateSignedUrl(req, res) {
    try {
      const { measurementId } = req.params;
      const { tenantId, role, userId } = req.user;

      const result = await this.measurementService.generateSignedUrl(
        measurementId,
        tenantId,
        role,
        userId
      );

      logger.info('Signed URL generated successfully', {
        measurementId,
        userId,
        expiresAt: result.expiresAt
      });

      res.json({
        success: true,
        message: 'Signed URL generated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      
      if (error.message === 'Measurement not found') {
        return res.status(404).json({
          success: false,
          message: 'Measurement not found'
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
        message: 'Failed to generate signed URL',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getMeasurementStatistics(req, res) {
    try {
      const { tenantId, branchId, role, userId } = req.user;
      const targetBranchId = role === 'SAAS_ADMIN' ? req.query.branchId : branchId;

      const statistics = await this.measurementService.getMeasurementStatistics(
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
      logger.error('Error getting measurement statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve measurement statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async downloadMeasurement(req, res) {
    try {
      const { measurementId } = req.params;
      const { tenantId, role, userId } = req.user;

      // Get measurement details first
      const measurement = await this.measurementService.getMeasurementById(
        measurementId,
        tenantId,
        role,
        userId
      );

      // Generate signed URL for download
      const result = await this.measurementService.generateSignedUrl(
        measurementId,
        tenantId,
        role,
        userId
      );

      // Set appropriate headers for download
      res.set({
        'Content-Disposition': `attachment; filename="${measurement.originalFileName}"`,
        'Content-Type': measurement.mimeType
      });

      // Redirect to signed URL
      res.redirect(result.signedUrl);

      logger.info('Measurement download initiated', {
        measurementId,
        userId,
        fileName: measurement.originalFileName
      });
    } catch (error) {
      logger.error('Error downloading measurement:', error);
      
      if (error.message === 'Measurement not found') {
        return res.status(404).json({
          success: false,
          message: 'Measurement not found'
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
        message: 'Failed to download measurement',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async replaceMeasurement(req, res) {
    try {
      const { measurementId } = req.params;
      const { description, metadata } = req.body;
      const { userId, tenantId, role } = req.user;
      const file = req.file;

      // Only doctors can replace measurements
      if (role !== 'DOCTOR') {
        return res.status(403).json({
          success: false,
          message: 'Only doctors can replace measurements'
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'File is required'
        });
      }

      // Get original measurement
      const originalMeasurement = await this.measurementService.getMeasurementById(
        measurementId,
        tenantId,
        role,
        userId
      );

      // Create new measurement with incremented version
      const measurementData = {
        caseId: originalMeasurement.caseId,
        type: originalMeasurement.type,
        description: description || originalMeasurement.description,
        tenantId,
        branchId: originalMeasurement.branchId,
        metadata: metadata ? JSON.parse(metadata) : originalMeasurement.metadata,
        previousVersionId: measurementId
      };

      const newMeasurement = await this.measurementService.uploadMeasurement(
        measurementData,
        file,
        userId
      );

      logger.info('Measurement replaced successfully', {
        originalMeasurementId: measurementId,
        newMeasurementId: newMeasurement.measurementId,
        caseId: originalMeasurement.caseId,
        replacedBy: userId
      });

      res.status(201).json({
        success: true,
        message: 'Measurement replaced successfully',
        data: newMeasurement
      });
    } catch (error) {
      logger.error('Error replacing measurement:', error);
      
      if (error.message === 'Measurement not found') {
        return res.status(404).json({
          success: false,
          message: 'Original measurement not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to replace measurement',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = MeasurementController;