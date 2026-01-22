const express = require('express');
const router = express.Router();
const QueueService = require('../services/QueueService');
const QueueAudit = require('../models/QueueAudit');
const Token = require('../models/Token');
const logger = require('../utils/logger');

// Get queue analytics
router.get('/queue/:branchId/:doctorId', async (req, res) => {
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

// Get branch analytics
router.get('/branch/:branchId', async (req, res) => {
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
    logger.error('Error getting branch analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;