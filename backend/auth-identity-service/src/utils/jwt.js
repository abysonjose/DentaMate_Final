const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN
  };
};

const verifyAccessToken = async (token) => {
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // Check user status and token version
  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new Error('User account deactivated');
  }
  
  if (decoded.tokenVersion !== user.tokenVersion) {
    throw new Error('Token invalidated');
  }
  
  return decoded;
};

const verifyRefreshToken = async (token) => {
  const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
  
  // Check user status and token version for refresh tokens too
  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new Error('User account deactivated');
  }
  
  if (decoded.tokenVersion !== user.tokenVersion) {
    throw new Error('Token invalidated');
  }
  
  return decoded;
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken
};