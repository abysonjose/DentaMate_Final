const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const PayrollRun = require('../models/PayrollRun');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class PayslipService {
  constructor() {
    this.cache = CacheService;
    this.payslipStoragePath = process.env.PAYSLIP_STORAGE_PATH || './storage/payslips';
    this.ensureStorageDirectory();
  }

  ensureStorageDirectory() {
    if (!fs.existsSync(this.payslipStoragePath)) {
      fs.mkdirSync(this.payslipStoragePath, { recursive: true });
    }
  }

  // Generate payslip for employee
  async generatePayslip(tenantId, branchId, employeeId, month) {
    try {
      // Check cache first
      const cached = await this.cache.getPayslip(tenantId, employeeId, month);
      if (cached && cached.filePath && fs.existsSync(cached.filePath)) {
        return cached;
      }

      // Get payroll data
      const payrollRun = await PayrollRun.findOne({
        tenantId,
        branchId,
        month,
        status: 'FINALIZED'
      });

      if (!payrollRun) {
        throw new Error('Finalized payroll not found for the specified month');
      }

      const employeePayroll = payrollRun.payrollEntries.find(
        entry => entry.employeeId === employeeId
      );

      if (!employeePayroll) {
        throw new Error('Employee payroll data not found');
      }

      // Generate PDF
      const fileName = `payslip_${employeeId}_${month}.pdf`;
      const filePath = path.join(this.payslipStoragePath, fileName);
      
      await this.createPayslipPDF(employeePayroll, payrollRun, filePath);

      // Update payroll entry
      employeePayroll.payslipGenerated = true;
      employeePayroll.payslipPath = filePath;
      await payrollRun.save();

      const payslipData = {
        employeeId,
        month,
        fileName,
        filePath,
        generatedAt: new Date(),
        payrollData: employeePayroll
      };

      // Cache the result
      await this.cache.cachePayslip(tenantId, employeeId, month, payslipData);

      logger.info('Payslip generated successfully', {
        employeeId,
        month,
        fileName
      });

      return payslipData;
    } catch (error) {
      logger.error('Failed to generate payslip:', error);
      throw error;
    }
  }

  // Create PDF payslip
  async createPayslipPDF(employeePayroll, payrollRun, filePath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('PAYSLIP', { align: 'center' });
        doc.moveDown();

        // Company info (would come from tenant data)
        doc.fontSize(12)
           .text('DentaMate Clinic', { align: 'center' })
           .text('Payroll Period: ' + payrollRun.month, { align: 'center' });
        doc.moveDown();

        // Employee details
        doc.fontSize(14).text('Employee Details:', { underline: true });
        doc.fontSize(10)
           .text(`Name: ${employeePayroll.employeeName}`)
           .text(`Employee ID: ${employeePayroll.employeeId}`)
           .text(`Department: ${employeePayroll.department}`)
           .text(`Designation: ${employeePayroll.designation}`);
        doc.moveDown();

        // Attendance details
        doc.fontSize(14).text('Attendance Summary:', { underline: true });
        doc.fontSize(10)
           .text(`Total Days: ${employeePayroll.attendance.totalDays}`)
           .text(`Present Days: ${employeePayroll.attendance.presentDays}`)
           .text(`Absent Days: ${employeePayroll.attendance.absentDays}`)
           .text(`Leave Days: ${employeePayroll.attendance.leaveDays}`)
           .text(`Half Days: ${employeePayroll.attendance.halfDays}`)
           .text(`Working Hours: ${employeePayroll.attendance.workingHours}`)
           .text(`Overtime Hours: ${employeePayroll.attendance.overtimeHours}`);
        doc.moveDown();

        // Earnings table
        doc.fontSize(14).text('Earnings:', { underline: true });
        doc.fontSize(10);
        
        let yPosition = doc.y;
        doc.text('Description', 50, yPosition);
        doc.text('Amount (₹)', 400, yPosition, { align: 'right' });
        doc.moveDown(0.5);
        
        // Draw line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Basic salary
        yPosition = doc.y;
        doc.text('Basic Salary', 50, yPosition);
        doc.text(employeePayroll.basicSalary.toFixed(2), 400, yPosition, { align: 'right' });
        doc.moveDown(0.5);

        // Allowances
        Object.entries(employeePayroll.allowances).forEach(([key, value]) => {
          if (value > 0) {
            yPosition = doc.y;
            doc.text(this.formatAllowanceName(key), 50, yPosition);
            doc.text(value.toFixed(2), 400, yPosition, { align: 'right' });
            doc.moveDown(0.5);
          }
        });

        // Gross pay
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        yPosition = doc.y;
        doc.fontSize(12).text('Gross Pay', 50, yPosition);
        doc.text(employeePayroll.grossPay.toFixed(2), 400, yPosition, { align: 'right' });
        doc.fontSize(10);
        doc.moveDown();

        // Deductions table
        doc.fontSize(14).text('Deductions:', { underline: true });
        doc.fontSize(10);
        
        yPosition = doc.y;
        doc.text('Description', 50, yPosition);
        doc.text('Amount (₹)', 400, yPosition, { align: 'right' });
        doc.moveDown(0.5);
        
        // Draw line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Deductions
        Object.entries(employeePayroll.deductions).forEach(([key, value]) => {
          if (value > 0) {
            yPosition = doc.y;
            doc.text(this.formatDeductionName(key), 50, yPosition);
            doc.text(value.toFixed(2), 400, yPosition, { align: 'right' });
            doc.moveDown(0.5);
          }
        });

        // Total deductions
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        yPosition = doc.y;
        doc.fontSize(12).text('Total Deductions', 50, yPosition);
        doc.text(employeePayroll.totalDeductions.toFixed(2), 400, yPosition, { align: 'right' });
        doc.fontSize(10);
        doc.moveDown();

        // Net pay
        doc.fontSize(16).fillColor('green');
        yPosition = doc.y;
        doc.text('Net Pay', 50, yPosition);
        doc.text('₹ ' + employeePayroll.netPay.toFixed(2), 400, yPosition, { align: 'right' });
        doc.fillColor('black');
        doc.moveDown();

        // Footer
        doc.fontSize(8)
           .text('This is a computer-generated payslip and does not require a signature.', { align: 'center' })
           .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Bulk generate payslips
  async bulkGeneratePayslips(tenantId, branchId, month, employeeIds) {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [],
        payslips: []
      };

      const payrollRun = await PayrollRun.findOne({
        tenantId,
        branchId,
        month,
        status: 'FINALIZED'
      });

      if (!payrollRun) {
        throw new Error('Finalized payroll not found for the specified month');
      }

      const employeesToProcess = employeeIds || 
        payrollRun.payrollEntries.map(entry => entry.employeeId);

      for (const employeeId of employeesToProcess) {
        try {
          const payslip = await this.generatePayslip(tenantId, branchId, employeeId, month);
          results.success++;
          results.payslips.push(payslip);
        } catch (error) {
          results.failed++;
          results.errors.push({
            employeeId,
            error: error.message
          });
        }
      }

      logger.info('Bulk payslip generation completed', {
        tenantId,
        branchId,
        month,
        total: employeesToProcess.length,
        success: results.success,
        failed: results.failed
      });

      return results;
    } catch (error) {
      logger.error('Failed to bulk generate payslips:', error);
      throw error;
    }
  }

  // Get payslip data
  async getPayslipData(tenantId, branchId, employeeId, month) {
    try {
      // Check cache first
      const cached = await this.cache.getPayslip(tenantId, employeeId, month);
      if (cached) {
        return cached;
      }

      const payrollRun = await PayrollRun.findOne({
        tenantId,
        branchId,
        month,
        status: 'FINALIZED'
      });

      if (!payrollRun) {
        throw new Error('Finalized payroll not found');
      }

      const employeePayroll = payrollRun.payrollEntries.find(
        entry => entry.employeeId === employeeId
      );

      if (!employeePayroll) {
        throw new Error('Employee payroll data not found');
      }

      return {
        employeeId,
        month,
        payrollData: employeePayroll,
        payslipGenerated: employeePayroll.payslipGenerated,
        payslipPath: employeePayroll.payslipPath
      };
    } catch (error) {
      logger.error('Failed to get payslip data:', error);
      throw error;
    }
  }

  // Download payslip file
  async downloadPayslip(tenantId, branchId, employeeId, month) {
    try {
      const payslipData = await this.getPayslipData(tenantId, branchId, employeeId, month);

      if (!payslipData.payslipGenerated || !payslipData.payslipPath) {
        // Generate payslip if not exists
        const generated = await this.generatePayslip(tenantId, branchId, employeeId, month);
        return {
          filePath: generated.filePath,
          fileName: generated.fileName
        };
      }

      if (!fs.existsSync(payslipData.payslipPath)) {
        // Regenerate if file doesn't exist
        const generated = await this.generatePayslip(tenantId, branchId, employeeId, month);
        return {
          filePath: generated.filePath,
          fileName: generated.fileName
        };
      }

      return {
        filePath: payslipData.payslipPath,
        fileName: path.basename(payslipData.payslipPath)
      };
    } catch (error) {
      logger.error('Failed to download payslip:', error);
      throw error;
    }
  }

  // Helper methods
  formatAllowanceName(key) {
    const names = {
      hra: 'House Rent Allowance',
      medical: 'Medical Allowance',
      transport: 'Transport Allowance',
      special: 'Special Allowance',
      overtime: 'Overtime Allowance',
      bonus: 'Bonus'
    };
    return names[key] || key.toUpperCase();
  }

  formatDeductionName(key) {
    const names = {
      pf: 'Provident Fund',
      esi: 'Employee State Insurance',
      professionalTax: 'Professional Tax',
      tds: 'Tax Deducted at Source',
      advance: 'Advance Recovery',
      lop: 'Loss of Pay',
      other: 'Other Deductions'
    };
    return names[key] || key.toUpperCase();
  }

  // Clean up old payslips
  async cleanupOldPayslips(retentionMonths = 12) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

      const files = fs.readdirSync(this.payslipStoragePath);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.payslipStoragePath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      logger.info('Old payslips cleaned up', {
        deletedCount,
        retentionMonths
      });

      return { deletedCount };
    } catch (error) {
      logger.error('Failed to cleanup old payslips:', error);
      throw error;
    }
  }
}

module.exports = new PayslipService();