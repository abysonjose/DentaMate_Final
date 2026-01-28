const express = require('express');
const VitalsController = require('../controllers/VitalsController');
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const RateLimiterMiddleware = require('../middleware/rateLimiter');

const router = express.Router();
const vitalsController = new VitalsController();

// Apply authentication to all routes
router.use(AuthMiddleware.verifyToken);

// Create vitals record
router.post('/',
  AuthMiddleware.requireNursingRole(),
  RateLimiterMiddleware.vitalsRecording(),
  ValidationMiddleware.validate(ValidationMiddleware.vitalsSchemas.create),
  (req, res) => vitalsController.createVitals(req, res)
);

// Get vitals by ID
router.get('/:vitalId',
  AuthMiddleware.requireNurseOrAbove(),
  ValidationMiddleware.validate(ValidationMiddleware.commonSchemas.uuid, 'params'),
  (req, res) => vitalsController.getVitalsById(req, res)
);

// Get vitals by appointment
router.get('/appointment/:appointmentId',
  AuthMiddleware.requireNurseOrAbove(),
  ValidationMiddleware.validate(ValidationMiddleware.commonSchemas.uuid, 'params'),
  (req, res) => vitalsController.getVitalsByAppointment(req, res)
);

// Get vitals by patient
router.get('/patient/:patientId',
  AuthMiddleware.requireNurseOrAbove(),
  ValidationMiddleware.validate(ValidationMiddleware.commonSchemas.uuid, 'params'),
  (req, res) => vitalsController.getVitalsByPatient(req, res)
);

// Get abnormal vitals
router.get('/abnormal/list',
  AuthMiddleware.requireNurseOrAbove(),
  (req, res) => vitalsController.getAbnormalVitals(req, res)
);

// Get vitals statistics
router.get('/statistics/summary',
  AuthMiddleware.requireNurseOrAbove(),
  (req, res) => vitalsController.getVitalsStatistics(req, res)
);

// Search vitals
router.get('/search/query',
  AuthMiddleware.requireNurseOrAbove(),
  ValidationMiddleware.validate(ValidationMiddleware.vitalsSchemas.query, 'query'),
  (req, res) => vitalsController.searchVitals(req, res)
);

// Get vitals trends
router.get('/trends/:patientId',
  AuthMiddleware.requireNurseOrAbove(),
  ValidationMiddleware.validate(ValidationMiddleware.commonSchemas.uuid, 'params'),
  (req, res) => vitalsController.getVitalsTrends(req, res)
);

// Get vitals summary for dashboard
router.get('/dashboard/summary',
  AuthMiddleware.requireNurseOrAbove(),
  (req, res) => vitalsController.getVitalsSummary(req, res)
);

// Validate vitals data
router.post('/validate/data',
  AuthMiddleware.requireNursingRole(),
  (req, res) => vitalsController.validateVitalsData(req, res)
);

// Delete vitals record (soft delete)
router.delete('/:vitalId',
  AuthMiddleware.requireHeadNurseOrAbove(),
  ValidationMiddleware.validate(ValidationMiddleware.commonSchemas.uuid, 'params'),
  (req, res) => vitalsController.deleteVitals(req, res)
);

module.exports = router;