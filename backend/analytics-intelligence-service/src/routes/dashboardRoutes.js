const express = require('express');
const router = express.Router();
const DashboardService = require('../services/DashboardService');
const { 
  authenticateToken, 
  validateAnalyticsAccess, 
  validateDataScope,
  validateTenantAccess,
  validateBranchAccess 
} = require('../middleware/auth');
const { 
  validateDashboardRequest,
  validateTenantId,
  validateBranchId 
} = require('../middleware/validation');
const logger = require('../utils/logger');

const dashboardService = new DashboardService();

// Get dashboard for role
router.get('/:role', 
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  validateDashboardRequest,
  async (req, res) => {
    try {
      const { role } = req.params;
      const { 
        dashboardType = 'OPERATIONAL',
        branchId,
        refresh = false 
      } = req.query;

      // Validate role access
      if (req.role !== role && req.role !== 'SAAS_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot access dashboard for different role'
        });
      }

      // Validate branch access if specified
      if (branchId && req.dataScope.level === 'BRANCH' && !req.dataScope.branchIds.includes(branchId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Branch not accessible'
        });
      }

      const result = await dashboardService.getDashboard(req.tenantId, role, {
        dashboardType,
        branchId: branchId || req.branchId,
        refresh: refresh === 'true',
        customFilters: req.query.filters ? JSON.parse(req.query.filters) : {}
      });

      logger.info('Dashboard retrieved successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        role,
        dashboardType,
        branchId,
        category: 'dashboard'
      });

      res.json(result);

    } catch (error) {
      logger.error('Error retrieving dashboard', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        role: req.params.role,
        category: 'dashboard'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get dashboard by ID
router.get('/config/:dashboardId',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const { dashboardId } = req.params;

      const DashboardConfig = require('../models/DashboardConfig');
      const dashboard = await DashboardConfig.findOne({
        _id: dashboardId,
        tenantId: req.tenantId,
        isActive: true
      });

      if (!dashboard) {
        return res.status(404).json({
          success: false,
          message: 'Dashboard not found'
        });
      }

      // Check role access
      if (dashboard.role !== req.role && req.role !== 'SAAS_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Dashboard not accessible for your role'
        });
      }

      res.json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      logger.error('Error retrieving dashboard config', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        dashboardId: req.params.dashboardId,
        category: 'dashboard'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard configuration'
      });
    }
  }
);

// Get available dashboards for user
router.get('/list/:role',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const { role } = req.params;
      const { dashboardType } = req.query;

      // Validate role access
      if (req.role !== role && req.role !== 'SAAS_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot list dashboards for different role'
        });
      }

      const DashboardConfig = require('../models/DashboardConfig');
      const dashboards = await DashboardConfig.findByTenantAndRole(req.tenantId, role, {
        dashboardType
      });

      res.json({
        success: true,
        data: dashboards.map(dashboard => ({
          id: dashboard._id,
          name: dashboard.name,
          description: dashboard.description,
          dashboardType: dashboard.dashboardType,
          isDefault: dashboard.isDefault,
          widgetCount: dashboard.widgetCount,
          lastViewed: dashboard.metadata.usage?.lastViewed,
          viewCount: dashboard.metadata.usage?.viewCount || 0
        }))
      });

    } catch (error) {
      logger.error('Error listing dashboards', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        role: req.params.role,
        category: 'dashboard'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to list dashboards'
      });
    }
  }
);

// Create custom dashboard
router.post('/create',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const {
        name,
        description,
        dashboardType,
        widgets,
        layout,
        filters,
        settings
      } = req.body;

      const DashboardConfig = require('../models/DashboardConfig');
      
      const dashboard = new DashboardConfig({
        tenantId: req.tenantId,
        role: req.role,
        dashboardType,
        name,
        description,
        layout,
        widgets,
        filters,
        settings,
        metadata: {
          createdBy: {
            userId: req.userId,
            name: req.user.name,
            role: req.role
          },
          version: 1,
          usage: {
            viewCount: 0,
            errorCount: 0
          }
        }
      });

      await dashboard.save();

      logger.info('Dashboard created successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        dashboardId: dashboard._id,
        name,
        category: 'dashboard'
      });

      res.status(201).json({
        success: true,
        data: {
          id: dashboard._id,
          name: dashboard.name,
          dashboardType: dashboard.dashboardType
        }
      });

    } catch (error) {
      logger.error('Error creating dashboard', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        category: 'dashboard'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create dashboard'
      });
    }
  }
);

// Update dashboard
router.put('/config/:dashboardId',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const { dashboardId } = req.params;
      const updates = req.body;

      const DashboardConfig = require('../models/DashboardConfig');
      const dashboard = await DashboardConfig.findOne({
        _id: dashboardId,
        tenantId: req.tenantId,
        isActive: true
      });

      if (!dashboard) {
        return res.status(404).json({
          success: false,
          message: 'Dashboard not found'
        });
      }

      // Check permissions
      if (dashboard.role !== req.role && req.role !== 'SAAS_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot modify dashboard for different role'
        });
      }

      // Update dashboard
      Object.assign(dashboard, updates);
      dashboard.metadata.lastModifiedBy = {
        userId: req.userId,
        name: req.user.name,
        role: req.role
      };
      dashboard.metadata.version += 1;

      await dashboard.save();

      logger.info('Dashboard updated successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        dashboardId,
        category: 'dashboard'
      });

      res.json({
        success: true,
        data: {
          id: dashboard._id,
          version: dashboard.metadata.version
        }
      });

    } catch (error) {
      logger.error('Error updating dashboard', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        dashboardId: req.params.dashboardId,
        category: 'dashboard'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update dashboard'
      });
    }
  }
);

// Delete dashboard
router.delete('/config/:dashboardId',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const { dashboardId } = req.params;

      const DashboardConfig = require('../models/DashboardConfig');
      const dashboard = await DashboardConfig.findOne({
        _id: dashboardId,
        tenantId: req.tenantId,
        isActive: true
      });

      if (!dashboard) {
        return res.status(404).json({
          success: false,
          message: 'Dashboard not found'
        });
      }

      // Check permissions
      if (dashboard.role !== req.role && req.role !== 'SAAS_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot delete dashboard for different role'
        });
      }

      // Prevent deletion of default dashboards
      if (dashboard.isDefault || dashboard.isSystem) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete default or system dashboards'
        });
      }

      dashboard.isActive = false;
      await dashboard.save();

      logger.info('Dashboard deleted successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        dashboardId,
        category: 'dashboard'
      });

      res.json({
        success: true,
        message: 'Dashboard deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting dashboard', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        dashboardId: req.params.dashboardId,
        category: 'dashboard'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete dashboard'
      });
    }
  }
);

// Clone dashboard
router.post('/config/:dashboardId/clone',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const { dashboardId } = req.params;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Dashboard name is required'
        });
      }

      const DashboardConfig = require('../models/DashboardConfig');
      const dashboard = await DashboardConfig.findOne({
        _id: dashboardId,
        tenantId: req.tenantId,
        isActive: true
      });

      if (!dashboard) {
        return res.status(404).json({
          success: false,
          message: 'Dashboard not found'
        });
      }

      // Check permissions
      if (dashboard.role !== req.role && req.role !== 'SAAS_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot clone dashboard for different role'
        });
      }

      const clonedDashboard = await dashboard.clone(
        name,
        req.userId,
        req.user.name,
        req.role
      );

      logger.info('Dashboard cloned successfully', {
        tenantId: req.tenantId,
        userId: req.userId,
        originalDashboardId: dashboardId,
        clonedDashboardId: clonedDashboard._id,
        category: 'dashboard'
      });

      res.status(201).json({
        success: true,
        data: {
          id: clonedDashboard._id,
          name: clonedDashboard.name
        }
      });

    } catch (error) {
      logger.error('Error cloning dashboard', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        dashboardId: req.params.dashboardId,
        category: 'dashboard'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to clone dashboard'
      });
    }
  }
);

// Get dashboard usage statistics
router.get('/stats/usage',
  authenticateToken,
  validateAnalyticsAccess,
  validateDataScope,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const DashboardConfig = require('../models/DashboardConfig');
      const stats = await DashboardConfig.getDashboardUsageStats(req.tenantId, {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined
      });

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error fetching dashboard usage stats', {
        error: error.message,
        tenantId: req.tenantId,
        userId: req.userId,
        category: 'dashboard'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard usage statistics'
      });
    }
  }
);

module.exports = router;