const ShiftService = require('../services/ShiftService');
const logger = require('../utils/logger');

class ShiftController {
  // Create shift
  async createShift(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const shiftData = req.body;
      const createdBy = req.user.userId;

      const shift = await ShiftService.createShift(
        tenantId,
        branchId,
        shiftData,
        createdBy
      );

      res.status(201).json({
        success: true,
        message: 'Shift created successfully',
        data: shift
      });
    } catch (error) {
      logger.error('Create shift error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update shift
  async updateShift(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { shiftId } = req.params;
      const updateData = req.body;
      const updatedBy = req.user.userId;

      const shift = await ShiftService.updateShift(
        tenantId,
        branchId,
        shiftId,
        updateData,
        updatedBy
      );

      res.json({
        success: true,
        message: 'Shift updated successfully',
        data: shift
      });
    } catch (error) {
      logger.error('Update shift error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get shifts
  async getShifts(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const filters = {
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        type: req.query.type
      };

      const shifts = await ShiftService.getShifts(tenantId, branchId, filters);

      res.json({
        success: true,
        message: 'Shifts retrieved successfully',
        data: shifts
      });
    } catch (error) {
      logger.error('Get shifts error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get shift by ID
  async getShiftById(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { shiftId } = req.params;

      const shift = await ShiftService.getShiftById(tenantId, branchId, shiftId);

      res.json({
        success: true,
        message: 'Shift retrieved successfully',
        data: shift
      });
    } catch (error) {
      logger.error('Get shift by ID error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Assign employee to shift
  async assignEmployeeToShift(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const assignmentData = req.body;
      const assignedBy = req.user.userId;

      const assignment = await ShiftService.assignEmployeeToShift(
        tenantId,
        branchId,
        assignmentData,
        assignedBy
      );

      res.status(201).json({
        success: true,
        message: 'Employee assigned to shift successfully',
        data: assignment
      });
    } catch (error) {
      logger.error('Assign employee to shift error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Remove employee from shift
  async removeEmployeeFromShift(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { employeeId, shiftId } = req.params;
      const { endDate } = req.body;
      const removedBy = req.user.userId;

      const assignment = await ShiftService.removeEmployeeFromShift(
        tenantId,
        branchId,
        employeeId,
        shiftId,
        removedBy,
        endDate
      );

      res.json({
        success: true,
        message: 'Employee removed from shift successfully',
        data: assignment
      });
    } catch (error) {
      logger.error('Remove employee from shift error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get employee's current shift
  async getEmployeeCurrentShift(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { employeeId } = req.params;

      const currentShift = await ShiftService.getEmployeeCurrentShift(
        tenantId,
        branchId,
        employeeId
      );

      if (!currentShift) {
        return res.status(404).json({
          success: false,
          message: 'No active shift assignment found for employee'
        });
      }

      res.json({
        success: true,
        message: 'Employee current shift retrieved successfully',
        data: currentShift
      });
    } catch (error) {
      logger.error('Get employee current shift error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get employees in shift
  async getEmployeesInShift(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { shiftId } = req.params;
      const { date } = req.query;

      const employees = await ShiftService.getEmployeesInShift(
        tenantId,
        branchId,
        shiftId,
        date ? new Date(date) : undefined
      );

      res.json({
        success: true,
        message: 'Employees in shift retrieved successfully',
        data: employees
      });
    } catch (error) {
      logger.error('Get employees in shift error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get shift coverage report
  async getShiftCoverageReport(req, res) {
    try {
      const { tenantId, branchId } = req.user;

      const report = await ShiftService.getShiftCoverageReport(tenantId, branchId);

      res.json({
        success: true,
        message: 'Shift coverage report generated successfully',
        data: report
      });
    } catch (error) {
      logger.error('Get shift coverage report error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get shift distribution report
  async getShiftDistributionReport(req, res) {
    try {
      const { tenantId, branchId } = req.user;

      const report = await ShiftService.getShiftDistributionReport(tenantId, branchId);

      res.json({
        success: true,
        message: 'Shift distribution report generated successfully',
        data: report
      });
    } catch (error) {
      logger.error('Get shift distribution report error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get available shifts
  async getAvailableShifts(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { day } = req.query;

      if (!day) {
        return res.status(400).json({
          success: false,
          message: 'Day parameter is required'
        });
      }

      const availableShifts = await ShiftService.getAvailableShifts(
        tenantId,
        branchId,
        day.toUpperCase()
      );

      res.json({
        success: true,
        message: 'Available shifts retrieved successfully',
        data: availableShifts
      });
    } catch (error) {
      logger.error('Get available shifts error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete shift
  async deleteShift(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { shiftId } = req.params;
      const deletedBy = req.user.userId;

      const result = await ShiftService.deleteShift(
        tenantId,
        branchId,
        shiftId,
        deletedBy
      );

      res.json({
        success: true,
        message: 'Shift deleted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Delete shift error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Bulk assign employees
  async bulkAssignEmployees(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { assignments } = req.body;
      const assignedBy = req.user.userId;

      if (!Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Assignments array is required'
        });
      }

      const results = await ShiftService.bulkAssignEmployees(
        tenantId,
        branchId,
        assignments,
        assignedBy
      );

      res.json({
        success: true,
        message: 'Bulk employee assignment completed',
        data: results
      });
    } catch (error) {
      logger.error('Bulk assign employees error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new ShiftController();