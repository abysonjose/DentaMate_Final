const express = require('express');
const { authenticateToken, validateTenantAccess } = require('../middleware/auth');
const { validatePreferencesUpdate, validateUUID } = require('../middleware/validation');
const NotificationPreference = require('../models/NotificationPreference');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(validateTenantAccess);

/**
 * @route GET /api/preferences/:userId
 * @desc Get notification preferences for a user
 * @access Private (Service-to-Service)
 */
router.get('/:userId',
  validateUUID,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      let preferences = await NotificationPreference.findByUser(req.tenantId, userId);
      
      if (!preferences) {
        // Create default preferences if none exist
        const userType = req.query.userType || 'PATIENT';
        preferences = await NotificationPreference.createDefault(
          req.tenantId, 
          userId, 
          userType,
          { branchId: req.branchId }
        );
        
        logger.info('Default notification preferences created', {
          userId,
          userType,
          tenantId: req.tenantId
        });
      }

      res.json({
        success: true,
        data: preferences
      });

    } catch (error) {
      logger.error('Failed to get notification preferences', {
        userId: req.params.userId,
        error: error.message,
        tenantId: req.tenantId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences'
      });
    }
  }
);

/**
 * @route PUT /api/preferences/:userId
 * @desc Update notification preferences for a user
 * @access Private (Service-to-Service)
 */
router.put('/:userId',
  validateUUID,
  validatePreferencesUpdate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { preferences } = req.body;

      let userPreferences = await NotificationPreference.findByUser(req.tenantId, userId);
      
      if (!userPreferences) {
        // Create new preferences if none exist
        const userType = req.body.userType || 'PATIENT';
        userPreferences = new NotificationPreference({
          tenantId: req.tenantId,
          userId,
          userType,
          branchId: req.branchId,
          ...preferences,
          metadata: {
            lastUpdatedBy: req.serviceId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            source: 'SERVICE'
          }
        });
      } else {
        // Update existing preferences
        Object.assign(userPreferences, preferences);
        userPreferences.metadata = {
          ...userPreferences.metadata,
          lastUpdatedBy: req.serviceId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          source: 'SERVICE'
        };
      }

      await userPreferences.save();

      logger.info('Notification preferences updated', {
        userId,
        tenantId: req.tenantId,
        serviceId: req.serviceId
      });

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: userPreferences
      });

    } catch (error) {
      logger.error('Failed to update notification preferences', {
        userId: req.params.userId,
        error: error.message,
        tenantId: req.tenantId
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
          message: 'Failed to update notification preferences'
        });
      }
    }
  }
);

/**
 * @route POST /api/preferences/:userId/channels/:channel/verify
 * @desc Verify a communication channel for a user
 * @access Private (Service-to-Service)
 */
router.post('/:userId/channels/:channel/verify',
  validateUUID,
  async (req, res) => {
    try {
      const { userId, channel } = req.params;
      const { verified = true } = req.body;

      const preferences = await NotificationPreference.findByUser(req.tenantId, userId);
      
      if (!preferences) {
        return res.status(404).json({
          success: false,
          message: 'User preferences not found'
        });
      }

      if (!['SMS', 'EMAIL', 'WHATSAPP'].includes(channel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid channel for verification'
        });
      }

      await preferences.updateChannelVerification(channel, verified);

      logger.info('Channel verification updated', {
        userId,
        channel,
        verified,
        tenantId: req.tenantId
      });

      res.json({
        success: true,
        message: `${channel} verification ${verified ? 'confirmed' : 'removed'}`,
        data: {
          channel,
          verified,
          verifiedAt: verified ? new Date() : null
        }
      });

    } catch (error) {
      logger.error('Failed to update channel verification', {
        userId: req.params.userId,
        channel: req.params.channel,
        error: error.message,
        tenantId: req.tenantId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update channel verification'
      });
    }
  }
);

/**
 * @route POST /api/preferences/:userId/channels/:channel/opt-in
 * @desc Opt user into a communication channel
 * @access Private (Service-to-Service)
 */
router.post('/:userId/channels/:channel/opt-in',
  validateUUID,
  async (req, res) => {
    try {
      const { userId, channel } = req.params;

      const preferences = await NotificationPreference.findByUser(req.tenantId, userId);
      
      if (!preferences) {
        return res.status(404).json({
          success: false,
          message: 'User preferences not found'
        });
      }

      await preferences.optIn(channel);

      logger.info('User opted into channel', {
        userId,
        channel,
        tenantId: req.tenantId
      });

      res.json({
        success: true,
        message: `Successfully opted into ${channel} notifications`,
        data: {
          channel,
          enabled: true,
          optInDate: new Date()
        }
      });

    } catch (error) {
      logger.error('Failed to opt user into channel', {
        userId: req.params.userId,
        channel: req.params.channel,
        error: error.message,
        tenantId: req.tenantId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to opt into channel'
      });
    }
  }
);

/**
 * @route POST /api/preferences/:userId/channels/:channel/opt-out
 * @desc Opt user out of a communication channel
 * @access Private (Service-to-Service)
 */
router.post('/:userId/channels/:channel/opt-out',
  validateUUID,
  async (req, res) => {
    try {
      const { userId, channel } = req.params;

      const preferences = await NotificationPreference.findByUser(req.tenantId, userId);
      
      if (!preferences) {
        return res.status(404).json({
          success: false,
          message: 'User preferences not found'
        });
      }

      await preferences.optOut(channel);

      logger.info('User opted out of channel', {
        userId,
        channel,
        tenantId: req.tenantId
      });

      res.json({
        success: true,
        message: `Successfully opted out of ${channel} notifications`,
        data: {
          channel,
          enabled: false,
          optOutDate: new Date()
        }
      });

    } catch (error) {
      logger.error('Failed to opt user out of channel', {
        userId: req.params.userId,
        channel: req.params.channel,
        error: error.message,
        tenantId: req.tenantId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to opt out of channel'
      });
    }
  }
);

/**
 * @route POST /api/preferences/bulk-update
 * @desc Bulk update notification preferences
 * @access Private (Service-to-Service)
 */
router.post('/bulk-update', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required and cannot be empty'
      });
    }

    if (updates.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update more than 100 preferences at once'
      });
    }

    // Add tenant ID to all updates
    const tenantUpdates = updates.map(update => ({
      ...update,
      tenantId: req.tenantId
    }));

    const result = await NotificationPreference.bulkUpdatePreferences(req.tenantId, tenantUpdates);

    logger.info('Bulk preferences update completed', {
      updateCount: updates.length,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
      tenantId: req.tenantId
    });

    res.json({
      success: true,
      message: 'Bulk preferences update completed',
      data: {
        totalUpdates: updates.length,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount
      }
    });

  } catch (error) {
    logger.error('Failed to bulk update preferences', {
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to bulk update preferences'
    });
  }
});

/**
 * @route GET /api/preferences/stats/channels
 * @desc Get channel preference statistics for tenant
 * @access Private (Service-to-Service)
 */
router.get('/stats/channels', async (req, res) => {
  try {
    const stats = await NotificationPreference.getChannelStats(req.tenantId);

    res.json({
      success: true,
      data: stats[0] || {
        totalUsers: 0,
        smsEnabled: 0,
        emailEnabled: 0,
        whatsappEnabled: 0,
        inAppEnabled: 0,
        pushEnabled: 0
      }
    });

  } catch (error) {
    logger.error('Failed to get channel preference stats', {
      error: error.message,
      tenantId: req.tenantId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get channel preference statistics'
    });
  }
});

module.exports = router;