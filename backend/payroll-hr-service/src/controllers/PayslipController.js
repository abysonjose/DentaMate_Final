const PayslipService = require('../services/PayslipService');
const logger = require('../utils/logger');
const fs = require('fs');

class PayslipController {
  // Generate payslip
  async generatePayslip(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { employeeId, month } = req.params;

      // Check permissions
      if (!req.user.payrollAccess?.canGeneratePayslips) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to generate payslips'
        });
      }

      const payslip = await PayslipService.generatePayslip(
        tenantId,
        branchId,
        employeeId,
        month
      );

      res.json({
        success: true,
        message: 'Payslip generated successfully',
        data: {
          employeeId: payslip.employeeId,
          month: payslip.month,
          fileName: payslip.fileName,
          generatedAt: payslip.generatedAt
        }
      });
    } catch (error) {
      logger.error('Generate payslip error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Download payslip
  async downloadPayslip(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { employeeId, month } = req.params;

      // Check permissions - employees can download their own payslips
      const canDownload = req.user.payrollAccess?.canGeneratePayslips || 
                         req.user.employeeId === employeeId;

      if (!canDownload) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to download payslip'
        });
      }

      const payslipFile = await PayslipService.downloadPayslip(
        tenantId,
        branchId,
        employeeId,
        month
      );

      if (!fs.existsSync(payslipFile.filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Payslip file not found'
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${payslipFile.fileName}"`);
      
      const fileStream = fs.createReadStream(payslipFile.filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        logger.error('File stream error:', error);
        res.status(500).json({
          success: false,
          message: 'Error downloading payslip'
        });
      });

    } catch (error) {
      logger.error('Download payslip error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get payslip data
  async getPayslipData(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { employeeId, month } = req.params;

      // Check permissions
      const canView = req.user.payrollAccess?.canViewPayroll || 
                     req.user.employeeId === employeeId;

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view payslip data'
        });
      }

      const payslipData = await PayslipService.getPayslipData(
        tenantId,
        branchId,
        employeeId,
        month
      );

      // Filter sensitive data for employees viewing their own payslips
      let responseData = payslipData;
      if (req.user.employeeId === employeeId && req.user.role === 'EMPLOYEE') {
        responseData = {
          employeeId: payslipData.employeeId,
          month: payslipData.month,
          payslipGenerated: payslipData.payslipGenerated,
          payrollData: {
            employeeName: payslipData.payrollData.employeeName,
            department: payslipData.payrollData.department,
            designation: payslipData.payrollData.designation,
            basicSalary: payslipData.payrollData.basicSalary,
            allowances: payslipData.payrollData.allowances,
            deductions: payslipData.payrollData.deductions,
            attendance: payslipData.payrollData.attendance,
            grossPay: payslipData.payrollData.grossPay,
            totalDeductions: payslipData.payrollData.totalDeductions,
            netPay: payslipData.payrollData.netPay
          }
        };
      }

      res.json({
        success: true,
        message: 'Payslip data retrieved successfully',
        data: responseData
      });
    } catch (error) {
      logger.error('Get payslip data error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Bulk generate payslips
  async bulkGeneratePayslips(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { month, employeeIds } = req.body;

      // Check permissions
      if (!req.user.payrollAccess?.canGeneratePayslips) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to generate payslips'
        });
      }

      const results = await PayslipService.bulkGeneratePayslips(
        tenantId,
        branchId,
        month,
        employeeIds
      );

      res.json({
        success: true,
        message: 'Bulk payslip generation completed',
        data: {
          month,
          totalProcessed: results.success + results.failed,
          successful: results.success,
          failed: results.failed,
          errors: results.errors,
          payslips: results.payslips.map(p => ({
            employeeId: p.employeeId,
            fileName: p.fileName,
            generatedAt: p.generatedAt
          }))
        }
      });
    } catch (error) {
      logger.error('Bulk generate payslips error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get employee payslip history
  async getEmployeePayslipHistory(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { employeeId } = req.params;
      const { page = 1, limit = 12 } = req.query; // Default to 12 months

      // Check permissions
      const canView = req.user.payrollAccess?.canViewPayroll || 
                     req.user.employeeId === employeeId;

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view payslip history'
        });
      }

      const PayrollRun = require('../models/PayrollRun');
      
      const skip = (page - 1) * limit;
      const [payrollRuns, total] = await Promise.all([
        PayrollRun.find({
          tenantId,
          branchId,
          status: 'FINALIZED',
          'payrollEntries.employeeId': employeeId
        })
        .select('month status payrollEntries.$')
        .sort({ month: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
        PayrollRun.countDocuments({
          tenantId,
          branchId,
          status: 'FINALIZED',
          'payrollEntries.employeeId': employeeId
        })
      ]);

      const history = payrollRuns.map(run => {
        const employeeEntry = run.payrollEntries.find(e => e.employeeId === employeeId);
        return {
          month: run.month,
          status: run.status,
          netPay: employeeEntry?.netPay || 0,
          payslipGenerated: employeeEntry?.payslipGenerated || false
        };
      });

      res.json({
        success: true,
        message: 'Employee payslip history retrieved successfully',
        data: {
          employeeId,
          history,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Get employee payslip history error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get payslip generation status
  async getPayslipGenerationStatus(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { month } = req.params;

      const PayrollRun = require('../models/PayrollRun');
      
      const payrollRun = await PayrollRun.findOne({
        tenantId,
        branchId,
        month,
        status: 'FINALIZED'
      }).select('payrollEntries.employeeId payrollEntries.employeeName payrollEntries.payslipGenerated');

      if (!payrollRun) {
        return res.status(404).json({
          success: false,
          message: 'Finalized payroll not found for the specified month'
        });
      }

      const status = payrollRun.payrollEntries.map(entry => ({
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        payslipGenerated: entry.payslipGenerated
      }));

      const summary = {
        totalEmployees: status.length,
        payslipsGenerated: status.filter(s => s.payslipGenerated).length,
        payslipsPending: status.filter(s => !s.payslipGenerated).length
      };

      res.json({
        success: true,
        message: 'Payslip generation status retrieved successfully',
        data: {
          month,
          summary,
          employees: status
        }
      });
    } catch (error) {
      logger.error('Get payslip generation status error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Cleanup old payslips
  async cleanupOldPayslips(req, res) {
    try {
      const { retentionMonths = 12 } = req.body;

      // Check permissions - only payroll officers can cleanup
      if (!req.user.payrollAccess?.canGeneratePayslips) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to cleanup payslips'
        });
      }

      const result = await PayslipService.cleanupOldPayslips(retentionMonths);

      res.json({
        success: true,
        message: 'Old payslips cleaned up successfully',
        data: {
          deletedCount: result.deletedCount,
          retentionMonths
        }
      });
    } catch (error) {
      logger.error('Cleanup old payslips error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new PayslipController();