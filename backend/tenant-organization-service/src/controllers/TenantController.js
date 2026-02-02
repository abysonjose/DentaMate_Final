const TenantService = require('../services/TenantService');
const { validateTenantCreation, validateTenantUpdate } = require('../validators/tenantValidator');
const logger = require('../utils/logger');

class TenantController {
  constructor() {
    this.tenantService = new TenantService();
  }

  async createTenant(req, res) {
    try {
      const { error, value } = validateTenantCreation(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const createdBy = req.user?.userId || 'system';
      const tenant = await this.tenantService.createTenant(value, createdBy);

      res.status(201).json({
        success: true,
        message: 'Tenant created successfully',
        data: tenant
      });

    } catch (error) {
      logger.error('Create tenant error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create tenant',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getTenant(req, res) {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const tenant = await this.tenantService.getTenant(tenantId);

      res.json({
        success: true,
        data: tenant
      });

    } catch (error) {
      logger.error('Get tenant error:', error);
      
      if (error.message === 'Tenant not found') {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get tenant',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async updateTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const { error, value } = validateTenantUpdate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const updatedBy = req.user?.userId || 'system';
      const tenant = await this.tenantService.updateTenant(tenantId, value, updatedBy);

      res.json({
        success: true,
        message: 'Tenant updated successfully',
        data: tenant
      });

    } catch (error) {
      logger.error('Update tenant error:', error);
      
      if (error.message === 'Tenant not found') {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update tenant',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async activateTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const activatedBy = req.user?.userId || 'system';
      
      const tenant = await this.tenantService.activateTenant(tenantId, activatedBy);

      res.json({
        success: true,
        message: 'Tenant activated successfully',
        data: tenant
      });

    } catch (error) {
      logger.error('Activate tenant error:', error);
      
      if (error.message === 'Tenant not found') {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to activate tenant',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async suspendTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Suspension reason is required'
        });
      }

      const suspendedBy = req.user?.userId || 'system';
      const tenant = await this.tenantService.suspendTenant(tenantId, suspendedBy, reason);

      res.json({
        success: true,
        message: 'Tenant suspended successfully',
        data: tenant
      });

    } catch (error) {
      logger.error('Suspend tenant error:', error);
      
      if (error.message === 'Tenant not found') {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to suspend tenant',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Validate tenant for API Gateway (internal service call)
  async validateTenantForGateway(tenantId) {
    try {
      const tenant = await this.tenantService.getTenant(tenantId);
      
      if (!tenant) {
        return { valid: false, tenant: null };
      }

      // Check if tenant is active and subscription is valid
      const isValid = tenant.status === 'active' && 
                     tenant.subscription_status === 'active';

      return {
        valid: isValid,
        tenant: isValid ? {
          id: tenant._id,
          name: tenant.name,
          status: tenant.status,
          subscription_status: tenant.subscription_status
        } : null
      };
    } catch (error) {
      logger.error('Error validating tenant for gateway:', error);
      throw error;
    }
  }

  async validateTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const validation = await this.tenantService.validateTenant(tenantId);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Validate tenant error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate tenant',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getTenantsByStatus(req, res) {
    try {
      const { status } = req.params;
      const { limit = 50, skip = 0 } = req.query;

      const tenants = await this.tenantService.getTenantsByStatus(
        status, 
        parseInt(limit), 
        parseInt(skip)
      );

      res.json({
        success: true,
        data: tenants,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          count: tenants.length
        }
      });

    } catch (error) {
      logger.error('Get tenants by status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tenants',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async searchTenants(req, res) {
    try {
      const { q: searchQuery } = req.query;
      const { limit = 50, skip = 0 } = req.query;

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const tenants = await this.tenantService.searchTenants(
        searchQuery, 
        parseInt(limit), 
        parseInt(skip)
      );

      res.json({
        success: true,
        data: tenants,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          count: tenants.length
        }
      });

    } catch (error) {
      logger.error('Search tenants error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search tenants',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async getTenantConfiguration(req, res) {
    try {
      const { tenantId } = req.params;
      const configuration = await this.tenantService.getTenantConfiguration(tenantId);

      res.json({
        success: true,
        data: configuration
      });

    } catch (error) {
      logger.error('Get tenant configuration error:', error);
      
      if (error.message === 'Tenant not found') {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get tenant configuration',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async updateTenantConfiguration(req, res) {
    try {
      const { tenantId } = req.params;
      const configData = req.body;
      const updatedBy = req.user?.userId || 'system';

      const configuration = await this.tenantService.updateTenantConfiguration(
        tenantId, 
        configData, 
        updatedBy
      );

      res.json({
        success: true,
        message: 'Tenant configuration updated successfully',
        data: configuration
      });

    } catch (error) {
      logger.error('Update tenant configuration error:', error);
      
      if (error.message === 'Tenant not found') {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update tenant configuration',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  async recordLogin(req, res) {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.userId || req.body.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      await this.tenantService.recordLogin(tenantId, userId);

      res.json({
        success: true,
        message: 'Login recorded successfully'
      });

    } catch (error) {
      logger.error('Record login error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record login',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = TenantController;