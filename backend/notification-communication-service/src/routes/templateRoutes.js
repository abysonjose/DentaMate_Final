const express = require('express');
const { authenticateToken, validateTenantAccess, validateServiceAccess } = require('../middleware/auth');
const { templateLimiter } = require('../middleware/rateLimiter');
const { validateTemplateCreate, validateUUID, validatePagination } = require('../middleware/validation');
const Template = require('../models/Template');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(validateTenantAccess);

/**
 * @route GET /api/templates
 * @desc Get templates for tenant
 * @access Private (Service-to-Service)
 */
router.get('/', 
  validatePagination,
  async (req, res) => {
    try {
      const options = {
        channel: req.query.channel,
        category: req.query.category,
        isSystem: req.query.isSystem === 'true' ? true : req.query.isSystem === 'false' ? false : undefined,
        limit: parseInt(req.query.limit) || 100
      };

      const templates = await Template.findByTenant(req.tenantId, options);

      res.json({
        success: true,
        data: templates,
        count: templates.length
      });

    } catch (error) {
      logger.error('Failed to get templates', {
        error: error.message,
        tenantId: req.tenantId,
        query: req.query
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get templates'
      });
    }
  }
);

/**
 * @route GET /api/templates/:code
 * @desc Get specific template by code
 * @access Private (Service-to-Service)
 */
router.get('/:code', async (req, res) => {
  try {
    const templateCode = req.params.code.toUpperCase();
    const template = await Template.findByCode(req.tenantId, templateCode);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    logger.error('Failed to get template', {
      templateCode: req.params.code,
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get template'
    });
  }
});

/**
 * @route POST /api/templates
 * @desc Create new template
 * @access Private (Service-to-Service with admin privileges)
 */
router.post('/',
  templateLimiter,
  validateServiceAccess(['tenant-organization-service', 'saas-admin-service']),
  validateTemplateCreate,
  async (req, res) => {
    try {
      // Check if template code already exists
      const existingTemplate = await Template.findOne({
        tenantId: req.tenantId,
        templateCode: req.body.templateCode.toUpperCase()
      });

      if (existingTemplate) {
        return res.status(409).json({
          success: false,
          message: 'Template with this code already exists'
        });
      }

      const templateData = {
        ...req.body,
        tenantId: req.tenantId,
        templateCode: req.body.templateCode.toUpperCase(),
        isSystem: false, // Tenant templates are never system templates
        allowTenantEdit: true
      };

      const template = new Template(templateData);
      await template.save();

      logger.info('Template created', {
        templateCode: template.templateCode,
        tenantId: req.tenantId,
        serviceId: req.serviceId
      });

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template
      });

    } catch (error) {
      logger.error('Failed to create template', {
        error: error.message,
        tenantId: req.tenantId,
        body: req.body
      });

      if (error.name === 'ValidationError') {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map(e => e.message)
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create template'
        });
      }
    }
  }
);

/**
 * @route PUT /api/templates/:code
 * @desc Update existing template
 * @access Private (Service-to-Service with admin privileges)
 */
router.put('/:code',
  templateLimiter,
  validateServiceAccess(['tenant-organization-service', 'saas-admin-service']),
  async (req, res) => {
    try {
      const templateCode = req.params.code.toUpperCase();
      const template = await Template.findOne({
        tenantId: req.tenantId,
        templateCode,
        isActive: true
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Check if template can be edited
      if (template.isSystem && !template.allowTenantEdit) {
        return res.status(403).json({
          success: false,
          message: 'System template cannot be modified'
        });
      }

      // Create new version instead of updating existing
      const updates = {
        ...req.body,
        templateCode: templateCode // Ensure code doesn't change
      };

      const [oldTemplate, newTemplate] = await template.createVersion(updates);

      logger.info('Template updated with new version', {
        templateCode,
        oldVersion: oldTemplate.version,
        newVersion: newTemplate.version,
        tenantId: req.tenantId
      });

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: newTemplate
      });

    } catch (error) {
      logger.error('Failed to update template', {
        templateCode: req.params.code,
        error: error.message,
        tenantId: req.tenantId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update template'
      });
    }
  }
);

/**
 * @route DELETE /api/templates/:code
 * @desc Deactivate template
 * @access Private (Service-to-Service with admin privileges)
 */
router.delete('/:code',
  validateServiceAccess(['tenant-organization-service', 'saas-admin-service']),
  async (req, res) => {
    try {
      const templateCode = req.params.code.toUpperCase();
      const template = await Template.findOne({
        tenantId: req.tenantId,
        templateCode,
        isActive: true
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Check if template can be deleted
      if (template.isSystem) {
        return res.status(403).json({
          success: false,
          message: 'System template cannot be deleted'
        });
      }

      // Deactivate instead of deleting
      template.isActive = false;
      await template.save();

      logger.info('Template deactivated', {
        templateCode,
        tenantId: req.tenantId,
        serviceId: req.serviceId
      });

      res.json({
        success: true,
        message: 'Template deactivated successfully'
      });

    } catch (error) {
      logger.error('Failed to deactivate template', {
        templateCode: req.params.code,
        error: error.message,
        tenantId: req.tenantId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to deactivate template'
      });
    }
  }
);

/**
 * @route POST /api/templates/:code/test
 * @desc Test template rendering
 * @access Private (Service-to-Service)
 */
router.post('/:code/test', async (req, res) => {
  try {
    const templateCode = req.params.code.toUpperCase();
    const template = await Template.findByCode(req.tenantId, templateCode);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const testVariables = req.body.variables || {};
    
    // Validate variables
    const validation = template.validateVariables(testVariables);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Variable validation failed',
        errors: validation.errors
      });
    }

    // Render template
    const rendered = template.renderContent(testVariables);

    res.json({
      success: true,
      data: {
        templateCode: template.templateCode,
        channel: template.channel,
        rendered,
        variables: testVariables,
        validation
      }
    });

  } catch (error) {
    logger.error('Failed to test template', {
      templateCode: req.params.code,
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to test template'
    });
  }
});

/**
 * @route GET /api/templates/stats/usage
 * @desc Get template usage statistics
 * @access Private (Service-to-Service)
 */
router.get('/stats/usage', async (req, res) => {
  try {
    const dateRange = {};
    if (req.query.startDate) dateRange.start = new Date(req.query.startDate);
    if (req.query.endDate) dateRange.end = new Date(req.query.endDate);

    const stats = await Template.getUsageStats(req.tenantId, dateRange);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get template usage stats', {
      error: error.message,
      tenantId: req.tenantId,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get template usage statistics'
    });
  }
});

/**
 * @route GET /api/templates/system
 * @desc Get system templates
 * @access Private (Service-to-Service)
 */
router.get('/system', async (req, res) => {
  try {
    const category = req.query.category;
    const templates = await Template.findSystemTemplates(category);

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });

  } catch (error) {
    logger.error('Failed to get system templates', {
      error: error.message,
      category: req.query.category
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get system templates'
    });
  }
});

module.exports = router;