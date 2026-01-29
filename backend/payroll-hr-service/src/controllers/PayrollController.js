const PayrollService = require('../services/PayrollService');
const logger = require('../utils/logger');

class PayrollController {
  // Run payroll calculation
  async runPayroll(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { month, employeeIds, recalculate } = req.body;
      const calculatedBy = req.user.userId;

      // Check permissions
      if (!req.user.payrollAccess?.canCalculatePayroll) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to calculate payroll'
        });
      }

      const payrollRun = await PayrollService.runPayroll(
        tenantId,
        branchId,
        month,
        {
          employeeIds,
          recalculate,
          calculatedBy
        }
      );

      res.json({
        success: true,
        message: 'Payroll calculation completed successfully',
        data: {
          payrollId: payrollRun.payrollId,
          month: payrollRun.month,
          status: payrollRun.status,
          totalEmployees: payrollRun.totalEmployees,
          totalGrossPay: payrollRun.totalGrossPay,
          totalDeductions: payrollRun.totalDeductions,
          totalNetPay: payrollRun.totalNetPay,
          calculatedAt: payrollRun.calculationDetails.calculatedAt
        }
      });
    } catch (error) {
      logger.error('Run payroll error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Finalize payroll
  async finalizePayroll(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { month } = req.params;
      const { remarks } = req.body;
      const finalizedBy = req.user.userId;

      // Check permissions
      if (!req.user.payrollAccess?.canFinalizePayroll) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to finalize payroll'
        });
      }

      const payrollRun = await PayrollService.finalizePayroll(
        tenantId,
        branchId,
        month,
        finalizedBy,
        remarks
      );

      res.json({
        success: true,
        message: 'Payroll finalized successfully',
        data: {
          payrollId: payrollRun.payrollId,
          month: payrollRun.month,
          status: payrollRun.status,
          totalNetPay: payrollRun.totalNetPay,
          finalizedAt: payrollRun.finalizationDetails.finalizedAt
        }
      });
    } catch (error) {
      logger.error('Finalize payroll error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get payroll summary
  async getPayrollSummary(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { month } = req.params;

      const payrollRun = await PayrollService.getPayrollSummary(
        tenantId,
        branchId,
        month
      );

      // Filter sensitive data for read-only roles
      let responseData = payrollRun;
      if (req.user.payrollAccess?.readOnly) {
        responseData = {
          payrollId: payrollRun.payrollId,
          month: payrollRun.month,
          status: payrollRun.status,
          totalEmployees: payrollRun.totalEmployees,
          totalGrossPay: payrollRun.totalGrossPay,
          totalDeductions: payrollRun.totalDeductions,
          totalNetPay: payrollRun.totalNetPay,
          calculationDetails: payrollRun.calculationDetails,
          finalizationDetails: payrollRun.finalizationDetails
        };
      }

      res.json({
        success: true,
        message: 'Payroll summary retrieved successfully',
        data: responseData
      });
    } catch (error) {
      logger.error('Get payroll summary error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get department-wise report
  async getDepartmentWiseReport(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { month } = req.params;

      const report = await PayrollService.getDepartmentWiseReport(
        tenantId,
        branchId,
        month
      );

      res.json({
        success: true,
        message: 'Department-wise payroll report generated successfully',
        data: {
          month,
          branchId,
          reportGeneratedAt: new Date(),
          departments: report
        }
      });
    } catch (error) {
      logger.error('Get department-wise report error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get payroll history
  async getPayrollHistory(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { page = 1, limit = 10 } = req.query;

      const PayrollRun = require('../models/PayrollRun');
      
      const skip = (page - 1) * limit;
      const [payrollRuns, total] = await Promise.all([
        PayrollRun.find({ tenantId, branchId })
          .select('payrollId month status totalEmployees totalNetPay calculationDetails finalizationDetails')
          .sort({ month: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        PayrollRun.countDocuments({ tenantId, branchId })
      ]);

      res.json({
        success: true,
        message: 'Payroll history retrieved successfully',
        data: payrollRuns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get payroll history error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get employee payroll details
  async getEmployeePayrollDetails(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { month, employeeId } = req.params;

      const PayrollRun = require('../models/PayrollRun');
      
      const payrollRun = await PayrollRun.findOne({
        tenantId,
        branchId,
        month
      });

      if (!payrollRun) {
        return res.status(404).json({
          success: false,
          message: 'Payroll run not found'
        });
      }

      const employeePayroll = payrollRun.payrollEntries.find(
        entry => entry.employeeId === employeeId
      );

      if (!employeePayroll) {
        return res.status(404).json({
          success: false,
          message: 'Employee payroll data not found'
        });
      }

      res.json({
        success: true,
        message: 'Employee payroll details retrieved successfully',
        data: {
          month,
          payrollStatus: payrollRun.status,
          employee: employeePayroll
        }
      });
    } catch (error) {
      logger.error('Get employee payroll details error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Cancel payroll
  async cancelPayroll(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { month } = req.params;
      const { reason } = req.body;
      const cancelledBy = req.user.userId;

      // Check permissions
      if (!req.user.payrollAccess?.canFinalizePayroll) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to cancel payroll'
        });
      }

      const PayrollRun = require('../models/PayrollRun');
      
      const payrollRun = await PayrollRun.findOne({
        tenantId,
        branchId,
        month
      });

      if (!payrollRun) {
        return res.status(404).json({
          success: false,
          message: 'Payroll run not found'
        });
      }

      if (payrollRun.status === 'FINALIZED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel finalized payroll'
        });
      }

      payrollRun.status = 'CANCELLED';
      payrollRun.updatedBy = cancelledBy;
      payrollRun.addAuditLog('CANCELLED', cancelledBy, reason || 'Payroll cancelled');

      await payrollRun.save();

      res.json({
        success: true,
        message: 'Payroll cancelled successfully',
        data: {
          payrollId: payrollRun.payrollId,
          month: payrollRun.month,
          status: payrollRun.status
        }
      });
    } catch (error) {
      logger.error('Cancel payroll error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get payroll statistics
  async getPayrollStatistics(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { year } = req.query;

      const PayrollRun = require('../models/PayrollRun');
      
      const matchQuery = { tenantId, branchId, status: 'FINALIZED' };
      if (year) {
        matchQuery.year = parseInt(year);
      }

      const statistics = await PayrollRun.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalPayrolls: { $sum: 1 },
            totalEmployees: { $sum: '$totalEmployees' },
            totalGrossPay: { $sum: '$totalGrossPay' },
            totalDeductions: { $sum: '$totalDeductions' },
            totalNetPay: { $sum: '$totalNetPay' },
            avgGrossPay: { $avg: '$totalGrossPay' },
            avgNetPay: { $avg: '$totalNetPay' },
            monthlyBreakdown: {
              $push: {
                month: '$month',
                employees: '$totalEmployees',
                grossPay: '$totalGrossPay',
                netPay: '$totalNetPay'
              }
            }
          }
        }
      ]);

      const result = statistics.length > 0 ? statistics[0] : {
        totalPayrolls: 0,
        totalEmployees: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        avgGrossPay: 0,
        avgNetPay: 0,
        monthlyBreakdown: []
      };

      res.json({
        success: true,
        message: 'Payroll statistics retrieved successfully',
        data: {
          year: year || 'All',
          statistics: result
        }
      });
    } catch (error) {
      logger.error('Get payroll statistics error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new PayrollController();