const express = require('express');
const router = express.Router();
const TokenService = require('../services/TokenService');
const { validateTokenGeneration, validateCheckin } = require('../middleware/validation');
const logger = require('../utils/logger');

// Generate new token
router.post('/generate', validateTokenGeneration, async (req, res) => {
  try {
    const tokenData = req.body;
    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const token = await TokenService.generateToken(tokenData, userInfo);
    
    res.status(201).json({
      success: true,
      data: token,
      message: 'Token generated successfully'
    });
    
  } catch (error) {
    logger.error('Error in token generation:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get token by ID
router.get('/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const token = await Token.findById(tokenId);
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    // Check access permissions
    if (token.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: token
    });
    
  } catch (error) {
    logger.error('Error getting token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get patient tokens
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { branchId } = req.query;
    
    const tokens = await TokenService.getPatientTokens(
      patientId, 
      branchId || req.user.branchId, 
      req.user.tenantId
    );
    
    res.json({
      success: true,
      data: tokens
    });
    
  } catch (error) {
    logger.error('Error getting patient tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get queue tokens
router.get('/queue/:branchId/:doctorId', async (req, res) => {
  try {
    const { branchId, doctorId } = req.params;
    const { includeCompleted } = req.query;
    
    // Validate access
    if (branchId !== req.user.branchId && req.user.userRole !== 'CENTRAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const tokens = await TokenService.getQueueTokens(
      branchId, 
      doctorId, 
      includeCompleted === 'true'
    );
    
    res.json({
      success: true,
      data: tokens
    });
    
  } catch (error) {
    logger.error('Error getting queue tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Skip token
router.patch('/:tokenId/skip', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { reason } = req.body;
    
    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const token = await TokenService.skipToken(tokenId, reason, userInfo);
    
    res.json({
      success: true,
      data: token,
      message: 'Token skipped successfully'
    });
    
  } catch (error) {
    logger.error('Error skipping token:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Complete token
router.patch('/:tokenId/complete', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const token = await TokenService.completeToken(tokenId, userInfo);
    
    res.json({
      success: true,
      data: token,
      message: 'Token completed successfully'
    });
    
  } catch (error) {
    logger.error('Error completing token:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Mark token as no-show
router.patch('/:tokenId/no-show', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    const userInfo = {
      userId: req.user.userId,
      userName: req.user.userName,
      userRole: req.user.userRole
    };

    const token = await TokenService.markNoShow(tokenId, userInfo);
    
    res.json({
      success: true,
      data: token,
      message: 'Token marked as no-show'
    });
    
  } catch (error) {
    logger.error('Error marking token as no-show:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Validate token for check-in
router.post('/validate', async (req, res) => {
  try {
    const tokenData = req.body;
    const validation = await TokenService.validateTokenForCheckin(tokenData);
    
    res.json({
      success: true,
      data: validation
    });
    
  } catch (error) {
    logger.error('Error validating token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;