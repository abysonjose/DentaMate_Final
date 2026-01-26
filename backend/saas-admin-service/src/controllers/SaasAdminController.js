const LicenseService = require('../services/LicenseService');
const SubscriptionPlanService = require('../services/SubscriptionPlanService');
const SaasAnalyticsService = require('../services/SaasAnalyticsService');
const SaasAuditLog = require('../models/SaasAuditLog');
const logger = require('../utils/logger');

class SaasAdminController {
  constructor() {
    this.licenseService = new LicenseService();
    this.planService = new SubscriptionPlanService();
    this.analyticsService = new SaasAnalyticsService();
  }

  // Dashboard & Analytics
  async getDashboardOverview(req, res) {
    try {
      const { period = '30d' } = req.query;
      const overview = await this.analyticsService.getPlatformOverview(period);
      
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      logger.error('Dashboard overview error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getUsageAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      const analytics = await this.analyticsService.getUsageAnalytics(period);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Usage analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getRevenueAnalytics(req, res) {
    try {
      const { period = '12m' } = req.query;
      const analytics = await this.analyticsService.getRevenueAnalytics(period);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Revenue analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCustomerAnalytics(req, res) {
    try {
      const analytics = await this.analyticsService.getCustomerAnalytics();
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Customer analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // License Management
  async issueLicense(req, res) {
    try {
      const { tenantId, planId, ...options } = req.body;
      const issuedBy = req.user.userId;

      if (!tenantId || !planId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID and Plan ID are required'
        });
      }

      const license = await this.licenseService.issueLicense(tenantId, planId, issuedBy, options);
      
      res.status(201).json({
        success: true,
        message: 'License issued successfully',
        data: license
      });
    } catch (error) {
      logger.error('Issue license error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async renewLicense(req, res) {
    try {
      const { licenseId } = req.params;
      const { ...options } = req.body;
      const renewedBy = req.user.userId;

      const license = await this.licenseService.renewLicense(licenseId, renewedBy, options);
      
      res.json({
        success: true,
        message: 'License renewed successfully',
        data: license
      });
    } catch (error) {
      logger.error('Renew license error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async suspendLicense(req, res) {
    try {
      const { licenseId } = req.params;
      const { reason } = req.body;
      const suspendedBy = req.user.userId;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Suspension reason is required'
        });
      }

      const license = await this.licenseService.suspendLicense(licenseId, suspendedBy, reason);
      
      res.json({
        success: true,
        message: 'License suspended successfully',
        data: license
      });
    } catch (error) {
      logger.error('Suspend license error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async revokeLicense(req, res) {
    try {
      const { licenseId } = req.params;
      const { reason } = req.body;
      const revokedBy = req.user.userId;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Revocation reason is required'
        });
      }

      const license = await this.licenseService.revokeLicense(licenseId, revokedBy, reason);
      
      res.json({
        success: true,
        message: 'License revoked successfully',
        data: license
      });
    } catch (error) {
      logger.error('Revoke license error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAllLicenses(req, res) {
    try {
      const { status, tenantId, planId, expiringInDays, page, limit } = req.query;
      
      const filters = {};
      if (status) filters.status = status;
      if (tenantId) filters.tenantId = tenantId;
      if (planId) filters.planId = planId;
      if (expiringInDays) filters.expiringInDays = parseInt(expiringInDays);

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50
      };

      const result = await this.licenseService.getAllLicenses(filters, pagination);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get licenses error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getExpiringLicenses(req, res) {
    try {
      const { days = 30 } = req.query;
      const licenses = await this.licenseService.getExpiringLicenses(parseInt(days));
      
      res.json({
        success: true,
        data: licenses
      });
    } catch (error) {
      logger.error('Get expiring licenses error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Subscription Plan Management
  async createSubscriptionPlan(req, res) {
    try {
      const planData = req.body;
      const createdBy = req.user.userId;

      const plan = await this.planService.createPlan(planData, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Subscription plan created successfully',
        data: plan
      });
    } catch (error) {
      logger.error('Create plan error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateSubscriptionPlan(req, res) {
    try {
      const { planId } = req.params;
      const updateData = req.body;
      const updatedBy = req.user.userId;

      const plan = await this.planService.updatePlan(planId, updateData, updatedBy);
      
      res.json({
        success: true,
        message: 'Subscription plan updated successfully',
        data: plan
      });
    } catch (error) {
      logger.error('Update plan error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async deprecateSubscriptionPlan(req, res) {
    try {
      const { planId } = req.params;
      const { reason } = req.body;
      const deprecatedBy = req.user.userId;

      const plan = await this.planService.deprecatePlan(planId, deprecatedBy, reason);
      
      res.json({
        success: true,
        message: 'Subscription plan deprecated successfully',
        data: plan
      });
    } catch (error) {
      logger.error('Deprecate plan error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAllSubscriptionPlans(req, res) {
    try {
      const { includeInactive = false } = req.query;
      const plans = await this.planService.getAllPlans(includeInactive === 'true');
      
      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      logger.error('Get plans error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getSubscriptionPlan(req, res) {
    try {
      const { planId } = req.params;
      const plan = await this.planService.getPlanById(planId);
      
      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      logger.error('Get plan error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createCustomPlan(req, res) {
    try {
      const { basePlanId, customizations, tenantId } = req.body;
      const createdBy = req.user.userId;

      if (!basePlanId || !tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Base plan ID and tenant ID are required'
        });
      }

      const plan = await this.planService.createCustomPlan(basePlanId, customizations, createdBy, tenantId);
      
      res.status(201).json({
        success: true,
        message: 'Custom subscription plan created successfully',
        data: plan
      });
    } catch (error) {
      logger.error('Create custom plan error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getPlanUsageStats(req, res) {
    try {
      const stats = await this.planService.getPlanUsageStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get plan usage stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Audit Logs
  async getAuditLogs(req, res) {
    try {
      const { 
        action, 
        entityType, 
        tenantId, 
        severity, 
        days = 30, 
        page = 1, 
        limit = 50 
      } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const query = {
        timestamp: { $gte: startDate }
      };

      if (action) query.action = action;
      if (entityType) query.entityType = entityType;
      if (tenantId) query.tenantId = tenantId;
      if (severity) query['impact.severity'] = severity;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [logs, total] = await Promise.all([
        SaasAuditLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        SaasAuditLog.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          logs: logs.map(log => {
            delete log._id;
            delete log.__v;
            return log;
          }),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getSystemWideActions(req, res) {
    try {
      const { days = 30 } = req.query;
      const actions = await SaasAuditLog.getSystemWideActions(parseInt(days));
      
      res.json({
        success: true,
        data: actions.map(action => action.toPublicJSON())
      });
    } catch (error) {
      logger.error('Get system-wide actions error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCriticalActions(req, res) {
    try {
      const { days = 7 } = req.query;
      const actions = await SaasAuditLog.getCriticalActions(parseInt(days));
      
      res.json({
        success: true,
        data: actions.map(action => action.toPublicJSON())
      });
    } catch (error) {
      logger.error('Get critical actions error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = SaasAdminController;