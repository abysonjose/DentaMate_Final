const express = require('express');
const router = express.Router();
const QueueService = require('../services/QueueService');
const logger = require('../utils/logger');

// Get queue status
router.get('/:branchId/:doctorId', async (req, res) => {
  try {
    const { branchId, doctorId } = req.params;
    
    // Validate access
    if (branchId !== req.user.branchId && req.user.userRole !== 'CENTRAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const queueStatus = await QueueService.getQueueStatus(branchId, doctorId, req.user.tenantId);
    
    res.json({
      success: true,
      data: queueStatus
    });
    
  } catch (error) {
    logger.error('Error getting queue status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all queues for a branch
router.get('/branch/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Validate access
    if (branchId !== req.user.branchId && req.user.userRole !== 'CENTRAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const queues = await QueueService.getAllQueues(branchId, req.user.tenantId);
    
    res.json({
      success: true,
      data: queues
    });
    
  } catch (error) {
    logger.error('Error getting branch queues:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Call next token
router.post('/:branchId/:doctorId/call-next', async (req, res) => {
  try {
    const { branchId, doctorId } = req.params;
    
    // Validate doctor access
    if (req.user.userRole === 'DOCTOR' && req.user.userId !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const result = await QueueService.callNextToken(branchId, doctorId, userInfo);
    
    res.json({
      success: true,
      data: result,
      message: 'Next token called successfully'
    });
    
  } catch (error) {
    logger.error('Error calling next token:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Pause queue
router.post('/:branchId/:doctorId/pause', async (req, res) => {
  try {
    const { branchId, doctorId } = req.params;
    const { reason } = req.body;
    
    // Validate access
    const allowedRoles = ['DOCTOR', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(req.user.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.userRole === 'DOCTOR' && req.user.userId !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const queue = await QueueService.pauseQueue(branchId, doctorId, reason, userInfo);
    
    res.json({
      success: true,
      data: queue,
      message: 'Queue paused successfully'
    });
    
  } catch (error) {
    logger.error('Error pausing queue:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Resume queue
router.post('/:branchId/:doctorId/resume', async (req, res) => {
  try {
    const { branchId, doctorId } = req.params;
    
    // Validate access
    const allowedRoles = ['DOCTOR', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(req.user.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.userRole === 'DOCTOR' && req.user.userId !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const queue = await QueueService.resumeQueue(branchId, doctorId, userInfo);
    
    res.json({
      success: true,
      data: queue,
      message: 'Queue resumed successfully'
    });
    
  } catch (error) {
    logger.error('Error resuming queue:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Reorder queue
router.post('/:branchId/:doctorId/reorder', async (req, res) => {
  try {
    const { branchId, doctorId } = req.params;
    const { tokenOrder } = req.body;
    
    // Validate access
    const allowedRoles = ['DOCTOR', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(req.user.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const tokens = await QueueService.reorderQueue(branchId, doctorId, tokenOrder, userInfo);
    
    res.json({
      success: true,
      data: tokens,
      message: 'Queue reordered successfully'
    });
    
  } catch (error) {
    logger.error('Error reordering queue:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Insert priority token
router.post('/:branchId/:doctorId/priority', async (req, res) => {
  try {
    const { branchId, doctorId } = req.params;
    const { tokenId, position } = req.body;
    
    // Validate access
    const allowedRoles = ['DOCTOR', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(req.user.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const tokens = await QueueService.insertPriorityToken(tokenId, position, userInfo);
    
    res.json({
      success: true,
      data: tokens,
      message: 'Priority token inserted successfully'
    });
    
  } catch (error) {
    logger.error('Error inserting priority token:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update queue settings
router.patch('/:branchId/:doctorId/settings', async (req, res) => {
  try {
    const { branchId, doctorId } = req.params;
    const settings = req.body;
    
    // Validate access
    const allowedRoles = ['DOCTOR', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(req.user.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.userRole === 'DOCTOR' && req.user.userId !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const queue = await QueueService.updateQueueSettings(branchId, doctorId, settings, userInfo);
    
    res.json({
      success: true,
      data: queue,
      message: 'Queue settings updated successfully'
    });
    
  } catch (error) {
    logger.error('Error updating queue settings:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get queue analytics
router.get('/:branchId/:doctorId/analytics', async (req, res) => {
  try {
    const { branchId, doctorId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Validate access
    if (branchId !== req.user.branchId && req.user.userRole !== 'CENTRAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await QueueService.getQueueAnalytics(branchId, doctorId, start, end);
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    logger.error('Error getting queue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get daily statistics
router.get('/branch/:branchId/statistics', async (req, res) => {
  try {
    const { branchId } = req.params;
    const { date } = req.query;
    
    // Validate access
    if (branchId !== req.user.branchId && req.user.userRole !== 'CENTRAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    const statistics = await QueueService.getDailyQueueStatistics(branchId, req.user.tenantId, targetDate);
    
    res.json({
      success: true,
      data: statistics
    });
    
  } catch (error) {
    logger.error('Error getting daily statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;