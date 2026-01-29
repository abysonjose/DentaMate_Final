const { v4: uuidv4 } = require('uuid');
const Shift = require('../models/Shift');
const EmployeeShift = require('../models/EmployeeShift');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class ShiftService {
  constructor() {
    this.cache = CacheService;
  }

  // Create new shift
  async createShift(tenantId, branchId, shiftData, createdBy) {
    try {
      const { name, type, startTime, endTime, breakDuration, workingDays, maxEmployees, overtimeRules } = shiftData;

      // Check for overlapping shifts
      const existingShifts = await Shift.find({
        tenantId,
        branchId,
        isActive: true
      });

      const newShift = new Shift({
        shiftId: uuidv4(),
        tenantId,
        branchId,
        name,
        type,
        startTime,
        endTime,
        breakDuration,
        workingDays,
        maxEmployees,
        overtimeRules,
        createdBy
      });

      // Check for overlaps with existing shifts
      for (const existingShift of existingShifts) {
        if (newShift.hasOverlap(existingShift)) {
          // Check if they share common working days
          const commonDays = workingDays.filter(day => existingShift.workingDays.includes(day));
          if (commonDays.length > 0) {
            logger.warn('Shift overlap detected', {
              newShift: { name, startTime, endTime },
              existingShift: { name: existingShift.name, startTime: existingShift.startTime, endTime: existingShift.endTime },
              commonDays
            });
          }
        }
      }

      await newShift.save();

      // Invalidate cache
      await this.cache.invalidateShiftCache(tenantId, branchId);

      logger.info('Shift created successfully', {
        shiftId: newShift.shiftId,
        name,
        type,
        createdBy
      });

      return newShift;
    } catch (error) {
      logger.error('Failed to create shift:', error);
      throw error;
    }
  }

  // Update shift
  async updateShift(tenantId, branchId, shiftId, updateData, updatedBy) {
    try {
      const shift = await Shift.findOne({
        shiftId,
        tenantId,
        branchId
      });

      if (!shift) {
        throw new Error('Shift not found');
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          shift[key] = updateData[key];
        }
      });

      shift.updatedBy = updatedBy;
      await shift.save();

      // Invalidate cache
      await this.cache.invalidateShiftCache(tenantId, branchId);

      logger.info('Shift updated successfully', {
        shiftId,
        updatedBy
      });

      return shift;
    } catch (error) {
      logger.error('Failed to update shift:', error);
      throw error;
    }
  }

  // Get shifts
  async getShifts(tenantId, branchId, filters = {}) {
    try {
      // Check cache first
      const cached = await this.cache.getShiftData(tenantId, branchId);
      if (cached && Object.keys(filters).length === 0) {
        return cached;
      }

      const query = { tenantId, branchId };

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.type) {
        query.type = filters.type;
      }

      const shifts = await Shift.find(query).sort({ startTime: 1 });

      // Cache the result if no filters applied
      if (Object.keys(filters).length === 0) {
        await this.cache.cacheShiftData(tenantId, branchId, shifts);
      }

      return shifts;
    } catch (error) {
      logger.error('Failed to get shifts:', error);
      throw error;
    }
  }

  // Get shift by ID
  async getShiftById(tenantId, branchId, shiftId) {
    try {
      const shift = await Shift.findOne({
        shiftId,
        tenantId,
        branchId
      });

      if (!shift) {
        throw new Error('Shift not found');
      }

      return shift;
    } catch (error) {
      logger.error('Failed to get shift by ID:', error);
      throw error;
    }
  }

  // Assign employee to shift
  async assignEmployeeToShift(tenantId, branchId, assignmentData, assignedBy) {
    try {
      const { employeeId, shiftId, effectiveFrom, effectiveTo, workingDays, specialInstructions, metadata } = assignmentData;

      // Validate shift exists and has capacity
      const shift = await this.getShiftById(tenantId, branchId, shiftId);
      if (!shift.canAddEmployee()) {
        throw new Error('Shift has reached maximum capacity');
      }

      // Check for conflicts with existing assignments
      const conflicts = await EmployeeShift.checkConflicts(employeeId, shiftId, effectiveFrom, effectiveTo);
      if (conflicts.length > 0) {
        throw new Error('Employee has conflicting shift assignments');
      }

      // Deactivate existing active assignments for this employee
      await EmployeeShift.updateMany(
        {
          tenantId,
          branchId,
          employeeId,
          isActive: true,
          effectiveFrom: { $lte: new Date(effectiveFrom) }
        },
        {
          $set: {
            isActive: false,
            effectiveTo: new Date(effectiveFrom),
            updatedBy: assignedBy
          }
        }
      );

      // Create new assignment
      const assignment = new EmployeeShift({
        assignmentId: uuidv4(),
        tenantId,
        branchId,
        employeeId,
        shiftId,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
        workingDays: workingDays || shift.workingDays,
        specialInstructions,
        assignedBy,
        metadata
      });

      await assignment.save();

      // Update shift employee count
      await Shift.updateOne(
        { shiftId },
        { $inc: { currentEmployees: 1 } }
      );

      // Invalidate cache
      await this.cache.invalidateShiftCache(tenantId, branchId);

      logger.info('Employee assigned to shift successfully', {
        assignmentId: assignment.assignmentId,
        employeeId,
        shiftId,
        assignedBy
      });

      return assignment;
    } catch (error) {
      logger.error('Failed to assign employee to shift:', error);
      throw error;
    }
  }

  // Remove employee from shift
  async removeEmployeeFromShift(tenantId, branchId, employeeId, shiftId, removedBy, endDate) {
    try {
      const assignment = await EmployeeShift.findOne({
        tenantId,
        branchId,
        employeeId,
        shiftId,
        isActive: true
      });

      if (!assignment) {
        throw new Error('Active shift assignment not found');
      }

      // Deactivate assignment
      assignment.deactivate(removedBy, endDate);
      await assignment.save();

      // Update shift employee count
      await Shift.updateOne(
        { shiftId },
        { $inc: { currentEmployees: -1 } }
      );

      // Invalidate cache
      await this.cache.invalidateShiftCache(tenantId, branchId);

      logger.info('Employee removed from shift successfully', {
        assignmentId: assignment.assignmentId,
        employeeId,
        shiftId,
        removedBy
      });

      return assignment;
    } catch (error) {
      logger.error('Failed to remove employee from shift:', error);
      throw error;
    }
  }

  // Get employee's current shift
  async getEmployeeCurrentShift(tenantId, branchId, employeeId) {
    try {
      const assignment = await EmployeeShift.findCurrentShift(tenantId, branchId, employeeId);
      
      if (!assignment) {
        return null;
      }

      const shift = await this.getShiftById(tenantId, branchId, assignment.shiftId);
      
      return {
        assignment,
        shift
      };
    } catch (error) {
      logger.error('Failed to get employee current shift:', error);
      throw error;
    }
  }

  // Get employees in a shift
  async getEmployeesInShift(tenantId, branchId, shiftId, date) {
    try {
      const assignments = await EmployeeShift.findEmployeesInShift(tenantId, branchId, shiftId, date);
      
      // TODO: Fetch employee details from user-staff-service
      const employeeDetails = assignments.map(assignment => ({
        assignmentId: assignment.assignmentId,
        employeeId: assignment.employeeId,
        effectiveFrom: assignment.effectiveFrom,
        effectiveTo: assignment.effectiveTo,
        workingDays: assignment.workingDays,
        specialInstructions: assignment.specialInstructions
      }));

      return employeeDetails;
    } catch (error) {
      logger.error('Failed to get employees in shift:', error);
      throw error;
    }
  }

  // Get shift coverage report
  async getShiftCoverageReport(tenantId, branchId) {
    try {
      const coverageReport = await Shift.getCoverageReport(tenantId, branchId);
      
      return {
        branchId,
        reportGeneratedAt: new Date(),
        shifts: coverageReport
      };
    } catch (error) {
      logger.error('Failed to get shift coverage report:', error);
      throw error;
    }
  }

  // Get shift distribution report
  async getShiftDistributionReport(tenantId, branchId) {
    try {
      const distributionReport = await EmployeeShift.getShiftDistribution(tenantId, branchId);
      
      return {
        branchId,
        reportGeneratedAt: new Date(),
        distribution: distributionReport
      };
    } catch (error) {
      logger.error('Failed to get shift distribution report:', error);
      throw error;
    }
  }

  // Get available shifts for assignment
  async getAvailableShifts(tenantId, branchId, day) {
    try {
      const availableShifts = await Shift.findAvailableShifts(tenantId, branchId, day);
      
      return availableShifts.map(shift => ({
        shiftId: shift.shiftId,
        name: shift.name,
        type: shift.type,
        startTime: shift.startTime,
        endTime: shift.endTime,
        duration: shift.duration,
        maxEmployees: shift.maxEmployees,
        currentEmployees: shift.currentEmployees,
        availableSlots: shift.maxEmployees - shift.currentEmployees
      }));
    } catch (error) {
      logger.error('Failed to get available shifts:', error);
      throw error;
    }
  }

  // Delete shift
  async deleteShift(tenantId, branchId, shiftId, deletedBy) {
    try {
      const shift = await Shift.findOne({
        shiftId,
        tenantId,
        branchId
      });

      if (!shift) {
        throw new Error('Shift not found');
      }

      // Check if shift has active assignments
      const activeAssignments = await EmployeeShift.countDocuments({
        tenantId,
        branchId,
        shiftId,
        isActive: true
      });

      if (activeAssignments > 0) {
        throw new Error('Cannot delete shift with active employee assignments');
      }

      // Soft delete by marking as inactive
      shift.isActive = false;
      shift.updatedBy = deletedBy;
      await shift.save();

      // Invalidate cache
      await this.cache.invalidateShiftCache(tenantId, branchId);

      logger.info('Shift deleted successfully', {
        shiftId,
        deletedBy
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete shift:', error);
      throw error;
    }
  }

  // Bulk shift operations
  async bulkAssignEmployees(tenantId, branchId, assignments, assignedBy) {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const assignment of assignments) {
        try {
          await this.assignEmployeeToShift(tenantId, branchId, assignment, assignedBy);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            assignment,
            error: error.message
          });
        }
      }

      logger.info('Bulk employee assignment completed', {
        tenantId,
        branchId,
        total: assignments.length,
        success: results.success,
        failed: results.failed,
        assignedBy
      });

      return results;
    } catch (error) {
      logger.error('Failed to bulk assign employees:', error);
      throw error;
    }
  }
}

module.exports = new ShiftService();