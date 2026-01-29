const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');
const PaymentGatewayService = require('./PaymentGatewayService');

class PaymentService {
  constructor() {
    this.cacheService = new CacheService();
    this.paymentGateway = new PaymentGatewayService();
  }

  /**
   * Create cash/offline payment
   */
  async createPayment(paymentData, userId, tenantId, branchId) {
    try {
      // Validate invoice
      const invoice = await Invoice.findOne({
        invoiceId: paymentData.invoiceId,
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

      if (paymentData.amount > invoice.balanceAmount) {
        return {
          success: false,
          message: 'Payment amount exceeds outstanding balance'
        };
      }

      // Generate unique identifiers
      const paymentId = uuidv4();
      const paymentNumber = await Payment.generatePaymentNumber(tenantId, branchId);
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create payment record
      const payment = new Payment({
        paymentId,
        paymentNumber,
        tenantId,
        branchId,
        invoiceId: invoice.invoiceId,
        billId: invoice.billId,
        patientId: invoice.patientId,
        amount: paymentData.amount,
        mode: paymentData.mode,
        status: 'SUCCESS', // Offline payments are immediately successful
        transactionId,
        paymentDetails: paymentData.paymentDetails,
        receivedBy: userId,
        receivedByRole: 'CASHIER',
        processedAt: new Date(),
        notes: paymentData.notes
      });

      await payment.save();

      // Update invoice
      await invoice.recordPayment(paymentData.amount, paymentId);

      // Log payment
      logger.logPaymentProcessed(payment, userId, tenantId);

      // Cache the payment
      await this.cacheService.setPayment(paymentId, payment);

      return {
        success: true,
        data: payment,
        message: 'Payment processed successfully'
      };
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Create online payment order
   */
  async createOnlinePayment(paymentData, userId, tenantId, branchId) {
    try {
      // Validate invoice
      const invoice = await Invoice.findOne({
        invoiceId: paymentData.invoiceId,
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

      if (paymentData.amount > invoice.balanceAmount) {
        return {
          success: false,
          message: 'Payment amount exceeds outstanding balance'
        };
      }

      // Create payment gateway order
      const gatewayOrder = await this.paymentGateway.createOrder({
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
        receipt: `INV_${invoice.invoiceNumber}`,
        notes: {
          invoiceId: invoice.invoiceId,
          patientId: invoice.patientId,
          tenantId,
          branchId
        }
      });

      if (!gatewayOrder.success) {
        return gatewayOrder;
      }

      // Generate unique identifiers
      const paymentId = uuidv4();
      const paymentNumber = await Payment.generatePaymentNumber(tenantId, branchId);

      // Create payment record
      const payment = new Payment({
        paymentId,
        paymentNumber,
        tenantId,
        branchId,
        invoiceId: invoice.invoiceId,
        billId: invoice.billId,
        patientId: invoice.patientId,
        amount: paymentData.amount,
        mode: 'UPI', // Default for online payments
        status: 'INITIATED',
        gatewayOrderId: gatewayOrder.data.id,
        receivedBy: userId,
        receivedByRole: 'CASHIER',
        notes: paymentData.notes
      });

      await payment.save();

      // Cache payment order details
      await this.cacheService.setPaymentOrder(gatewayOrder.data.id, {
        paymentId,
        invoiceId: invoice.invoiceId,
        amount: paymentData.amount,
        tenantId,
        branchId
      });

      return {
        success: true,
        data: {
          payment,
          gatewayOrder: gatewayOrder.data,
          customerDetails: paymentData.customerDetails
        },
        message: 'Online payment order created successfully'
      };
    } catch (error) {
      logger.error('Error creating online payment:', error);
      throw new Error(`Failed to create online payment: ${error.message}`);
    }
  }

  /**
   * Verify online payment
   */
  async verifyOnlinePayment(verificationData, tenantId, branchId) {
    try {
      // Verify payment with gateway
      const verification = await this.paymentGateway.verifyPayment(verificationData);

      if (!verification.success) {
        return verification;
      }

      // Get payment order details from cache
      const orderDetails = await this.cacheService.getPaymentOrder(verificationData.razorpay_order_id);

      if (!orderDetails) {
        return {
          success: false,
          message: 'Payment order not found'
        };
      }

      // Find payment record
      const payment = await Payment.findOne({
        paymentId: orderDetails.paymentId,
        tenantId,
        branchId
      });

      if (!payment) {
        return {
          success: false,
          message: 'Payment record not found'
        };
      }

      // Update payment status
      await payment.markSuccess({
        transactionId: verificationData.razorpay_payment_id,
        gatewayResponse: verification.data
      });

      payment.gatewayPaymentId = verificationData.razorpay_payment_id;
      payment.gatewaySignature = verificationData.razorpay_signature;
      await payment.save();

      // Update invoice
      const invoice = await Invoice.findOne({ invoiceId: payment.invoiceId });
      if (invoice) {
        await invoice.recordPayment(payment.amount, payment.paymentId);
      }

      // Clean up cache
      await this.cacheService.deletePaymentOrder(verificationData.razorpay_order_id);
      await this.cacheService.deletePayment(payment.paymentId);

      // Log successful payment
      logger.logPaymentProcessed(payment, payment.receivedBy, tenantId);

      return {
        success: true,
        data: payment,
        message: 'Payment verified and processed successfully'
      };
    } catch (error) {
      logger.error('Error verifying online payment:', error);
      throw new Error(`Failed to verify payment: ${error.message}`);
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId, tenantId, branchId) {
    try {
      // Try cache first
      let payment = await this.cacheService.getPayment(paymentId);
      
      if (!payment) {
        payment = await Payment.findOne({ 
          paymentId, 
          tenantId, 
          branchId 
        });
        
        if (payment) {
          await this.cacheService.setPayment(paymentId, payment);
        }
      }

      if (!payment) {
        return {
          success: false,
          message: 'Payment not found'
        };
      }

      return {
        success: true,
        data: payment
      };
    } catch (error) {
      logger.error('Error fetching payment:', error);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Get payments with pagination and filters
   */
  async getPayments(filters, tenantId, branchId) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        mode,
        patientId,
        invoiceId,
        dateFrom,
        dateTo,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build query
      const query = { tenantId, branchId };

      if (status) query.status = status;
      if (mode) query.mode = mode;
      if (patientId) query.patientId = patientId;
      if (invoiceId) query.invoiceId = invoiceId;

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      if (search) {
        query.$or = [
          { paymentNumber: { $regex: search, $options: 'i' } },
          { transactionId: { $regex: search, $options: 'i' } },
          { gatewayPaymentId: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const skip = (page - 1) * limit;
      const [payments, total] = await Promise.all([
        Payment.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Payment.countDocuments(query)
      ]);

      return {
        success: true,
        data: {
          payments,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching payments:', error);
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(tenantId, branchId, dateFrom, dateTo) {
    try {
      const matchStage = { tenantId, branchId };
      
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
            },
            pendingPayments: {
              $sum: { $cond: [{ $in: ['$status', ['INITIATED', 'PENDING']] }, 1, 0] }
            },
            cashPayments: {
              $sum: { $cond: [{ $eq: ['$mode', 'CASH'] }, '$amount', 0] }
            },
            upiPayments: {
              $sum: { $cond: [{ $eq: ['$mode', 'UPI'] }, '$amount', 0] }
            },
            cardPayments: {
              $sum: { $cond: [{ $eq: ['$mode', 'CARD'] }, '$amount', 0] }
            },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]);

      const result = stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        cashPayments: 0,
        upiPayments: 0,
        cardPayments: 0,
        averageAmount: 0
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Error fetching payment statistics:', error);
      throw new Error(`Failed to fetch payment statistics: ${error.message}`);
    }
  }

  /**
   * Handle payment webhook
   */
  async handlePaymentWebhook(webhookData, signature) {
    try {
      // Verify webhook signature
      const verification = await this.paymentGateway.verifyWebhook(webhookData, signature);
      
      if (!verification.success) {
        return verification;
      }

      const { event, payload } = webhookData;

      switch (event) {
        case 'payment.captured':
          return await this.handlePaymentCaptured(payload.payment.entity);
        
        case 'payment.failed':
          return await this.handlePaymentFailed(payload.payment.entity);
        
        default:
          logger.info('Unhandled webhook event:', { event });
          return {
            success: true,
            message: 'Webhook received but not processed'
          };
      }
    } catch (error) {
      logger.error('Error handling payment webhook:', error);
      throw new Error(`Failed to handle webhook: ${error.message}`);
    }
  }

  /**
   * Handle payment captured webhook
   */
  async handlePaymentCaptured(paymentEntity) {
    try {
      const payment = await Payment.findOne({
        gatewayOrderId: paymentEntity.order_id
      });

      if (!payment) {
        logger.warn('Payment not found for captured webhook:', { orderId: paymentEntity.order_id });
        return {
          success: false,
          message: 'Payment not found'
        };
      }

      if (payment.status === 'SUCCESS') {
        return {
          success: true,
          message: 'Payment already processed'
        };
      }

      // Update payment
      await payment.markSuccess({
        transactionId: paymentEntity.id,
        gatewayResponse: paymentEntity
      });

      payment.gatewayPaymentId = paymentEntity.id;
      await payment.save();

      // Update invoice
      const invoice = await Invoice.findOne({ invoiceId: payment.invoiceId });
      if (invoice) {
        await invoice.recordPayment(payment.amount, payment.paymentId);
      }

      // Clear cache
      await this.cacheService.deletePayment(payment.paymentId);

      logger.logPaymentProcessed(payment, payment.receivedBy, payment.tenantId);

      return {
        success: true,
        message: 'Payment captured successfully'
      };
    } catch (error) {
      logger.error('Error handling payment captured:', error);
      throw error;
    }
  }

  /**
   * Handle payment failed webhook
   */
  async handlePaymentFailed(paymentEntity) {
    try {
      const payment = await Payment.findOne({
        gatewayOrderId: paymentEntity.order_id
      });

      if (!payment) {
        logger.warn('Payment not found for failed webhook:', { orderId: paymentEntity.order_id });
        return {
          success: false,
          message: 'Payment not found'
        };
      }

      if (payment.status === 'FAILED') {
        return {
          success: true,
          message: 'Payment already marked as failed'
        };
      }

      // Update payment
      await payment.markFailed(
        paymentEntity.error_description || 'Payment failed',
        paymentEntity
      );

      // Clear cache
      await this.cacheService.deletePayment(payment.paymentId);

      logger.logAuditEvent('PAYMENT_FAILED', 'Payment', payment.paymentId, {
        reason: paymentEntity.error_description,
        gatewayPaymentId: paymentEntity.id
      }, payment.receivedBy, payment.tenantId);

      return {
        success: true,
        message: 'Payment failure processed'
      };
    } catch (error) {
      logger.error('Error handling payment failed:', error);
      throw error;
    }
  }
}

module.exports = PaymentService;