const Clinic = require('../models/Clinic');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ClinicService {
  async createClinic(clinicData, tenantId) {
    try {
      const clinic = new Clinic({
        clinicId: uuidv4(),
        tenantId,
        ...clinicData
      });

      await clinic.save();
      logger.info(`Clinic created: ${clinic.clinicId} for tenant: ${tenantId}`);
      
      return clinic;
    } catch (error) {
      logger.error('Error creating clinic:', error);
      throw error;
    }
  }

  async getClinicById(clinicId, tenantId, userRole) {
    try {
      const query = { clinicId, deletedAt: null };
      
      // For non-SAAS_ADMIN users, filter by tenant
      if (userRole !== 'SAAS_ADMIN') {
        query.tenantId = tenantId;
      }

      const clinic = await Clinic.findOne(query);
      
      if (!clinic) {
        const error = new Error('Clinic not found');
        error.statusCode = 404;
        throw error;
      }

      return clinic;
    } catch (error) {
      logger.error('Error getting clinic by ID:', error);
      throw error;
    }
  }

  async listClinics(filters, tenantId, userRole) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const query = { deletedAt: null };
      
      // For non-SAAS_ADMIN users, filter by tenant
      if (userRole !== 'SAAS_ADMIN') {
        query.tenantId = tenantId;
      }

      if (status) {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { 'contactInfo.email': { $regex: search, $options: 'i' } }
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const [clinics, total] = await Promise.all([
        Clinic.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        Clinic.countDocuments(query)
      ]);

      return {
        clinics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error listing clinics:', error);
      throw error;
    }
  }

  async updateClinic(clinicId, updateData, tenantId, userRole) {
    try {
      const query = { clinicId, deletedAt: null };
      
      // For non-SAAS_ADMIN users, filter by tenant
      if (userRole !== 'SAAS_ADMIN') {
        query.tenantId = tenantId;
      }

      const clinic = await Clinic.findOneAndUpdate(
        query,
        { 
          ...updateData,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!clinic) {
        const error = new Error('Clinic not found');
        error.statusCode = 404;
        throw error;
      }

      logger.info(`Clinic updated: ${clinicId}`);
      return clinic;
    } catch (error) {
      logger.error('Error updating clinic:', error);
      throw error;
    }
  }

  async deleteClinic(clinicId, tenantId, userRole) {
    try {
      const query = { clinicId, deletedAt: null };
      
      // For non-SAAS_ADMIN users, filter by tenant
      if (userRole !== 'SAAS_ADMIN') {
        query.tenantId = tenantId;
      }

      const clinic = await Clinic.findOneAndUpdate(
        query,
        { 
          deletedAt: new Date(),
          status: 'INACTIVE'
        },
        { new: true }
      );

      if (!clinic) {
        const error = new Error('Clinic not found');
        error.statusCode = 404;
        throw error;
      }

      logger.info(`Clinic soft deleted: ${clinicId}`);
      return clinic;
    } catch (error) {
      logger.error('Error deleting clinic:', error);
      throw error;
    }
  }

  async getClinicsByTenant(tenantId) {
    try {
      const clinics = await Clinic.find({
        tenantId,
        deletedAt: null,
        status: 'ACTIVE'
      }).select('clinicId name status');

      return clinics;
    } catch (error) {
      logger.error('Error getting clinics by tenant:', error);
      throw error;
    }
  }
}

module.exports = new ClinicService();