const express = require('express');
const router = express.Router();
const QueueService = require('../services/QueueService');
const TokenService = require('../services/TokenService');
const logger = require('../utils/logger');

// Get doctor's queue
router.get('/queue', async (req, res) => {
  try {
    if (req.user.userRole !== 'DOCTOR') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Doctor role required'
      });
    }

    const queueStatus = await QueueService.getQueueStatus(
      req.user.branchId, 
      req.user.userId, 
      req.user.tenantId
    );
    
    res.json({
      success: true,
      data: queueStatus
    });
    
  } catch (error) {
    logger.error('Error getting doctor queue:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Call next patient
router.post('/call-next', async (req, res) => {
  try {
    if (req.user.userRole !== 'DOCTOR') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Doctor role required'
      });
    }

    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const result = await QueueService.callNextToken(
      req.user.branchId, 
      req.user.userId, 
      userInfo
    );
    
    res.json({
      success: true,
      data: result,
      message: 'Next patient called successfully'
    });
    
  } catch (error) {
    logger.error('Error calling next patient:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;