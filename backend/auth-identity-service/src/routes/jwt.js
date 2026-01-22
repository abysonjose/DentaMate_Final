const express = require('express');
const { verifyAccessToken } = require('../utils/jwt');

const router = express.Router();

// Verify JWT token endpoint
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = verifyAccessToken(token);
    
    res.json({
      valid: true,
      decoded,
      expiresAt: new Date(decoded.exp * 1000)
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      error: 'Invalid token'
    });
  }
});

module.exports = router;