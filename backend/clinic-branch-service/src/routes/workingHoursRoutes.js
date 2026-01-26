const express = require('express');
const router = express.Router();
const WorkingHoursController = require('../controllers/WorkingHoursController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const { workingHoursValidation } = require('../validators/workingHoursValidator');

// Create/Update working hours
router.post('/', 
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(workingHoursValidation.create),
  WorkingHoursController.createWorkingHours
);

// Get working hours
router.get('/',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  validation.validate(workingHoursValidation.list),
  WorkingHoursController.getWorkingHours
);

// Get working hours by ID
router.get('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  validation.validate(workingHoursValidation.getById),
  WorkingHoursController.getWorkingHoursById
);

// Update working hours
router.put('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(workingHoursValidation.update),
  WorkingHoursController.updateWorkingHours
);

// Delete working hours
router.delete('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(workingHoursValidation.delete),
  WorkingHoursController.deleteWorkingHours
);

module.exports = router;