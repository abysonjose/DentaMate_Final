const express = require('express');
const FileUploadController = require('../controllers/FileUploadController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();
const uploadController = new FileUploadController();

// Apply authentication to all routes
router.use(auth);

// Apply rate limiting for uploads (more restrictive)
router.use('/upload', rateLimiter.createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 upload requests per windowMs
  message: 'Too many upload requests from this IP'
}));

// Apply general rate limiting for other routes
router.use(rateLimiter.createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP'
}));

/**
 * @route POST /api/diagnostics/uploads
 * @desc Upload diagnostic files
 * @access Lab Staff, Doctor, Nurse
 */
router.post('/upload',
  validation.validateRole(['LAB_STAFF', 'DOCTOR', 'NURSE', 'HEAD_NURSE']),
  validation.validateUpload,
  uploadController.uploadFiles.bind(uploadController)
);

/**
 * @route GET /api/diagnostics/files/:uploadId
 * @desc Get/view file by upload ID
 * @access All authenticated users (with access control)
 */
router.get('/files/:uploadId',
  validation.validateUploadId,
  uploadController.getFile.bind(uploadController)
);

/**
 * @route GET /api/diagnostics/files/:uploadId/download
 * @desc Download file by upload ID
 * @access All authenticated users (with access control)
 */
router.get('/files/:uploadId/download',
  validation.validateUploadId,
  uploadController.downloadFile.bind(uploadController)
);

/**
 * @route GET /api/diagnostics/files/:uploadId/metadata
 * @desc Get file metadata
 * @access All authenticated users (with access control)
 */
router.get('/files/:uploadId/metadata',
  validation.validateUploadId,
  uploadController.getFileMetadata.bind(uploadController)
);

/**
 * @route GET /api/diagnostics/files/:uploadId/access-log
 * @desc Get file access log
 * @access File owner, Branch Admin, Central Admin
 */
router.get('/files/:uploadId/access-log',
  validation.validateUploadId,
  uploadController.getFileAccessLog.bind(uploadController)
);

/**
 * @route PUT /api/diagnostics/files/:uploadId
 * @desc Replace file
 * @access File owner, Lab Staff, Branch Admin, Central Admin
 */
router.put('/files/:uploadId',
  validation.validateRole(['LAB_STAFF', 'DOCTOR', 'NURSE', 'HEAD_NURSE', 'BRANCH_ADMIN', 'CENTRAL_ADMIN']),
  validation.validateUploadId,
  uploadController.replaceFile.bind(uploadController)
);

/**
 * @route DELETE /api/diagnostics/files/:uploadId
 * @desc Delete file
 * @access File owner, Branch Admin, Central Admin
 */
router.delete('/files/:uploadId',
  validation.validateUploadId,
  uploadController.deleteFile.bind(uploadController)
);

/**
 * @route GET /api/diagnostics/orders/:orderId/files
 * @desc Get all files for an order
 * @access All authenticated users (with access control)
 */
router.get('/orders/:orderId/files',
  validation.validateOrderId,
  uploadController.getOrderFiles.bind(uploadController)
);

/**
 * @route GET /api/diagnostics/uploads/statistics
 * @desc Get upload statistics
 * @access All authenticated users (filtered by role)
 */
router.get('/uploads/statistics',
  uploadController.getUploadStatistics.bind(uploadController)
);

module.exports = router;