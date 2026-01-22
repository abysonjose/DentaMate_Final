const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const TenantAuditLog = require('../models/TenantAuditLog');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class TenantService {
  constructor() {
    this.cacheService = new CacheService();
  }

  async createTenant(tenantData, createdBy) {
    try {
      // Check if tenant with same email already exists
      const existingTenant = await Tenant.findOne({ 'owner.email': tenantData.owner.email });
      if (existingTenant) {
        throw new Error('Tenant with this email already exists');
      }

      // Create tenant
      const tenant = new Tenant({
        ...tenantData,
        auditInfo: {
          createdBy,
          createdAt: new Date()
        }
      });

      await tenant.save();

      // Create default main branch if provided
      if (tenantData.mainBranch) {
        await this.createBranch(tenant.tenantId, {
          ...tenantData.mainBranch,
          branchType: 'MAIN',
          branchCode: 'MAIN'
        }, createdBy);
      }

      // Log audit
      await TenantAuditLog.logAction({
        tenantId: tenant.tenantId,
        action: 'TENANT_CREATED',
        entityType: 'TENANT',
        entityId: tenant.tenantId,
        performedBy: {
          userId: createdBy,
          userEmail: tenantData.owner.email,
          userName: tenantData.owner.name
        },
        changes: {
          after: tenant.toPublicJSON()
        },
        severity: 'MEDIUM'
      });

      logger.info(`Tenant created successfully: ${tenant.tenantId}`);
      return tenant.toPublicJSON();

    } catch (error) {
      logger.error('Error creating tenant:', error);
      throw error;
    }
  }

  async getTenant(tenantId) {
    try {
      // Try cache first
      const cached = await this.cacheService.get(`tenant:${tenantId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const tenantData = tenant.toPublicJSON();
      
      // Cache for 1 hour
      await this.cacheService.set(`tenant:${tenantId}`, tenantData, 3600);
      
      return tenantData;

    } catch (error) {
      logger.error('Error getting tenant:', error);
      throw error;
    }
  }

  async updateTenant(tenantId, updateData, updatedBy) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const beforeData = tenant.toPublicJSON();
      
      // Update tenant
      Object.assign(tenant, updateData);
      tenant.auditInfo.updatedBy = updatedBy;
      tenant.auditInfo.updatedAt = new Date();

      await tenant.save();

      // Clear cache
      await this.cacheService.del(`tenant:${tenantId}`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId,
        action: 'TENANT_UPDATED',
        entityType: 'TENANT',
        entityId: tenantId,
        performedBy: {
          userId: updatedBy
        },
        changes: {
          before: beforeData,
          after: tenant.toPublicJSON(),
          fields: Object.keys(updateData)
        },
        severity: 'MEDIUM'
      });

      logger.info(`Tenant updated successfully: ${tenantId}`);
      return tenant.toPublicJSON();

    } catch (error) {
      logger.error('Error updating tenant:', error);
      throw error;
    }
  }

  async activateTenant(tenantId, activatedBy) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      await tenant.activate(activatedBy);
      
      // Clear cache
      await this.cacheService.del(`tenant:${tenantId}`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId,
        action: 'TENANT_ACTIVATED',
        entityType: 'TENANT',
        entityId: tenantId,
        performedBy: {
          userId: activatedBy
        },
        severity: 'HIGH'
      });

      logger.info(`Tenant activated successfully: ${tenantId}`);
      return tenant.toPublicJSON();

    } catch (error) {
      logger.error('Error activating tenant:', error);
      throw error;
    }
  }

  async suspendTenant(tenantId, suspendedBy, reason) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      await tenant.suspend(suspendedBy, reason);
      
      // Clear cache
      await this.cacheService.del(`tenant:${tenantId}`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId,
        action: 'TENANT_SUSPENDED',
        entityType: 'TENANT',
        entityId: tenantId,
        performedBy: {
          userId: suspendedBy
        },
        changes: {
          after: { reason }
        },
        severity: 'CRITICAL'
      });

      logger.warn(`Tenant suspended: ${tenantId}, Reason: ${reason}`);
      return tenant.toPublicJSON();

    } catch (error) {
      logger.error('Error suspending tenant:', error);
      throw error;
    }
  }

  async validateTenant(tenantId) {
    try {
      const tenant = await this.getTenant(tenantId);
      
      return {
        isValid: tenant.isActive,
        status: tenant.status,
        tenantId: tenant.tenantId,
        organizationName: tenant.organizationName
      };

    } catch (error) {
      return {
        isValid: false,
        status: 'NOT_FOUND',
        tenantId,
        error: error.message
      };
    }
  }

  async getTenantsByStatus(status, limit = 50, skip = 0) {
    try {
      const tenants = await Tenant.find({ status })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return tenants.map(tenant => {
        delete tenant._id;
        delete tenant.__v;
        return tenant;
      });

    } catch (error) {
      logger.error('Error getting tenants by status:', error);
      throw error;
    }
  }

  async searchTenants(searchQuery, limit = 50, skip = 0) {
    try {
      const query = {
        $or: [
          { organizationName: { $regex: searchQuery, $options: 'i' } },
          { 'owner.name': { $regex: searchQuery, $options: 'i' } },
          { 'owner.email': { $regex: searchQuery, $options: 'i' } },
          { tenantId: { $regex: searchQuery, $options: 'i' } }
        ]
      };

      const tenants = await Tenant.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return tenants.map(tenant => {
        delete tenant._id;
        delete tenant.__v;
        return tenant;
      });

    } catch (error) {
      logger.error('Error searching tenants:', error);
      throw error;
    }
  }

  async updateTenantConfiguration(tenantId, configData, updatedBy) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const beforeConfig = tenant.configuration;
      
      // Update configuration
      Object.assign(tenant.configuration, configData);
      tenant.auditInfo.updatedBy = updatedBy;
      tenant.auditInfo.updatedAt = new Date();

      await tenant.save();

      // Clear cache
      await this.cacheService.del(`tenant:${tenantId}`);

      // Log audit
      await TenantAuditLog.logAction({
        tenantId,
        action: 'CONFIG_UPDATED',
        entityType: 'CONFIG',
        entityId: tenantId,
        performedBy: {
          userId: updatedBy
        },
        changes: {
          before: beforeConfig,
          after: tenant.configuration,
          fields: Object.keys(configData)
        },
        severity: 'MEDIUM'
      });

      logger.info(`Tenant configuration updated: ${tenantId}`);
      return tenant.configuration;

    } catch (error) {
      logger.error('Error updating tenant configuration:', error);
      throw error;
    }
  }

  async getTenantConfiguration(tenantId) {
    try {
      const tenant = await this.getTenant(tenantId);
      return tenant.configuration;
    } catch (error) {
      logger.error('Error getting tenant configuration:', error);
      throw error;
    }
  }

  async recordLogin(tenantId, userId) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (tenant) {
        await tenant.updateLastLogin();
        
        // Log audit
        await TenantAuditLog.logAction({
          tenantId,
          action: 'LOGIN_RECORDED',
          entityType: 'TENANT',
          entityId: tenantId,
          performedBy: {
            userId
          },
          severity: 'LOW'
        });
      }
    } catch (error) {
      logger.error('Error recording login:', error);
      // Don't throw error for login recording
    }
  }
}

module.exports = TenantService;