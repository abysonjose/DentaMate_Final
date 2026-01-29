const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

class PaymentGatewayService {
  constructor() {
    this.razorpay = null;
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    this.isConfigured = false;
    this.initializeRazorpay();
  }

  /**
   * Initialize Razorpay instance
   */
  initializeRazorpay() {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        logger.warn('Razorpay credentials not configured. Payment gateway features will be disabled.');
        return;
      }

      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });

      this.isConfigured = true;
      logger.info('Razorpay payment gateway initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Razorpay:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if payment gateway is configured
   */
  checkConfiguration() {
    if (!this.isConfigured || !this.razorpay) {
      return {
        success: false,
        message: 'Payment gateway not configured. Please check Razorpay credentials.'
      };
    }
    return { success: true };
  }

  /**
   * Create payment order
   */
  async createOrder(orderData) {
    try {
      const configCheck = this.checkConfiguration();
      if (!configCheck.success) {
        return configCheck;
      }

      const options = {
        amount: Math.round(orderData.amount * 100), // Convert to paise
        currency: orderData.currency || 'INR',
        receipt: orderData.receipt,
        notes: orderData.notes || {}
      };

      const order = await this.razorpay.orders.create(options);

      logger.info('Payment order created', {
        orderId: order.id,
        amount: orderData.amount,
        currency: options.currency,
        receipt: options.receipt
      });

      return {
        success: true,
        data: order,
        message: 'Payment order created successfully'
      };
    } catch (error) {
      logger.error('Error creating payment order:', error);
      return {
        success: false,
        message: `Failed to create payment order: ${error.message}`
      };
    }
  }

  /**
   * Verify payment signature
   */
  async verifyPayment(paymentData) {
    try {
      const configCheck = this.checkConfiguration();
      if (!configCheck.success) {
        return configCheck;
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

      // Generate expected signature
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      // Verify signature
      const isSignatureValid = expectedSignature === razorpay_signature;

      if (!isSignatureValid) {
        logger.logSecurityEvent('INVALID_PAYMENT_SIGNATURE', {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          providedSignature: razorpay_signature,
          expectedSignature
        });

        return {
          success: false,
          message: 'Invalid payment signature'
        };
      }

      // Fetch payment details from Razorpay
      const payment = await this.razorpay.payments.fetch(razorpay_payment_id);

      logger.info('Payment verified successfully', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: payment.amount / 100,
        status: payment.status
      });

      return {
        success: true,
        data: payment,
        message: 'Payment verified successfully'
      };
    } catch (error) {
      logger.error('Error verifying payment:', error);
      return {
        success: false,
        message: `Payment verification failed: ${error.message}`
      };
    }
  }

  /**
   * Capture payment
   */
  async capturePayment(paymentId, amount) {
    try {
      const captureData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR'
      };

      const payment = await this.razorpay.payments.capture(paymentId, captureData.amount, captureData.currency);

      logger.info('Payment captured', {
        paymentId,
        amount,
        status: payment.status
      });

      return {
        success: true,
        data: payment,
        message: 'Payment captured successfully'
      };
    } catch (error) {
      logger.error('Error capturing payment:', error);
      return {
        success: false,
        message: `Failed to capture payment: ${error.message}`
      };
    }
  }

  /**
   * Create refund
   */
  async createRefund(paymentId, refundData) {
    try {
      const options = {
        amount: Math.round(refundData.amount * 100), // Convert to paise
        speed: refundData.speed || 'normal',
        notes: refundData.notes || {},
        receipt: refundData.receipt
      };

      const refund = await this.razorpay.payments.refund(paymentId, options);

      logger.info('Refund created', {
        refundId: refund.id,
        paymentId,
        amount: refundData.amount,
        status: refund.status
      });

      return {
        success: true,
        data: refund,
        message: 'Refund created successfully'
      };
    } catch (error) {
      logger.error('Error creating refund:', error);
      return {
        success: false,
        message: `Failed to create refund: ${error.message}`
      };
    }
  }

  /**
   * Get refund status
   */
  async getRefundStatus(refundId) {
    try {
      const refund = await this.razorpay.refunds.fetch(refundId);

      return {
        success: true,
        data: refund,
        message: 'Refund status fetched successfully'
      };
    } catch (error) {
      logger.error('Error fetching refund status:', error);
      return {
        success: false,
        message: `Failed to fetch refund status: ${error.message}`
      };
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook(webhookBody, signature) {
    try {
      if (!this.webhookSecret) {
        logger.warn('Webhook secret not configured');
        return {
          success: false,
          message: 'Webhook secret not configured'
        };
      }

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(webhookBody))
        .digest('hex');

      // Verify signature
      const isSignatureValid = expectedSignature === signature;

      if (!isSignatureValid) {
        logger.logSecurityEvent('INVALID_WEBHOOK_SIGNATURE', {
          providedSignature: signature,
          expectedSignature,
          event: webhookBody.event
        });

        return {
          success: false,
          message: 'Invalid webhook signature'
        };
      }

      logger.info('Webhook signature verified', {
        event: webhookBody.event,
        entityId: webhookBody.payload?.payment?.entity?.id || webhookBody.payload?.refund?.entity?.id
      });

      return {
        success: true,
        message: 'Webhook signature verified'
      };
    } catch (error) {
      logger.error('Error verifying webhook:', error);
      return {
        success: false,
        message: `Webhook verification failed: ${error.message}`
      };
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);

      return {
        success: true,
        data: payment,
        message: 'Payment details fetched successfully'
      };
    } catch (error) {
      logger.error('Error fetching payment details:', error);
      return {
        success: false,
        message: `Failed to fetch payment details: ${error.message}`
      };
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId) {
    try {
      const order = await this.razorpay.orders.fetch(orderId);

      return {
        success: true,
        data: order,
        message: 'Order details fetched successfully'
      };
    } catch (error) {
      logger.error('Error fetching order details:', error);
      return {
        success: false,
        message: `Failed to fetch order details: ${error.message}`
      };
    }
  }

  /**
   * Get payments for an order
   */
  async getOrderPayments(orderId) {
    try {
      const payments = await this.razorpay.orders.fetchPayments(orderId);

      return {
        success: true,
        data: payments,
        message: 'Order payments fetched successfully'
      };
    } catch (error) {
      logger.error('Error fetching order payments:', error);
      return {
        success: false,
        message: `Failed to fetch order payments: ${error.message}`
      };
    }
  }

  /**
   * Create payment link
   */
  async createPaymentLink(linkData) {
    try {
      const options = {
        amount: Math.round(linkData.amount * 100), // Convert to paise
        currency: linkData.currency || 'INR',
        accept_partial: linkData.acceptPartial || false,
        first_min_partial_amount: linkData.firstMinPartialAmount ? Math.round(linkData.firstMinPartialAmount * 100) : undefined,
        expire_by: linkData.expireBy,
        reference_id: linkData.referenceId,
        description: linkData.description,
        customer: linkData.customer,
        notify: linkData.notify || { sms: true, email: true },
        reminder_enable: linkData.reminderEnable || true,
        notes: linkData.notes || {},
        callback_url: linkData.callbackUrl,
        callback_method: linkData.callbackMethod || 'get'
      };

      const paymentLink = await this.razorpay.paymentLink.create(options);

      logger.info('Payment link created', {
        linkId: paymentLink.id,
        amount: linkData.amount,
        referenceId: linkData.referenceId
      });

      return {
        success: true,
        data: paymentLink,
        message: 'Payment link created successfully'
      };
    } catch (error) {
      logger.error('Error creating payment link:', error);
      return {
        success: false,
        message: `Failed to create payment link: ${error.message}`
      };
    }
  }

  /**
   * Health check for payment gateway
   */
  async healthCheck() {
    try {
      const configCheck = this.checkConfiguration();
      if (!configCheck.success) {
        return {
          success: false,
          message: 'Payment gateway not configured'
        };
      }

      // Try to fetch a dummy order to check connectivity
      await this.razorpay.orders.all({ count: 1 });

      return {
        success: true,
        message: 'Payment gateway is healthy'
      };
    } catch (error) {
      logger.error('Payment gateway health check failed:', error);
      return {
        success: false,
        message: `Payment gateway health check failed: ${error.message}`
      };
    }
  }
}

module.exports = PaymentGatewayService;