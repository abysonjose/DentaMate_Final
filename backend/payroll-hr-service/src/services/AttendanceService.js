const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const Attendance = require('../models/Attendance');
const EmployeeShift = require('../models/EmployeeShift');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class AttendanceService {
  constructor() {
    this.cache = CacheService;
  }

  // Record attendance
  async recordAttendance(tenantId, branchId, attendanceData, recordedBy) {
    try {
      const { employeeId, date, status, checkInTime, checkOutTime, shiftId, leaveType, remarks, metadata } = attendanceData;

      // Check if attendance already exists for this date
      const existingAttendance = await Attendance.findOne({
        tenantId,
        branchId,
        employeeId,
        date: moment(date).startOf('day').toDate()
      });

      if (existingAttendance) {
        // Check if payroll is finalized
        if (existingAttendance.isPayrollFinalized) {
          throw new Error('Cannot modify attendance for finalized payroll period');
        }

        // Update existing attendance
        return await this.updateAttendance(tenantId, branchId, existingAttendance.attendanceId, {
          status,
          checkInTime,
          checkOutTime,
          leaveType,
          remarks
        }, recordedBy);
      }

      // Get employee's current shift if not provided
      let assignedShiftId = shiftId;
      if (!assignedShiftId) {
        const employeeShift = await EmployeeShift.findCurrentShift(tenantId, branchId, employeeId);
        assignedShiftId = employeeShift?.shiftId;
      }

      // Calculate working hours if present
      let workingHours = 0;
      let overtimeHours = 0;

      if (status === 'PRESENT' && checkInTime && checkOutTime) {
        const checkIn = moment(checkInTime);
        const checkOut = moment(checkOutTime);
        const totalHours = checkOut.diff(checkIn, 'hours', true);
        
        // Standard working hours (8 hours default)
        const standardHours = 8;
        workingHours = Math.min(totalHours, standardHours);
        overtimeHours = Math.max(0, totalHours - standardHours);
      } else if (status === 'HALF_DAY') {
        workingHours = 4;
      }

      const attendance = new Attendance({
        attendanceId: uuidv4(),
        employeeId,
        tenantId,
        branchId,
        date: moment(date).startOf('day').toDate(),
        status,
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        shiftId: assignedShiftId,
        workingHours,
        overtimeHours,
        leaveType,
        remarks,
        recordedBy,
        metadata: metadata || { source: 'MANUAL' }
      });

      await attendance.save();

      // Invalidate cache
      await this.cache.invalidateEmployeeCache(tenantId, branchId, employeeId);

      logger.info('Attendance recorded successfully', {
        attendanceId: attendance.attendanceId,
        employeeId,
        date,
        status,
        recordedBy
      });

      return attendance;
    } catch (error) {
      logger.error('Failed to record attendance:', error);
      throw error;
    }
  }

  // Update attendance
  async updateAttendance(tenantId, branchId, attendanceId, updateData, updatedBy) {
    try {
      const attendance = await Attendance.findOne({
        attendanceId,
        tenantId,
        branchId
      });

      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      if (!attendance.canModify()) {
        throw new Error('Cannot modify attendance for finalized payroll period');
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          attendance[key] = updateData[key];
        }
      });

      // Recalculate working hours if times are updated
      if (updateData.checkInTime || updateData.checkOutTime) {
        if (attendance.checkInTime && attendance.checkOutTime) {
          const checkIn = moment(attendance.checkInTime);
          const checkOut = moment(attendance.checkOutTime);
          const totalHours = checkOut.diff(checkIn, 'hours', true);
          
          const standardHours = 8;
          attendance.workingHours = Math.min(totalHours, standardHours);
          attendance.overtimeHours = Math.max(0, totalHours - standardHours);
        }
      }

      attendance.updatedAt = new Date();
      await attendance.save();

      // Invalidate cache
      await this.cache.invalidateEmployeeCache(tenantId, branchId, attendance.employeeId);

      logger.info('Attendance updated successfully', {
        attendanceId,
        employeeId: attendance.employeeId,
        updatedBy
      });

      return attendance;
    } catch (error) {
      logger.error('Failed to update attendance:', error);
      throw error;
    }
  }

  // Get attendance records
  async getAttendance(tenantId, branchId, filters = {}, pagination = {}) {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        status,
        month
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'date',
        sortOrder = 'desc'
      } = pagination;

      const query = { tenantId, branchId };

      if (employeeId) {
        query.employeeId = employeeId;
      }

      if (startDate && endDate) {
        query.date = {
          $gte: moment(startDate).startOf('day').toDate(),
          $lte: moment(endDate).endOf('day').toDate()
        };
      } else if (month) {
        const startOfMonth = moment(month, 'YYYY-MM').startOf('month').toDate();
        const endOfMonth = moment(month, 'YYYY-MM').endOf('month').toDate();
        query.date = { $gte: startOfMonth, $lte: endOfMonth };
      }

      if (status) {
        query.status = status;
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const [records, total] = await Promise.all([
        Attendance.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Attendance.countDocuments(query)
      ]);

      return {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get attendance records:', error);
      throw error;
    }
  }

  // Get attendance summary for payroll
  async getAttendanceSummary(tenantId, branchId, employeeId, month) {
    try {
      // Check cache first
      const cached = await this.cache.getAttendanceSummary(tenantId, branchId, employeeId, month);
      if (cached) {
        return cached;
      }

      const summary = await Attendance.getPayrollSummary(tenantId, branchId, employeeId, month);
      
      const result = summary.length > 0 ? summary[0] : {
        _id: employeeId,
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        halfDays: 0,
        totalWorkingHours: 0,
        totalOvertimeHours: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0
      };

      // Calculate derived metrics
      result.attendancePercentage = result.totalDays > 0 
        ? ((result.presentDays + result.halfDays * 0.5) / result.totalDays * 100).toFixed(2)
        : 0;

      result.lossOfPayDays = result.absentDays + result.unpaidLeaveDays;

      // Cache the result
      await this.cache.cacheAttendanceSummary(tenantId, branchId, employeeId, month, result);

      return result;
    } catch (error) {
      logger.error('Failed to get attendance summary:', error);
      throw error;
    }
  }

  // Get monthly attendance report
  async getMonthlyReport(tenantId, branchId, month) {
    try {
      const startOfMonth = moment(month, 'YYYY-MM').startOf('month').toDate();
      const endOfMonth = moment(month, 'YYYY-MM').endOf('month').toDate();

      const report = await Attendance.aggregate([
        {
          $match: {
            tenantId,
            branchId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: {
              employeeId: '$employeeId',
              status: '$status'
            },
            count: { $sum: 1 },
            totalWorkingHours: { $sum: '$workingHours' },
            totalOvertimeHours: { $sum: '$overtimeHours' }
          }
        },
        {
          $group: {
            _id: '$_id.employeeId',
            attendance: {
              $push: {
                status: '$_id.status',
                count: '$count',
                workingHours: '$totalWorkingHours',
                overtimeHours: '$totalOvertimeHours'
              }
            },
            totalDays: { $sum: '$count' }
          }
        },
        {
          $project: {
            employeeId: '$_id',
            totalDays: 1,
            presentDays: {
              $sum: {
                $map: {
                  input: '$attendance',
                  as: 'att',
                  in: {
                    $cond: [{ $eq: ['$$att.status', 'PRESENT'] }, '$$att.count', 0]
                  }
                }
              }
            },
            absentDays: {
              $sum: {
                $map: {
                  input: '$attendance',
                  as: 'att',
                  in: {
                    $cond: [{ $eq: ['$$att.status', 'ABSENT'] }, '$$att.count', 0]
                  }
                }
              }
            },
            leaveDays: {
              $sum: {
                $map: {
                  input: '$attendance',
                  as: 'att',
                  in: {
                    $cond: [{ $eq: ['$$att.status', 'LEAVE'] }, '$$att.count', 0]
                  }
                }
              }
            },
            halfDays: {
              $sum: {
                $map: {
                  input: '$attendance',
                  as: 'att',
                  in: {
                    $cond: [{ $eq: ['$$att.status', 'HALF_DAY'] }, '$$att.count', 0]
                  }
                }
              }
            },
            totalWorkingHours: {
              $sum: {
                $map: {
                  input: '$attendance',
                  as: 'att',
                  in: '$$att.workingHours'
                }
              }
            },
            totalOvertimeHours: {
              $sum: {
                $map: {
                  input: '$attendance',
                  as: 'att',
                  in: '$$att.overtimeHours'
                }
              }
            },
            _id: 0
          }
        },
        {
          $sort: { employeeId: 1 }
        }
      ]);

      return {
        month,
        branchId,
        reportGeneratedAt: new Date(),
        employees: report
      };
    } catch (error) {
      logger.error('Failed to generate monthly attendance report:', error);
      throw error;
    }
  }

  // Bulk attendance import
  async bulkImportAttendance(tenantId, branchId, attendanceRecords, importedBy) {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const record of attendanceRecords) {
        try {
          await this.recordAttendance(tenantId, branchId, record, importedBy);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            record,
            error: error.message
          });
        }
      }

      logger.info('Bulk attendance import completed', {
        tenantId,
        branchId,
        total: attendanceRecords.length,
        success: results.success,
        failed: results.failed,
        importedBy
      });

      return results;
    } catch (error) {
      logger.error('Failed to bulk import attendance:', error);
      throw error;
    }
  }

  // Delete attendance record
  async deleteAttendance(tenantId, branchId, attendanceId, deletedBy) {
    try {
      const attendance = await Attendance.findOne({
        attendanceId,
        tenantId,
        branchId
      });

      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      if (!attendance.canModify()) {
        throw new Error('Cannot delete attendance for finalized payroll period');
      }

      await Attendance.deleteOne({ attendanceId });

      // Invalidate cache
      await this.cache.invalidateEmployeeCache(tenantId, branchId, attendance.employeeId);

      logger.info('Attendance record deleted', {
        attendanceId,
        employeeId: attendance.employeeId,
        deletedBy
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete attendance:', error);
      throw error;
    }
  }
}

module.exports = new AttendanceService();