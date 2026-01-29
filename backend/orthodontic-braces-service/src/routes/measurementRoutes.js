const express = require('express');
const multer = require('multer');
const MeasurementController = require('../controllers/MeasurementController');
const { authenticateToken, enforceTenantIsolation, authorizeMeasurementAccess } = require('../middleware/auth');
const { validate, measurementSchemas, paramValidation, fileValidation } = require('../middleware/validation');

const router = express.Router();
const measurementController = new MeasurementController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/pdf',
      'application/dicom',
      'model/stl',
      'model/obj'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Apply authentication and tenant isolation to all routes
router.use(authenticateToken);
router.use(enforceTenantIsolation);

// Measurement upload routes
router.post(
  '/measurements',
  authorizeMeasurementAccess,
  upload.single('file'),
  fileValidation.validateFileUpload,
  validate(measurementSchemas.uploadMeasurement),
  measurementController.uploadMeasurement.bind(measurementController)
);

router.post(
  '/measurements/:measurementId/replace',
  paramValidation.validateMeasurementId,
  authorizeMeasurementAccess,
  upload.single('file'),
  fileValidation.validateFileUpload,
  measurementController.replaceMeasurement.bind(measurementController)
);

// Measurement retrieval routes
router.get(
  '/measurements',
  validate(measurementSchemas.getMeasurements, 'query'),
  measurementController.getMeasurements.bind(measurementController)
);

router.get(
  '/measurements/:measurementId',
  paramValidation.validateMeasurementId,
  authorizeMeasurementAccess,
  measurementController.getMeasurementById.bind(measurementController)
);

router.get(
  '/cases/:caseId/measurements',
  paramValidation.validateCaseId,
  measurementController.getMeasurementsForCase.bind(measurementController)
);

router.get(
  '/cases/:caseId/measurements/history',
  paramValidation.validateCaseId,
  measurementController.getMeasurementHistory.bind(measurementController)
);

// Measurement status management
router.patch(
  '/measurements/:measurementId/status',
  paramValidation.validateMeasurementId,
  authorizeMeasurementAccess,
  validate(measurementSchemas.updateMeasurementStatus),
  measurementController.updateMeasurementStatus.bind(measurementController)
);

// File access routes
router.get(
  '/measurements/:measurementId/download',
  paramValidation.validateMeasurementId,
  authorizeMeasurementAccess,
  measurementController.downloadMeasurement.bind(measurementController)
);

router.get(
  '/measurements/:measurementId/signed-url',
  paramValidation.validateMeasurementId,
  authorizeMeasurementAccess,
  measurementController.generateSignedUrl.bind(measurementController)
);

// Measurement management
router.delete(
  '/measurements/:measurementId',
  paramValidation.validateMeasurementId,
  authorizeMeasurementAccess,
  measurementController.deleteMeasurement.bind(measurementController)
);

// Statistics route
router.get(
  '/measurements/statistics',
  measurementController.getMeasurementStatistics.bind(measurementController)
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed'
      });
    }
  }
  
  if (error.message === 'Invalid file type') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Allowed types: JPEG, PNG, TIFF, PDF, DICOM, STL, OBJ'
    });
  }

  next(error);
});

module.exports = router;