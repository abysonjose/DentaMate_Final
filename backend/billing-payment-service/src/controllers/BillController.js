const BillService = require('../services/BillService');
const logger = require('../utils/logger');

class BillController {
  constructor() {
    this.billService = new BillService();
  }

  /**
   * Create a new bill
   */
  async createBill(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const billData = req.body;

      const result = await this.billService.createBill(
        billData,
        userId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createBill controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get bill by ID
   */
  async getBillById(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { id: billId } = req.params;

      const result = await this.billService.getBillById(
        billId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getBillById controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update bill
   */
  async updateBill(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const { id: billId } = req.params;
      const updateData = req.body;

      const result = await this.billService.updateBill(
        billId,
        updateData,
        userId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in updateBill controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Cancel bill
   */
  async cancelBill(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const { id: billId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required'
        });
      }

      const result = await this.billService.cancelBill(
        billId,
        reason,
        userId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in cancelBill controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get bills with pagination and filters
   */
  async getBills(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const filters = req.query;

      const result = await this.billService.getBills(
        filters,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getBills controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get bill statistics
   */
  async getBillStatistics(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { dateFrom, dateTo } = req.query;

      const result = await this.billService.getBillStatistics(
        tenantId,
        branchId,
        dateFrom,
        dateTo
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getBillStatistics controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Validate bill for invoice generation
   */
  async validateBillForInvoice(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { id: billId } = req.params;

      const result = await this.billService.validateBillForInvoice(
        billId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in validateBillForInvoice controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get bills by appointment ID
   */
  async getBillsByAppointment(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { appointmentId } = req.params;

      const result = await this.billService.getBills(
        { appointmentId },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getBillsByAppointment controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get bills by patient ID
   */
  async getBillsByPatient(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { patientId } = req.params;

      const result = await this.billService.getBills(
        { patientId },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getBillsByPatient controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new BillController();