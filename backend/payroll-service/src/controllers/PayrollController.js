const PayrollCycle = require('../models/PayrollCycle');
const EmployeePayroll = require('../models/EmployeePayroll');
const PayrollService = require('../services/PayrollService');
const logger = require('../utils/logger');

class PayrollController {
  // Dashboard Stats
  static async getDashboardStats(req, res) {
    try {
      const { tenantId } = req;
      const stats = await PayrollService.getDashboardStats(tenantId);
      res.json(stats);
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Payroll Cycles
  static async getPayrollCycles(req, res) {
    try {
      const { tenantId } = req;
      const cycles = await PayrollCycle.findByTenant(tenantId);
      res.json(cycles);
    } catch (error) {
      logger.error('Error fetching payroll cycles:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getPayrollCycle(req, res) {
    try {
      const { tenantId } = req;
      const { id } = req.params;
      
      const cycle = await PayrollCycle.findOne({ 
        _id: id, 
        tenantId, 
        isDeleted: false 
      });
      
      if (!cycle) {
        return res.status(404).json({ error: 'Payroll cycle not found' });
      }
      
      res.json(cycle);
    } catch (error) {
      logger.error('Error fetching payroll cycle:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async createPayrollCycle(req, res) {
    try {
      const { tenantId, userId } = req;
      const cycleData = {
        ...req.body,
        tenantId,
        createdBy: userId
      };

      // Check if cycle already exists for this month/year
      const existingCycle = await PayrollCycle.findOne({
        tenantId,
        month: cycleData.month,
        year: cycleData.year,
        isDeleted: false
      });

      if (existingCycle) {
        return res.status(400).json({ 
          error: 'Payroll cycle already exists for this month and year' 
        });
      }

      const cycle = new PayrollCycle(cycleData);
      await cycle.save();

      // Initialize employee payroll records
      await PayrollService.initializeEmployeePayroll(cycle._id, tenantId, userId);

      logger.info('Payroll cycle created', { 
        cycleId: cycle._id, 
        month: cycle.month, 
        year: cycle.year,
        tenantId 
      });

      res.status(201).json(cycle);
    } catch (error) {
      logger.error('Error creating payroll cycle:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async updatePayrollCycle(req, res) {
    try {
      const { tenantId, userId } = req;
      const { id } = req.params;
      
      const cycle = await PayrollCycle.findOne({ 
        _id: id, 
        tenantId, 
        isDeleted: false 
      });
      
      if (!cycle) {
        return res.status(404).json({ error: 'Payroll cycle not found' });
      }

      // Check if cycle can be updated
      if (cycle.status === 'finalized') {
        return res.status(400).json({ 
          error: 'Cannot update finalized payroll cycle' 
        });
      }

      Object.assign(cycle, req.body);
      cycle.updatedBy = userId;
      cycle.addAuditLog('updated', userId, req.body);
      
      await cycle.save();
      
      logger.info('Payroll cycle updated', { 
        cycleId: cycle._id, 
        tenantId,
        updatedBy: userId 
      });
      
      res.json(cycle);
    } catch (error) {
      logger.error('Error updating payroll cycle:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async processPayroll(req, res) {
    try {
      const { tenantId, userId } = req;
      const { id } = req.params;
      
      const cycle = await PayrollCycle.findOne({ 
        _id: id, 
        tenantId, 
        isDeleted: false 
      });
      
      if (!cycle) {
        return res.status(404).json({ error: 'Payroll cycle not found' });
      }

      if (!cycle.canProcess()) {
        return res.status(400).json({ 
          error: 'Payroll cycle cannot be processed in current status' 
        });
      }

      const result = await PayrollService.processPayroll(cycle._id, tenantId, userId);
      
      logger.info('Payroll processing completed', { 
        cycleId: cycle._id, 
        tenantId,
        processedBy: userId,
        result 
      });
      
      res.json(result);
    } catch (error) {
      logger.error('Error processing payroll:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async finalizePayroll(req, res) {
    try {
      const { tenantId, userId } = req;
      const { id } = req.params;
      
      const cycle = await PayrollCycle.findOne({ 
        _id: id, 
        tenantId, 
        isDeleted: false 
      });
      
      if (!cycle) {
        return res.status(404).json({ error: 'Payroll cycle not found' });
      }

      if (!cycle.canFinalize()) {
        return res.status(400).json({ 
          error: 'Payroll cycle cannot be finalized in current status' 
        });
      }

      const result = await PayrollService.finalizePayroll(cycle._id, tenantId, userId);
      
      logger.info('Payroll finalized', { 
        cycleId: cycle._id, 
        tenantId,
        finalizedBy: userId 
      });
      
      res.json(result);
    } catch (error) {
      logger.error('Error finalizing payroll:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Alerts
  static async getAlerts(req, res) {
    try {
      const { tenantId } = req;
      const alerts = await PayrollService.getPayrollAlerts(tenantId);
      res.json(alerts);
    } catch (error) {
      logger.error('Error fetching alerts:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async markAlertAsRead(req, res) {
    try {
      const { tenantId } = req;
      const { alertId } = req.params;
      
      await PayrollService.markAlertAsRead(alertId, tenantId);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error marking alert as read:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async dismissAlert(req, res) {
    try {
      const { tenantId } = req;
      const { alertId } = req.params;
      
      await PayrollService.dismissAlert(alertId, tenantId);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error dismissing alert:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Statistics
  static async getCycleStatistics(req, res) {
    try {
      const { tenantId } = req;
      const { id } = req.params;
      
      const statistics = await PayrollService.getCycleStatistics(id, tenantId);
      res.json(statistics);
    } catch (error) {
      logger.error('Error fetching cycle statistics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Validation
  static async validateCycle(req, res) {
    try {
      const { tenantId } = req;
      const { id } = req.params;
      
      const validationResult = await PayrollService.validatePayrollCycle(id, tenantId);
      res.json(validationResult);
    } catch (error) {
      logger.error('Error validating payroll cycle:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = PayrollController;