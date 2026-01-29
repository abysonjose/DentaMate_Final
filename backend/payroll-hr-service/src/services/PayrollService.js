const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const PayrollRun = require('../models/PayrollRun');
const AttendanceService = require('./AttendanceService');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class PayrollService {
  constructor() {
    this.cache = CacheService;
    this.attendanceService = AttendanceService;
  }

  // Run payroll calculation
  async runPayroll(tenantId, branchId, month, options = {}) {
    try {
      const { employeeIds, recalculate = false, calculatedBy } = options;

      // Check if payroll already exists
      let payrollRun = await PayrollRun.findOne({
        tenantId,
        branchId,
        month
      });

      if (payrollRun && payrollRun.status === 'FINALIZED') {
        throw new Error('Payroll for this month is already finalized');
      }

      if (payrollRun && !recalculate) {
        throw new Error('Payroll for this month already exists. Use recalculate option to update.');
      }

      // Get employees for payroll calculation
      const employees = await this.getEmployeesForPayroll(tenantId, branchId, employeeIds);
      
      if (employees.length === 0) {
        throw new Error('No employees found for payroll calculation');
      }

      // Calculate payroll entries
      const payrollEntries = [];
      const calculationDetails = {
        startDate: moment(month, 'YYYY-MM').startOf('month').toDate(),
        endDate: moment(month, 'YYYY-MM').endOf('month').toDate(),
        workingDays: this.getWorkingDaysInMonth(month),
        calculatedAt: new Date(),
        calculatedBy
      };

      for (const employee of employees) {
        try {
          const payrollEntry = await this.calculateEmployeePayroll(
            tenantId, 
            branchId, 
            employee, 
            month, 
            calculationDetails.workingDays
          );
          payrollEntries.push(payrollEntry);
        } catch (error) {
          logger.error(`Failed to calculate payroll for employee ${employee.employeeId}:`, error);
          // Continue with other employees
        }
      }

      if (payrollEntries.length === 0) {
        throw new Error('Failed to calculate payroll for any employee');
      }

      // Create or update payroll run
      if (payrollRun) {
        // Update existing payroll run
        payrollRun.payrollEntries = payrollEntries;
        payrollRun.calculationDetails = calculationDetails;
        payrollRun.status = 'CALCULATED';
        payrollRun.updatedBy = calculatedBy;
        payrollRun.addAuditLog('RECALCULATED', calculatedBy, 'Payroll recalculated');
      } else {
        // Create new payroll run
        payrollRun = new PayrollRun({
          payrollId: uuidv4(),
          tenantId,
          branchId,
          month,
          status: 'CALCULATED',
          totalEmployees: payrollEntries.length,
          payrollEntries,
          calculationDetails,
          createdBy: calculatedBy
        });
        payrollRun.addAuditLog('CALCULATED', calculatedBy, 'Payroll calculated');
      }

      await payrollRun.save();

      // Cache the calculation
      await this.cache.cachePayrollCalculation(tenantId, branchId, month, payrollRun);

      logger.info('Payroll calculation completed', {
        payrollId: payrollRun.payrollId,
        month,
        employeeCount: payrollEntries.length,
        totalNetPay: payrollRun.totalNetPay
      });

      return payrollRun;
    } catch (error) {
      logger.error('Failed to run payroll:', error);
      throw error;
    }
  }

  // Calculate individual employee payroll
  async calculateEmployeePayroll(tenantId, branchId, employee, month, workingDays) {
    try {
      // Get attendance summary
      const attendanceSummary = await this.attendanceService.getAttendanceSummary(
        tenantId, 
        branchId, 
        employee.employeeId, 
        month
      );

      // Get salary structure
      const salaryStructure = await this.getSalaryStructure(tenantId, employee.employeeId);

      // Calculate basic components
      const basicSalary = salaryStructure.basic || 0;
      const dailyRate = basicSalary / workingDays;

      // Calculate allowances
      const allowances = {
        hra: salaryStructure.allowances?.hra || 0,
        medical: salaryStructure.allowances?.medical || 0,
        transport: salaryStructure.allowances?.transport || 0,
        special: salaryStructure.allowances?.special || 0,
        overtime: this.calculateOvertimeAllowance(
          attendanceSummary.totalOvertimeHours, 
          salaryStructure.overtimeRate || 0
        ),
        bonus: salaryStructure.allowances?.bonus || 0
      };

      // Calculate deductions
      const grossPay = basicSalary + Object.values(allowances).reduce((sum, val) => sum + val, 0);
      
      const deductions = {
        pf: this.calculatePF(basicSalary, salaryStructure.pfRate || 0.12),
        esi: this.calculateESI(grossPay, salaryStructure.esiRate || 0.0075),
        professionalTax: salaryStructure.deductions?.professionalTax || 0,
        tds: this.calculateTDS(grossPay, salaryStructure.tdsRate || 0),
        advance: salaryStructure.deductions?.advance || 0,
        lop: this.calculateLOP(attendanceSummary.lossOfPayDays, dailyRate),
        other: salaryStructure.deductions?.other || 0
      };

      const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
      const netPay = grossPay - totalDeductions;

      return {
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department,
        designation: employee.designation,
        basicSalary,
        allowances,
        deductions,
        attendance: {
          totalDays: attendanceSummary.totalDays,
          presentDays: attendanceSummary.presentDays,
          absentDays: attendanceSummary.absentDays,
          leaveDays: attendanceSummary.leaveDays,
          halfDays: attendanceSummary.halfDays,
          workingHours: attendanceSummary.totalWorkingHours,
          overtimeHours: attendanceSummary.totalOvertimeHours
        },
        grossPay,
        totalDeductions,
        netPay,
        payslipGenerated: false
      };
    } catch (error) {
      logger.error(`Failed to calculate payroll for employee ${employee.employeeId}:`, error);
      throw error;
    }
  }

  // Finalize payroll
  async finalizePayroll(tenantId, branchId, month, finalizedBy, remarks) {
    try {
      const payrollRun = await PayrollRun.findOne({
        tenantId,
        branchId,
        month
      });

      if (!payrollRun) {
        throw new Error('Payroll run not found');
      }

      if (payrollRun.status === 'FINALIZED') {
        throw new Error('Payroll is already finalized');
      }

      if (payrollRun.status !== 'CALCULATED') {
        throw new Error('Payroll must be calculated before finalization');
      }

      // Finalize the payroll
      payrollRun.finalize(finalizedBy, remarks);
      await payrollRun.save();

      // Mark all attendance records as payroll finalized
      await this.markAttendanceAsFinalized(tenantId, branchId, month);

      // Send to accounting service
      await this.sendToAccountingService(payrollRun);

      // Invalidate cache
      await this.cache.invalidatePayrollCache(tenantId, branchId, month);

      logger.info('Payroll finalized successfully', {
        payrollId: payrollRun.payrollId,
        month,
        totalNetPay: payrollRun.totalNetPay,
        finalizedBy
      });

      return payrollRun;
    } catch (error) {
      logger.error('Failed to finalize payroll:', error);
      throw error;
    }
  }

  // Get payroll summary
  async getPayrollSummary(tenantId, branchId, month) {
    try {
      // Check cache first
      const cached = await this.cache.getPayrollCalculation(tenantId, branchId, month);
      if (cached) {
        return cached;
      }

      const payrollRun = await PayrollRun.findOne({
        tenantId,
        branchId,
        month
      });

      if (!payrollRun) {
        throw new Error('Payroll run not found');
      }

      // Cache the result
      await this.cache.cachePayrollCalculation(tenantId, branchId, month, payrollRun);

      return payrollRun;
    } catch (error) {
      logger.error('Failed to get payroll summary:', error);
      throw error;
    }
  }

  // Get department-wise payroll cost
  async getDepartmentWiseReport(tenantId, branchId, month) {
    try {
      // Check cache first
      const cached = await this.cache.getDepartmentReport(tenantId, branchId, month);
      if (cached) {
        return cached;
      }

      const report = await PayrollRun.getDepartmentWiseCost(tenantId, branchId, month);

      // Cache the result
      await this.cache.cacheDepartmentReport(tenantId, branchId, month, report);

      return report;
    } catch (error) {
      logger.error('Failed to get department-wise report:', error);
      throw error;
    }
  }

  // Helper methods
  async getEmployeesForPayroll(tenantId, branchId, employeeIds) {
    try {
      // This would typically call the user-staff-service
      // For now, returning mock data structure
      const mockEmployees = [
        {
          employeeId: 'emp-001',
          name: 'John Doe',
          department: 'Clinical',
          designation: 'Doctor',
          isActive: true
        }
      ];

      return mockEmployees.filter(emp => 
        !employeeIds || employeeIds.includes(emp.employeeId)
      );
    } catch (error) {
      logger.error('Failed to get employees for payroll:', error);
      throw error;
    }
  }

  async getSalaryStructure(tenantId, employeeId) {
    try {
      // Check cache first
      const cached = await this.cache.getSalaryStructure(tenantId, employeeId);
      if (cached) {
        return cached;
      }

      // This would typically call the user-staff-service or HR service
      // For now, returning mock salary structure
      const mockSalaryStructure = {
        basic: 50000,
        allowances: {
          hra: 15000,
          medical: 2000,
          transport: 3000,
          special: 5000,
          bonus: 0
        },
        deductions: {
          professionalTax: 200,
          advance: 0,
          other: 0
        },
        pfRate: 0.12,
        esiRate: 0.0075,
        tdsRate: 0.1,
        overtimeRate: 200
      };

      // Cache the result
      await this.cache.cacheSalaryStructure(tenantId, employeeId, mockSalaryStructure);

      return mockSalaryStructure;
    } catch (error) {
      logger.error('Failed to get salary structure:', error);
      throw error;
    }
  }

  calculateOvertimeAllowance(overtimeHours, hourlyRate) {
    return overtimeHours * hourlyRate;
  }

  calculatePF(basicSalary, pfRate) {
    return Math.round(basicSalary * pfRate);
  }

  calculateESI(grossPay, esiRate) {
    // ESI is applicable only if gross pay is below threshold (21,000 in India)
    if (grossPay > 21000) return 0;
    return Math.round(grossPay * esiRate);
  }

  calculateTDS(grossPay, tdsRate) {
    // Simplified TDS calculation
    const annualSalary = grossPay * 12;
    const exemptionLimit = 250000; // Basic exemption limit
    
    if (annualSalary <= exemptionLimit) return 0;
    
    const taxableAmount = annualSalary - exemptionLimit;
    const annualTDS = taxableAmount * tdsRate;
    return Math.round(annualTDS / 12);
  }

  calculateLOP(lopDays, dailyRate) {
    return Math.round(lopDays * dailyRate);
  }

  getWorkingDaysInMonth(month) {
    const startOfMonth = moment(month, 'YYYY-MM').startOf('month');
    const endOfMonth = moment(month, 'YYYY-MM').endOf('month');
    
    let workingDays = 0;
    const current = startOfMonth.clone();
    
    while (current.isSameOrBefore(endOfMonth)) {
      // Exclude Sundays (0 = Sunday)
      if (current.day() !== 0) {
        workingDays++;
      }
      current.add(1, 'day');
    }
    
    return workingDays;
  }

  async markAttendanceAsFinalized(tenantId, branchId, month) {
    try {
      const Attendance = require('../models/Attendance');
      
      await Attendance.updateMany(
        {
          tenantId,
          branchId,
          payrollMonth: month
        },
        {
          $set: { isPayrollFinalized: true }
        }
      );

      logger.info('Attendance records marked as finalized', { tenantId, branchId, month });
    } catch (error) {
      logger.error('Failed to mark attendance as finalized:', error);
      throw error;
    }
  }

  async sendToAccountingService(payrollRun) {
    try {
      // This would send payroll summary to accounting-finance-service
      const summary = {
        tenantId: payrollRun.tenantId,
        branchId: payrollRun.branchId,
        month: payrollRun.month,
        totalEmployees: payrollRun.totalEmployees,
        totalGrossPay: payrollRun.totalGrossPay,
        totalDeductions: payrollRun.totalDeductions,
        totalNetPay: payrollRun.totalNetPay,
        finalizedAt: payrollRun.finalizationDetails.finalizedAt
      };

      logger.info('Payroll summary prepared for accounting service', {
        payrollId: payrollRun.payrollId,
        summary
      });

      // TODO: Implement actual HTTP call to accounting service
      return summary;
    } catch (error) {
      logger.error('Failed to send payroll to accounting service:', error);
      throw error;
    }
  }
}

module.exports = new PayrollService();