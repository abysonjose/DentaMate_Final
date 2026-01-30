const express = require('express');
const collaborationRoutes = require('./collaborationRoutes');
const discussionRoutes = require('./discussionRoutes');
const meetingRoutes = require('./meetingRoutes');
const meetingNoteRoutes = require('./meetingNoteRoutes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Collaboration & Meeting Service is healthy',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0'
  });
});

// API routes
router.use('/api/collaboration', collaborationRoutes);
router.use('/api/discussions', discussionRoutes);
router.use('/api/meetings', meetingRoutes);
router.use('/api', meetingNoteRoutes); // Meeting notes routes include meetings prefix

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = router;