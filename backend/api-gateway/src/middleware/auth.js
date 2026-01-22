const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    // Skip auth for public routes
    const publicRoutes = ['/auth/login', '/auth/register', '/health'];
    if (publicRoutes.some(route => req.path.includes(route))) {
      return next();
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Forward user info to downstream services
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-tenant-id'] = decoded.tenantId;

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;