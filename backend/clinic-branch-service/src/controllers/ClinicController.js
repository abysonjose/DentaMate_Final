const ClinicService = require('../services/ClinicService');
const CacheService = require('../services/CacheService');
const logger = require('../utils/logger');

class ClinicController {
  // Create a new clinic
  async createClinic(req, res) {
    try {
      const clinic = await ClinicService.createClinic(req.body, req.user.tenantId);

      // Clear cache
      await CacheService.invalidateClinic(clinic.clinicId);

      res.status(201).json({
        success: true,
        message: 'Clinic created successfully',
        data: clinic
      });
    } catch (error) {
      logger.error('Error in createClinic controller:', error);
      
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create clinic',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get clinic by ID
  async getClinicById(req, res) {
    try {
      const { id } = req.params;
      
      // Try cache first
      const cachedClinic = await CacheService.getCachedClinic(id);
      if (cachedClinic) {
        return res.json({
          success: true,
          data: cachedClinic
        });
      }

      const clinic = await ClinicService.getClinicById(id, req.user.tenantId, req.user.role);

      // Cache the result
      await CacheService.cacheClinic(id, clinic);

      res.json({
        success: true,
        data: clinic
      });
    } catch (error) {
      logger.error('Error in getClinicById controller:', error);
      
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve clinic'
      });
    }
  }

  // List clinics
  async listClinics(req, res) {
    try {
      const result = await ClinicService.listClinics(req.query, req.user.tenantId, req.user.role);

      res.json({
        success: true,
        data: result.clinics,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in listClinics controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve clinics'
      });
    }
  }

  // Update clinic
  async updateClinic(req, res) {
    try {
      const { id } = req.params;
      
      const clinic = await ClinicService.updateClinic(id, req.body, req.user.tenantId, req.user.role);

      // Clear cache
      await CacheService.invalidateClinic(id);

      res.json({
        success: true,
        message: 'Clinic updated successfully',
        data: clinic
      });
    } catch (error) {
      logger.error('Error in updateClinic controller:', error);
      
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update clinic'
      });
    }
  }

  // Delete clinic (soft delete)
  async deleteClinic(req, res) {
    try {
      const { id } = req.params;
      
      const clinic = await ClinicService.deleteClinic(id, req.user.tenantId, req.user.role);

      // Clear cache
      await CacheService.invalidateClinic(id);

      res.json({
        success: true,
        message: 'Clinic deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteClinic controller:', error);
      
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete clinic'
      });
    }
  }
}

module.exports = new ClinicController();