const express = require('express');
const User = require('../models/User');

const router = express.Router();

// Get user roles and permissions
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('role permissions tenantId');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      userId: user._id,
      role: user.role,
      permissions: user.permissions || [],
      tenantId: user.tenantId
    });
  } catch (error) {
    console.error('Role fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Update user permissions
router.put('/:userId/permissions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.permissions = permissions;
    await user.save();

    res.json({
      message: 'Permissions updated successfully',
      permissions: user.permissions
    });
  } catch (error) {
    console.error('Permission update error:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

module.exports = router;