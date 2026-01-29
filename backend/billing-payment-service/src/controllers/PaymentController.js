const PaymentService = require('../services/PaymentService');
const logger = require('../utils/logger');

class PaymentController {
  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Create offline payment (cash, card, etc.)
   */
  async createPayment(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const paymentData = req.body;

      const result = await this.paymentService.createPayment(
        paymentData,
        userId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createPayment controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Create online payment order
   */
  async createOnlinePayment(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const paymentData = req.body;

      const result = await this.paymentService.createOnlinePayment(
        paymentData,
        userId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createOnlinePayment controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify online payment
   */
  async verifyOnlinePayment(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const verificationData = req.body;

      const result = await this.paymentService.verifyOnlinePayment(
        verificationData,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in verifyOnlinePayment controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { id: paymentId } = req.params;

      const result = await this.paymentService.getPaymentById(
        paymentId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getPaymentById controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get payments with pagination and filters
   */
  async getPayments(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const filters = req.query;

      const result = await this.paymentService.getPayments(
        filters,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getPayments controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { dateFrom, dateTo } = req.query;

      const result = await this.paymentService.getPaymentStatistics(
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
      logger.error('Error in getPaymentStatistics controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Handle payment webhook
   */
  async handlePaymentWebhook(req, res) {
    try {
      const webhookData = req.body;
      const signature = req.headers['x-razorpay-signature'];

      if (!signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing webhook signature'
        });
      }

      const result = await this.paymentService.handlePaymentWebhook(
        webhookData,
        signature
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in handlePaymentWebhook controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get payments by invoice ID
   */
  async getPaymentsByInvoice(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { invoiceId } = req.params;

      const result = await this.paymentService.getPayments(
        { invoiceId },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getPaymentsByInvoice controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get payments by patient ID
   */
  async getPaymentsByPatient(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { patientId } = req.params;

      const result = await this.paymentService.getPayments(
        { patientId },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getPaymentsByPatient controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get payment methods summary
   */
  async getPaymentMethodsSummary(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { dateFrom, dateTo } = req.query;

      const result = await this.paymentService.getPaymentStatistics(
        tenantId,
        branchId,
        dateFrom,
        dateTo
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Extract payment methods data
      const paymentMethodsData = {
        cash: result.data.cashPayments || 0,
        upi: result.data.upiPayments || 0,
        card: result.data.cardPayments || 0,
        total: result.data.totalAmount || 0
      };

      res.json({
        success: true,
        data: paymentMethodsData
      });
    } catch (error) {
      logger.error('Error in getPaymentMethodsSummary controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get daily payment summary
   */
  async getDailyPaymentSummary(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { date } = req.query;

      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const result = await this.paymentService.getPaymentStatistics(
        tenantId,
        branchId,
        startOfDay,
        endOfDay
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getDailyPaymentSummary controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new PaymentController();