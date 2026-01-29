const { v4: uuidv4 } = require('uuid');
const Refund = require('../models/Refund');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');
const PaymentGatewayService = require('./PaymentGatewayService');

class RefundService {
  constructor() {
    this.cacheService = new CacheService();
    this.paymentGateway = new PaymentGatewayService();
  }

  /**
   * Create refund request
   */
  async createRefund(refundData, userId, userRole, tenantId, branchId) {
    try {
      // Validate payment
      const payment = await Payment.findOne({
        paymentId: refundData.paymentId,
        tenantId,
        branchId
      });

      if (!payment) {
        return {
          success: false,
          message: 'Payment not found'
        };
      }

      if (!payment.canRefund()) {
        return {
          success: false,
          message: 'Payment cannot be refunded'
        };
      }

      if (refundData.refundAmount > (payment.amount - payment.refundAmount)) {
        return {
          success: false,
          message: 'Refund amount exceeds available refund balance'
        };
      }

      // Check if there's already a pending refund for this payment
      const existingRefund = await Refund.findOne({
        paymentId: refundData.paymentId,
        status: { $in: ['REQUESTED', 'APPROVED', 'PROCESSING'] }
      });

      if (existingRefund) {
        return {
          success: false,
          message: 'There is already a pending refund for this payment'
        };
      }

      // Generate unique identifiers
      const refundId = uuidv4();
      const refundNumber = await Refund.generateRefundNumber(tenantId, branchId);

      // Determine refund type
      let refundType = refundData.refundType;
      if (!refundType) {
        refundType = refundData.refundAmount >= payment.amount ? 'FULL' : 'PARTIAL';
      }

      // Create refund record
      const refund = new Refund({
        refundId,
        refundNumber,
        tenantId,
        branchId,
        invoiceId: payment.invoiceId,
        paymentId: payment.paymentId,
        patientId: payment.patientId,
        originalAmount: payment.amount,
        refundAmount: refundData.refundAmount,
        refundType,
        reason: refundData.reason,
        requestedBy: userId,
        requestedByRole: userRole,
        refundMethod: refundData.refundMethod,
        bankDetails: refundData.bankDetails,
        chequeDetails: refundData.chequeDetails,
        notes: refundData.notes
      });

      await refund.save();

      // Auto-approve for certain roles or small amounts
      if (this.shouldAutoApprove(refund, userRole)) {
        await refund.approve(userId, 'Auto-approved based on role and amount');
      }

      // Log refund request
      logger.logAuditEvent('REFUND_REQUESTED', 'Refund', refundId, {
        paymentId: payment.paymentId,
        amount: refundData.refundAmount,
        reason: refundData.reason
      }, userId, tenantId);

      // Cache the refund
      await this.cacheService.setRefund(refundId, refund);

      return {
        success: true,
        data: refund,
        message: 'Refund request created successfully'
      };
    } catch (error) {
      logger.error('Error creating refund:', error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Approve refund
   */
  async approveRefund(refundId, approvalData, userId, tenantId, branchId) {
    try {
      const refund = await Refund.findOne({ 
        refundId, 
        tenantId, 
        branchId 
      });

      if (!refund) {
        return {
          success: false,
          message: 'Refund not found'
        };
      }

      if (!refund.canApprove()) {
        return {
          success: false,
          message: 'Refund cannot be approved in current status'
        };
      }

      await refund.approve(userId, approvalData.approvalNotes);

      // Start processing if it's an online payment
      const payment = await Payment.findOne({ paymentId: refund.paymentId });
      if (payment && payment.gatewayPaymentId) {
        await this.processOnlineRefund(refund);
      }

      // Clear cache
      await this.cacheService.deleteRefund(refundId);

      // Log approval
      logger.logRefundApproved(refund, userId, tenantId);

      return {
        success: true,
        data: refund,
        message: 'Refund approved successfully'
      };
    } catch (error) {
      logger.error('Error approving refund:', error);
      throw new Error(`Failed to approve refund: ${error.message}`);
    }
  }

  /**
   * Reject refund
   */
  async rejectRefund(refundId, rejectionData, userId, tenantId, branchId) {
    try {
      const refund = await Refund.findOne({ 
        refundId, 
        tenantId, 
        branchId 
      });

      if (!refund) {
        return {
          success: false,
          message: 'Refund not found'
        };
      }

      if (!refund.canApprove()) {
        return {
          success: false,
          message: 'Refund cannot be rejected in current status'
        };
      }

      await refund.reject(userId, rejectionData.rejectionReason);

      // Clear cache
      await this.cacheService.deleteRefund(refundId);

      // Log rejection
      logger.logAuditEvent('REFUND_REJECTED', 'Refund', refundId, {
        reason: rejectionData.rejectionReason
      }, userId, tenantId);

      return {
        success: true,
        data: refund,
        message: 'Refund rejected successfully'
      };
    } catch (error) {
      logger.error('Error rejecting refund:', error);
      throw new Error(`Failed to reject refund: ${error.message}`);
    }
  }

  /**
   * Process online refund
   */
  async processOnlineRefund(refund) {
    try {
      const payment = await Payment.findOne({ paymentId: refund.paymentId });
      
      if (!payment || !payment.gatewayPaymentId) {
        throw new Error('Payment not found or not processed through gateway');
      }

      // Mark as processing
      await refund.markProcessing();

      // Create refund through payment gateway
      const gatewayRefund = await this.paymentGateway.createRefund(payment.gatewayPaymentId, {
        amount: refund.refundAmount,
        notes: {
          refundId: refund.refundId,
          reason: refund.reason
        },
        receipt: `REF_${refund.refundNumber}`
      });

      if (gatewayRefund.success) {
        // Mark as completed
        await refund.markCompleted(gatewayRefund.data.id, gatewayRefund.data);
        
        // Update payment record
        await payment.processRefund(refund.refundAmount);

        // Update invoice if needed
        const invoice = await Invoice.findOne({ invoiceId: payment.invoiceId });
        if (invoice && refund.refundAmount >= invoice.paidAmount) {
          invoice.status = 'REFUNDED';
          await invoice.save();
        }

        logger.info('Online refund processed successfully', {
          refundId: refund.refundId,
          gatewayRefundId: gatewayRefund.data.id,
          amount: refund.refundAmount
        });
      } else {
        await refund.markFailed('Gateway refund failed', gatewayRefund);
        logger.error('Gateway refund failed:', gatewayRefund);
      }

      return gatewayRefund;
    } catch (error) {
      await refund.markFailed(error.message);
      logger.error('Error processing online refund:', error);
      throw error;
    }
  }

  /**
   * Complete manual refund
   */
  async completeManualRefund(refundId, completionData, userId, tenantId, branchId) {
    try {
      const refund = await Refund.findOne({ 
        refundId, 
        tenantId, 
        branchId 
      });

      if (!refund) {
        return {
          success: false,
          message: 'Refund not found'
        };
      }

      if (!refund.canProcess()) {
        return {
          success: false,
          message: 'Refund cannot be completed in current status'
        };
      }

      // Mark as completed
      await refund.markCompleted();

      // Update payment record
      const payment = await Payment.findOne({ paymentId: refund.paymentId });
      if (payment) {
        await payment.processRefund(refund.refundAmount);
      }

      // Update invoice if needed
      const invoice = await Invoice.findOne({ invoiceId: refund.invoiceId });
      if (invoice && refund.refundAmount >= invoice.paidAmount) {
        invoice.status = 'REFUNDED';
        await invoice.save();
      }

      // Clear cache
      await this.cacheService.deleteRefund(refundId);

      // Log completion
      logger.logAuditEvent('REFUND_COMPLETED', 'Refund', refundId, {
        method: refund.refundMethod,
        completedBy: userId
      }, userId, tenantId);

      return {
        success: true,
        data: refund,
        message: 'Refund completed successfully'
      };
    } catch (error) {
      logger.error('Error completing refund:', error);
      throw new Error(`Failed to complete refund: ${error.message}`);
    }
  }

  /**
   * Get refund by ID
   */
  async getRefundById(refundId, tenantId, branchId) {
    try {
      // Try cache first
      let refund = await this.cacheService.getRefund(refundId);
      
      if (!refund) {
        refund = await Refund.findOne({ 
          refundId, 
          tenantId, 
          branchId 
        });
        
        if (refund) {
          await this.cacheService.setRefund(refundId, refund);
        }
      }

      if (!refund) {
        return {
          success: false,
          message: 'Refund not found'
        };
      }

      return {
        success: true,
        data: refund
      };
    } catch (error) {
      logger.error('Error fetching refund:', error);
      throw new Error(`Failed to fetch refund: ${error.message}`);
    }
  }

  /**
   * Get refunds with pagination and filters
   */
  async getRefunds(filters, tenantId, branchId) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        refundType,
        patientId,
        dateFrom,
        dateTo,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build query
      const query = { tenantId, branchId };

      if (status) query.status = status;
      if (refundType) query.refundType = refundType;
      if (patientId) query.patientId = patientId;

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      if (search) {
        query.$or = [
          { refundNumber: { $regex: search, $options: 'i' } },
          { reason: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const skip = (page - 1) * limit;
      const [refunds, total] = await Promise.all([
        Refund.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Refund.countDocuments(query)
      ]);

      return {
        success: true,
        data: {
          refunds,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching refunds:', error);
      throw new Error(`Failed to fetch refunds: ${error.message}`);
    }
  }

  /**
   * Get pending refunds for approval
   */
  async getPendingRefunds(tenantId, branchId, limit = 50) {
    try {
      const pendingRefunds = await Refund.find({
        tenantId,
        branchId,
        status: 'REQUESTED'
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

      return {
        success: true,
        data: pendingRefunds
      };
    } catch (error) {
      logger.error('Error fetching pending refunds:', error);
      throw new Error(`Failed to fetch pending refunds: ${error.message}`);
    }
  }

  /**
   * Get refund statistics
   */
  async getRefundStatistics(tenantId, branchId, dateFrom, dateTo) {
    try {
      const matchStage = { tenantId, branchId };
      
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Refund.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalRefunds: { $sum: 1 },
            totalAmount: { $sum: '$refundAmount' },
            requestedRefunds: {
              $sum: { $cond: [{ $eq: ['$status', 'REQUESTED'] }, 1, 0] }
            },
            approvedRefunds: {
              $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] }
            },
            completedRefunds: {
              $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
            },
            rejectedRefunds: {
              $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] }
            },
            fullRefunds: {
              $sum: { $cond: [{ $eq: ['$refundType', 'FULL'] }, 1, 0] }
            },
            partialRefunds: {
              $sum: { $cond: [{ $eq: ['$refundType', 'PARTIAL'] }, 1, 0] }
            },
            averageAmount: { $avg: '$refundAmount' },
            averageProcessingDays: { $avg: '$processingDays' }
          }
        }
      ]);

      const result = stats[0] || {
        totalRefunds: 0,
        totalAmount: 0,
        requestedRefunds: 0,
        approvedRefunds: 0,
        completedRefunds: 0,
        rejectedRefunds: 0,
        fullRefunds: 0,
        partialRefunds: 0,
        averageAmount: 0,
        averageProcessingDays: 0
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Error fetching refund statistics:', error);
      throw new Error(`Failed to fetch refund statistics: ${error.message}`);
    }
  }

  /**
   * Check if refund should be auto-approved
   */
  shouldAutoApprove(refund, userRole) {
    // Auto-approve for accounts manager
    if (userRole === 'ACCOUNTS_MANAGER') {
      return true;
    }

    // Auto-approve small amounts for billing corrections
    if (refund.refundType === 'BILLING_CORRECTION' && refund.refundAmount <= 1000) {
      return true;
    }

    return false;
  }
}

module.exports = RefundService;