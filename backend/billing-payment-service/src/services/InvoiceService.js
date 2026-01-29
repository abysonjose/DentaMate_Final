const { v4: uuidv4 } = require('uuid');
const Invoice = require('../models/Invoice');
const Bill = require('../models/Bill');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');
const PDFService = require('./PDFService');

class InvoiceService {
  constructor() {
    this.cacheService = new CacheService();
    this.pdfService = new PDFService();
  }

  /**
   * Create invoice from bill
   */
  async createInvoice(invoiceData, userId, tenantId, branchId) {
    try {
      // Validate bill exists and can be invoiced
      const bill = await Bill.findOne({
        billId: invoiceData.billId,
        tenantId,
        branchId,
        status: 'GENERATED'
      });

      if (!bill) {
        return {
          success: false,
          message: 'Bill not found or not in valid status for invoicing'
        };
      }

      // Check if invoice already exists for this bill
      const existingInvoice = await Invoice.findOne({
        billId: invoiceData.billId,
        tenantId,
        branchId
      });

      if (existingInvoice) {
        return {
          success: false,
          message: 'Invoice already exists for this bill'
        };
      }

      // Generate unique identifiers
      const invoiceId = uuidv4();
      const invoiceNumber = await Invoice.generateInvoiceNumber(tenantId, branchId);

      // Create invoice
      const invoice = new Invoice({
        invoiceId,
        invoiceNumber,
        tenantId,
        branchId,
        billId: bill.billId,
        appointmentId: bill.appointmentId,
        patientId: bill.patientId,
        doctorId: bill.doctorId,
        patientDetails: invoiceData.patientDetails,
        clinicDetails: invoiceData.clinicDetails,
        totalAmount: bill.totalAmount,
        balanceAmount: bill.totalAmount,
        dueDate: invoiceData.dueDate,
        paymentTerms: invoiceData.paymentTerms,
        notes: invoiceData.notes,
        createdBy: userId,
        createdByRole: 'BILLING_OFFICER'
      });

      await invoice.save();

      // Generate PDF asynchronously
      this.generateInvoicePDF(invoice).catch(error => {
        logger.error('PDF generation failed:', error);
      });

      // Log invoice creation
      logger.logAuditEvent('INVOICE_CREATED', 'Invoice', invoiceId, {
        billId: bill.billId,
        amount: invoice.totalAmount
      }, userId, tenantId);

      // Cache the invoice
      await this.cacheService.setInvoice(invoiceId, invoice);

      return {
        success: true,
        data: invoice,
        message: 'Invoice created successfully'
      };
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId, tenantId, branchId) {
    try {
      // Try cache first
      let invoice = await this.cacheService.getInvoice(invoiceId);
      
      if (!invoice) {
        invoice = await Invoice.findOne({ 
          invoiceId, 
          tenantId, 
          branchId 
        });
        
        if (invoice) {
          await this.cacheService.setInvoice(invoiceId, invoice);
        }
      }

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found'
        };
      }

      return {
        success: true,
        data: invoice
      };
    } catch (error) {
      logger.error('Error fetching invoice:', error);
      throw new Error(`Failed to fetch invoice: ${error.message}`);
    }
  }

  /**
   * Get invoices with pagination and filters
   */
  async getInvoices(filters, tenantId, branchId) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        patientId,
        overdue,
        dateFrom,
        dateTo,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build query
      const query = { tenantId, branchId };

      if (status) query.status = status;
      if (patientId) query.patientId = patientId;

      if (overdue === true) {
        query.status = { $in: ['GENERATED', 'PARTIALLY_PAID'] };
        query.dueDate = { $lt: new Date() };
      }

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      if (search) {
        query.$or = [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { 'patientDetails.name': { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const skip = (page - 1) * limit;
      const [invoices, total] = await Promise.all([
        Invoice.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Invoice.countDocuments(query)
      ]);

      return {
        success: true,
        data: {
          invoices,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId, reason, userId, tenantId, branchId) {
    try {
      const invoice = await Invoice.findOne({ 
        invoiceId, 
        tenantId, 
        branchId 
      });

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found'
        };
      }

      if (!invoice.canCancel()) {
        return {
          success: false,
          message: 'Invoice cannot be cancelled in current status'
        };
      }

      await invoice.cancel(userId, reason);

      // Clear cache
      await this.cacheService.deleteInvoice(invoiceId);

      // Log cancellation
      logger.logAuditEvent('INVOICE_CANCELLED', 'Invoice', invoiceId, { reason }, userId, tenantId);

      return {
        success: true,
        data: invoice,
        message: 'Invoice cancelled successfully'
      };
    } catch (error) {
      logger.error('Error cancelling invoice:', error);
      throw new Error(`Failed to cancel invoice: ${error.message}`);
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStatistics(tenantId, branchId, dateFrom, dateTo) {
    try {
      const matchStage = { tenantId, branchId };
      
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Invoice.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            totalOutstanding: { $sum: '$balanceAmount' },
            generatedInvoices: {
              $sum: { $cond: [{ $eq: ['$status', 'GENERATED'] }, 1, 0] }
            },
            partiallyPaidInvoices: {
              $sum: { $cond: [{ $eq: ['$status', 'PARTIALLY_PAID'] }, 1, 0] }
            },
            paidInvoices: {
              $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] }
            },
            cancelledInvoices: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
            },
            overdueInvoices: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ['$status', ['GENERATED', 'PARTIALLY_PAID']] },
                      { $lt: ['$dueDate', new Date()] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            averageAmount: { $avg: '$totalAmount' }
          }
        }
      ]);

      const result = stats[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        generatedInvoices: 0,
        partiallyPaidInvoices: 0,
        paidInvoices: 0,
        cancelledInvoices: 0,
        overdueInvoices: 0,
        averageAmount: 0
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Error fetching invoice statistics:', error);
      throw new Error(`Failed to fetch invoice statistics: ${error.message}`);
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(tenantId, branchId, limit = 50) {
    try {
      const overdueInvoices = await Invoice.find({
        tenantId,
        branchId,
        status: { $in: ['GENERATED', 'PARTIALLY_PAID'] },
        dueDate: { $lt: new Date() }
      })
      .sort({ dueDate: 1 })
      .limit(limit)
      .lean();

      return {
        success: true,
        data: overdueInvoices
      };
    } catch (error) {
      logger.error('Error fetching overdue invoices:', error);
      throw new Error(`Failed to fetch overdue invoices: ${error.message}`);
    }
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoice) {
    try {
      if (invoice.pdfGenerated) {
        return {
          success: true,
          message: 'PDF already generated'
        };
      }

      // Get bill details
      const bill = await Bill.findOne({ billId: invoice.billId });
      if (!bill) {
        throw new Error('Associated bill not found');
      }

      // Generate PDF
      const pdfPath = await this.pdfService.generateInvoicePDF(invoice, bill);

      // Update invoice with PDF path
      invoice.pdfPath = pdfPath;
      invoice.pdfGenerated = true;
      await invoice.save();

      // Clear cache
      await this.cacheService.deleteInvoice(invoice.invoiceId);

      return {
        success: true,
        data: { pdfPath },
        message: 'PDF generated successfully'
      };
    } catch (error) {
      logger.error('Error generating invoice PDF:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Validate invoice for payment
   */
  async validateInvoiceForPayment(invoiceId, amount, tenantId, branchId) {
    try {
      const invoice = await Invoice.findOne({ 
        invoiceId, 
        tenantId, 
        branchId 
      });

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found'
        };
      }

      if (!invoice.canAcceptPayment()) {
        return {
          success: false,
          message: 'Invoice cannot accept payment in current status'
        };
      }

      if (amount <= 0) {
        return {
          success: false,
          message: 'Payment amount must be greater than zero'
        };
      }

      if (amount > invoice.balanceAmount) {
        return {
          success: false,
          message: 'Payment amount exceeds outstanding balance'
        };
      }

      return {
        success: true,
        data: invoice
      };
    } catch (error) {
      logger.error('Error validating invoice for payment:', error);
      throw new Error(`Failed to validate invoice: ${error.message}`);
    }
  }

  /**
   * Record payment against invoice
   */
  async recordPayment(invoiceId, amount, paymentId, tenantId, branchId) {
    try {
      const invoice = await Invoice.findOne({ 
        invoiceId, 
        tenantId, 
        branchId 
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      await invoice.recordPayment(amount, paymentId);

      // Clear cache
      await this.cacheService.deleteInvoice(invoiceId);

      return {
        success: true,
        data: invoice,
        message: 'Payment recorded successfully'
      };
    } catch (error) {
      logger.error('Error recording payment:', error);
      throw new Error(`Failed to record payment: ${error.message}`);
    }
  }
}

module.exports = InvoiceService;