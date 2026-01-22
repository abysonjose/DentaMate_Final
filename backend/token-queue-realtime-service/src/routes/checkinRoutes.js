const express = require('express');
const router = express.Router();
const TokenService = require('../services/TokenService');
const { validateCheckin } = require('../middleware/validation');
const logger = require('../utils/logger');

// QR Code check-in
router.post('/qr', validateCheckin, async (req, res) => {
  try {
    const { qrData, location, device } = req.body;
    
    // Parse QR code data
    let tokenData;
    try {
      tokenData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format'
      });
    }

    // Validate token
    const validation = await TokenService.validateTokenForCheckin(tokenData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    // Check-in token
    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const checkinData = {
      method: 'QR',
      location,
      device,
      timestamp: new Date()
    };

    const token = await TokenService.checkInToken(validation.token._id, checkinData, userInfo);
    
    res.json({
      success: true,
      data: token,
      message: 'Check-in successful'
    });
    
  } catch (error) {
    logger.error('Error in QR check-in:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// NFC check-in
router.post('/nfc', validateCheckin, async (req, res) => {
  try {
    const { nfcData, location, device } = req.body;
    
    // Parse NFC data (similar to QR but different format)
    let tokenData;
    try {
      // NFC data might be in different format, adapt as needed
      tokenData = typeof nfcData === 'string' ? JSON.parse(nfcData) : nfcData;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid NFC data format'
      });
    }

    // Validate token
    const validation = await TokenService.validateTokenForCheckin(tokenData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    // Check-in token
    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const checkinData = {
      method: 'NFC',
      location,
      device,
      timestamp: new Date()
    };

    const token = await TokenService.checkInToken(validation.token._id, checkinData, userInfo);
    
    res.json({
      success: true,
      data: token,
      message: 'NFC check-in successful'
    });
    
  } catch (error) {
    logger.error('Error in NFC check-in:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Manual check-in
router.post('/manual', async (req, res) => {
  try {
    const { tokenId, patientId, location, reason } = req.body;
    
    if (!tokenId || !patientId) {
      return res.status(400).json({
        success: false,
        message: 'Token ID and Patient ID are required'
      });
    }

    // Validate token exists and belongs to patient
    const tokenData = {
      tokenId,
      patientId,
      branchId: req.user.branchId
    };

    const validation = await TokenService.validateTokenForCheckin(tokenData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason
      });
    }

    // Check-in token
    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const checkinData = {
      method: 'MANUAL',
      location: location || 'Reception',
      reason: reason || 'Manual check-in by staff',
      timestamp: new Date()
    };

    const token = await TokenService.checkInToken(tokenId, checkinData, userInfo);
    
    res.json({
      success: true,
      data: token,
      message: 'Manual check-in successful'
    });
    
  } catch (error) {
    logger.error('Error in manual check-in:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Bulk check-in (for multiple tokens)
router.post('/bulk', async (req, res) => {
  try {
    const { tokens } = req.body; // Array of token check-in data
    
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tokens array is required'
      });
    }

    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const results = [];
    const errors = [];

    for (const tokenData of tokens) {
      try {
        const { tokenId, method, location } = tokenData;
        
        const checkinData = {
          method: method || 'MANUAL',
          location: location || 'Reception',
          timestamp: new Date()
        };

        const token = await TokenService.checkInToken(tokenId, checkinData, userInfo);
        results.push({
          tokenId,
          success: true,
          token
        });
        
      } catch (error) {
        errors.push({
          tokenId: tokenData.tokenId,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        successful: results,
        failed: errors,
        totalProcessed: tokens.length,
        successCount: results.length,
        errorCount: errors.length
      },
      message: `Bulk check-in completed: ${results.length} successful, ${errors.length} failed`
    });
    
  } catch (error) {
    logger.error('Error in bulk check-in:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get check-in history
router.get('/history/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    const { startDate, endDate, method } = req.query;
    
    // Validate access
    if (branchId !== req.user.branchId && req.user.userRole !== 'CENTRAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = {
      branchId,
      tenantId: req.user.tenantId,
      status: { $in: ['CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED'] },
      checkedInAt: { $exists: true }
    };

    if (startDate || endDate) {
      query.checkedInAt = {};
      if (startDate) query.checkedInAt.$gte = new Date(startDate);
      if (endDate) query.checkedInAt.$lte = new Date(endDate);
    }

    if (method) {
      query['metadata.checkinMethod'] = method;
    }

    const Token = require('../models/Token');
    const checkinHistory = await Token.find(query)
      .sort({ checkedInAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: checkinHistory
    });
    
  } catch (error) {
    logger.error('Error getting check-in history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Validate check-in data
router.post('/validate', async (req, res) => {
  try {
    const tokenData = req.body;
    const validation = await TokenService.validateTokenForCheckin(tokenData);
    
    res.json({
      success: true,
      data: validation
    });
    
  } catch (error) {
    logger.error('Error validating check-in:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get check-in statistics
router.get('/statistics/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
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

    const Token = require('../models/Token');
    const statistics = await Token.aggregate([
      {
        $match: {
          branchId,
          tenantId: req.user.tenantId,
          checkedInAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$metadata.checkinMethod',
          count: { $sum: 1 },
          avgWaitTime: {
            $avg: {
              $divide: [
                { $subtract: ['$consultationStartedAt', '$checkedInAt'] },
                1000 * 60 // Convert to minutes
              ]
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: statistics
    });
    
  } catch (error) {
    logger.error('Error getting check-in statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;