const InvoiceService = require('../services/InvoiceService');
const logger = require('../utils/logger');

class InvoiceController {
  constructor() {
    this.invoiceService = new InvoiceService();
  }

  /**
   * Create invoice from bill
   */
  async createInvoice(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const invoiceData = req.body;

      const result = await this.invoiceService.createInvoice(
        invoiceData,
        userId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createInvoice controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { id: invoiceId } = req.params;

      const result = await this.invoiceService.getInvoiceById(
        invoiceId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getInvoiceById controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get invoices with pagination and filters
   */
  async getInvoices(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const filters = req.query;

      const result = await this.invoiceService.getInvoices(
        filters,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getInvoices controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const { id: invoiceId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required'
        });
      }

      const result = await this.invoiceService.cancelInvoice(
        invoiceId,
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
      logger.error('Error in cancelInvoice controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStatistics(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { dateFrom, dateTo } = req.query;

      const result = await this.invoiceService.getInvoiceStatistics(
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
      logger.error('Error in getInvoiceStatistics controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { limit } = req.query;

      const result = await this.invoiceService.getOverdueInvoices(
        tenantId,
        branchId,
        limit ? parseInt(limit) : undefined
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getOverdueInvoices controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { id: invoiceId } = req.params;

      // Get invoice first
      const invoiceResult = await this.invoiceService.getInvoiceById(
        invoiceId,
        tenantId,
        branchId
      );

      if (!invoiceResult.success) {
        return res.status(404).json(invoiceResult);
      }

      const result = await this.invoiceService.generateInvoicePDF(
        invoiceResult.data
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in generateInvoicePDF controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoicePDF(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { id: invoiceId } = req.params;

      // Get invoice
      const invoiceResult = await this.invoiceService.getInvoiceById(
        invoiceId,
        tenantId,
        branchId
      );

      if (!invoiceResult.success) {
        return res.status(404).json(invoiceResult);
      }

      const invoice = invoiceResult.data;

      if (!invoice.pdfGenerated || !invoice.pdfPath) {
        return res.status(404).json({
          success: false,
          message: 'PDF not generated for this invoice'
        });
      }

      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(invoice.pdfPath)) {
        return res.status(404).json({
          success: false,
          message: 'PDF file not found'
        });
      }

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoice.invoiceNumber}.pdf"`);

      // Stream the file
      const fileStream = fs.createReadStream(invoice.pdfPath);
      fileStream.pipe(res);
    } catch (error) {
      logger.error('Error in downloadInvoicePDF controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Validate invoice for payment
   */
  async validateInvoiceForPayment(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { id: invoiceId } = req.params;
      const { amount } = req.query;

      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid payment amount is required'
        });
      }

      const result = await this.invoiceService.validateInvoiceForPayment(
        invoiceId,
        parseFloat(amount),
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in validateInvoiceForPayment controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get invoices by patient ID
   */
  async getInvoicesByPatient(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { patientId } = req.params;

      const result = await this.invoiceService.getInvoices(
        { patientId },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getInvoicesByPatient controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get invoice by bill ID
   */
  async getInvoiceByBill(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { billId } = req.params;

      const result = await this.invoiceService.getInvoices(
        { billId },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Return the first invoice if found
      if (result.data.invoices.length > 0) {
        res.json({
          success: true,
          data: result.data.invoices[0]
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Invoice not found for this bill'
        });
      }
    } catch (error) {
      logger.error('Error in getInvoiceByBill controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new InvoiceController();