const AttendanceService = require('../services/AttendanceService');
const logger = require('../utils/logger');

class AttendanceController {
  // Record attendance
  async recordAttendance(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const attendanceData = req.body;
      const recordedBy = req.user.userId;

      const attendance = await AttendanceService.recordAttendance(
        tenantId,
        branchId,
        attendanceData,
        recordedBy
      );

      res.status(201).json({
        success: true,
        message: 'Attendance recorded successfully',
        data: attendance
      });
    } catch (error) {
      logger.error('Record attendance error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update attendance
  async updateAttendance(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { attendanceId } = req.params;
      const updateData = req.body;
      const updatedBy = req.user.userId;

      const attendance = await AttendanceService.updateAttendance(
        tenantId,
        branchId,
        attendanceId,
        updateData,
        updatedBy
      );

      res.json({
        success: true,
        message: 'Attendance updated successfully',
        data: attendance
      });
    } catch (error) {
      logger.error('Update attendance error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get attendance records
  async getAttendance(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const filters = {
        employeeId: req.query.employeeId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
        month: req.query.month
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'date',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await AttendanceService.getAttendance(
        tenantId,
        branchId,
        filters,
        pagination
      );

      res.json({
        success: true,
        message: 'Attendance records retrieved successfully',
        data: result.records,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get attendance error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get attendance summary
  async getAttendanceSummary(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { employeeId, month } = req.params;

      const summary = await AttendanceService.getAttendanceSummary(
        tenantId,
        branchId,
        employeeId,
        month
      );

      res.json({
        success: true,
        message: 'Attendance summary retrieved successfully',
        data: summary
      });
    } catch (error) {
      logger.error('Get attendance summary error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get monthly report
  async getMonthlyReport(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { month } = req.params;

      const report = await AttendanceService.getMonthlyReport(
        tenantId,
        branchId,
        month
      );

      res.json({
        success: true,
        message: 'Monthly attendance report generated successfully',
        data: report
      });
    } catch (error) {
      logger.error('Get monthly report error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Bulk import attendance
  async bulkImportAttendance(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { attendanceRecords } = req.body;
      const importedBy = req.user.userId;

      if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Attendance records array is required'
        });
      }

      const results = await AttendanceService.bulkImportAttendance(
        tenantId,
        branchId,
        attendanceRecords,
        importedBy
      );

      res.json({
        success: true,
        message: 'Bulk attendance import completed',
        data: results
      });
    } catch (error) {
      logger.error('Bulk import attendance error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete attendance
  async deleteAttendance(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { attendanceId } = req.params;
      const deletedBy = req.user.userId;

      const result = await AttendanceService.deleteAttendance(
        tenantId,
        branchId,
        attendanceId,
        deletedBy
      );

      res.json({
        success: true,
        message: 'Attendance record deleted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Delete attendance error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new AttendanceController();