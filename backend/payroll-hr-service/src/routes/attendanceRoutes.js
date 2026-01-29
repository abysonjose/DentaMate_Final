const express = require('express');
const AttendanceController = require('../controllers/AttendanceController');
const { authenticateToken, authorizeRoles, validateTenantAccess, validateBranchAccess, authorizePayrollAccess, checkPayrollFinalized } = require('../middleware/auth');
const { validate, validateParams, validateQuery, attendanceSchemas, commonSchemas } = require('../middleware/validation');
const { attendanceLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticateToken);
router.use(authorizePayrollAccess);
router.use(validateTenantAccess);
router.use(validateBranchAccess);
router.use(attendanceLimiter);

// Record attendance
router.post('/',
  validate(attendanceSchemas.create),
  checkPayrollFinalized,
  AttendanceController.recordAttendance
);

// Update attendance
router.put('/:attendanceId',
  validateParams(require('joi').object({
    attendanceId: require('joi').string().uuid().required()
  })),
  validate(attendanceSchemas.update),
  checkPayrollFinalized,
  AttendanceController.updateAttendance
);

// Get attendance records
router.get('/',
  validateQuery(attendanceSchemas.query),
  AttendanceController.getAttendance
);

// Get attendance summary for employee and month
router.get('/summary/:employeeId/:month',
  validateParams(require('joi').object({
    employeeId: commonSchemas.employeeId,
    month: commonSchemas.month
  })),
  AttendanceController.getAttendanceSummary
);

// Get monthly attendance report
router.get('/report/monthly/:month',
  validateParams(require('joi').object({
    month: commonSchemas.month
  })),
  AttendanceController.getMonthlyReport
);

// Bulk import attendance
router.post('/bulk-import',
  validate(require('joi').object({
    attendanceRecords: require('joi').array().items(attendanceSchemas.create).min(1).required()
  })),
  checkPayrollFinalized,
  authorizeRoles('HR'),
  AttendanceController.bulkImportAttendance
);

// Delete attendance record
router.delete('/:attendanceId',
  validateParams(require('joi').object({
    attendanceId: require('joi').string().uuid().required()
  })),
  checkPayrollFinalized,
  authorizeRoles('HR'),
  AttendanceController.deleteAttendance
);

module.exports = router;