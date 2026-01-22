const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');

const router = express.Router();

// Generate 2FA secret
router.post('/generate', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const secret = speakeasy.generateSecret({
      name: `DentaMate (${user.email})`,
      issuer: 'DentaMate'
    });

    // Save secret to user (temporarily)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    console.error('2FA generation error:', error);
    res.status(500).json({ error: 'Failed to generate 2FA' });
  }
});

// Verify 2FA token
router.post('/verify', async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(404).json({ error: 'User or 2FA not found' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (verified) {
      user.twoFactorEnabled = true;
      await user.save();
      
      res.json({ verified: true, message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ verified: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;