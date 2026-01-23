const express = require('express');
const router = express.Router();
const LabRequest = require('../models/LabRequest');
const LabResult = require('../models/LabResult');
const { validateLabRequest, validateStatusUpdate } = require('../validators/labRequestValidator');
const NotificationService = require('../services/NotificationService');

// Get worklist for lab staff
router.get('/worklist', async (req, res) => {
  try {
    const { status, priority, dateFrom, dateTo, limit } = req.query;
    const labStaffId = req.user.id;
    const tenantId = req.tenant.id;
    
    const filters = { status, priority, dateFrom, dateTo, limit };
    const requests = await La