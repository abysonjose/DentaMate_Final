const express = require('express');
const router = express.Router();
const ClinicController = require('../controllers/ClinicController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const { clinicValidation } = require('../validators/clinicValidator');

// Create clinic
router.post('/', 
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN']),
  validation.validate(clinicValidation.create),
  ClinicController.createClinic
);

// Get clinic by ID
router.get('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'SAAS_ADMIN']),
  validation.validate(clinicValidation.getById),
  ClinicController.getClinicById
);

// List clinics
router.get('/',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'SAAS_ADMIN']),
  validation.validate(clinicValidation.list),
  ClinicController.listClinics
);

// Update clinic
router.put('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN']),
  validation.validate(clinicValidation.update),
  ClinicController.updateClinic
);

// Delete clinic (soft delete)
router.delete('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN']),
  validation.validate(clinicValidation.delete),
  ClinicController.deleteClinic
);

module.exports = router;