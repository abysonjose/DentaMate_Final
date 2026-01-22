const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Validate required user fields
    if (!decoded.userId || !decoded.tenantId || !decoded.userRole) {
      return next(new Error('Authentication error: Invalid token payload'));
    }
    
    socket.user = decoded;
    
    logger.info(`Socket authenticated: ${decoded.userId} (${decoded.userRole})`);
    
    next();
    
  } catch (error) {
    logger.error('Socket auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    
    next(new Error('Authentication error'));
  }
};

module.exports = socketAuth;