const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const axios = require('axios');
const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');

const router = express.Router();

// Environment variables
const USER_STAFF_SERVICE_URL = process.env.USER_STAFF_SERVICE_URL || 'http://localhost:3005';

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  tenantId: Joi.string().required()
});

// Register validation schema (simplified - no role)
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  tenantId: Joi.string().required()
});

// Login endpoint - fetches staff data from SSOT
router.post('/login', async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, tenantId } = req.body;

    // Find user in auth service (credentials only)
    const user = await User.findOne({ 
      email, 
      tenantId,
      isActive: true 
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch staff profile from user-staff-service (SSOT)
    let staffProfile = null;
    try {
      const staffResponse = await axios.get(`${USER_STAFF_SERVICE_URL}/staff/by-auth/${user._id}`);
      staffProfile = staffResponse.data.staff;
    } catch (staffError) {
      console.error('Failed to fetch staff profile:', staffError.message);
      // For non-staff users (patients), continue without staff profile
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Build JWT payload from staff data (SSOT)
    const jwtPayload = {
      userId: user._id,
      email: user.email,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion
    };

    // Add staff-specific data if available
    if (staffProfile) {
      jwtPayload.staffId = staffProfile.staffId;
      jwtPayload.branchId = staffProfile.branchId;
      jwtPayload.roles = staffProfile.activeRoles.map(r => r.roleName);
      jwtPayload.employmentStatus = staffProfile.employmentInfo.employmentStatus;
    } else {
      // Default for patients
      jwtPayload.roles = ['patient'];
    }

    // Generate tokens
    const tokens = generateTokens(jwtPayload);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        ...(staffProfile && {
          staffId: staffProfile.staffId,
          branchId: staffProfile.branchId,
          roles: staffProfile.activeRoles.map(r => r.roleName),
          employmentStatus: staffProfile.employmentInfo.employmentStatus
        })
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint (simplified - no role storage)
router.post('/register', async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userData = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: userData.email,
      tenantId: userData.tenantId 
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user (credentials only)
    const user = new User(userData);
    await user.save();

    // Generate basic tokens (patient by default)
    const jwtPayload = {
      userId: user._id,
      email: user.email,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
      roles: ['patient']
    };

    const tokens = generateTokens(jwtPayload);

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        roles: ['patient']
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = await verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Fetch fresh staff data from SSOT
    let staffProfile = null;
    try {
      const staffResponse = await axios.get(`${USER_STAFF_SERVICE_URL}/staff/by-auth/${user._id}`);
      staffProfile = staffResponse.data.staff;
    } catch (staffError) {
      console.error('Failed to fetch staff profile during refresh:', staffError.message);
    }

    // Build fresh JWT payload
    const jwtPayload = {
      userId: user._id,
      email: user.email,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion
    };

    if (staffProfile) {
      jwtPayload.staffId = staffProfile.staffId;
      jwtPayload.branchId = staffProfile.branchId;
      jwtPayload.roles = staffProfile.activeRoles.map(r => r.roleName);
      jwtPayload.employmentStatus = staffProfile.employmentInfo.employmentStatus;
    } else {
      jwtPayload.roles = ['patient'];
    }

    const tokens = generateTokens(jwtPayload);

    res.json(tokens);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Deactivate user endpoint (for staff deactivation)
router.patch('/users/:userId/deactivate', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Deactivate user and increment token version (invalidates all tokens)
    user.isActive = false;
    user.tokenVersion += 1;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'User deactivated and all tokens invalidated',
      tokenVersion: user.tokenVersion 
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Activate user endpoint
router.patch('/users/:userId/activate', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Activate user and increment token version
    user.isActive = true;
    user.tokenVersion += 1;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'User activated',
      tokenVersion: user.tokenVersion 
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// Invalidate tokens endpoint (for role changes)
router.patch('/users/:userId/invalidate-tokens', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Increment token version to invalidate all existing tokens
    user.tokenVersion += 1;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'All tokens invalidated',
      tokenVersion: user.tokenVersion 
    });
  } catch (error) {
    console.error('Invalidate tokens error:', error);
    res.status(500).json({ error: 'Failed to invalidate tokens' });
  }
});

module.exports = router;