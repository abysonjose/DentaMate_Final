const RefundService = require('../services/RefundService');
const logger = require('../utils/logger');

class RefundController {
  constructor() {
    this.refundService = new RefundService();
  }

  /**
   * Create refund request
   */
  async createRefund(req, res) {
    try {
      const { userId, role, tenantId, branchId } = req.user;
      const refundData = req.body;

      const result = await this.refundService.createRefund(
        refundData,
        userId,
        role,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createRefund controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Approve refund
   */
  async approveRefund(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const { id: refundId } = req.params;
      const approvalData = req.body;

      const result = await this.refundService.approveRefund(
        refundId,
        approvalData,
        userId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in approveRefund controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Reject refund
   */
  async rejectRefund(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const { id: refundId } = req.params;
      const rejectionData = req.body;

      const result = await this.refundService.rejectRefund(
        refundId,
        rejectionData,
        userId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in rejectRefund controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Complete manual refund
   */
  async completeRefund(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const { id: refundId } = req.params;
      const completionData = req.body;

      const result = await this.refundService.completeManualRefund(
        refundId,
        completionData,
        userId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in completeRefund controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get refund by ID
   */
  async getRefundById(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { id: refundId } = req.params;

      const result = await this.refundService.getRefundById(
        refundId,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getRefundById controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get refunds with pagination and filters
   */
  async getRefunds(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const filters = req.query;

      const result = await this.refundService.getRefunds(
        filters,
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getRefunds controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get pending refunds for approval
   */
  async getPendingRefunds(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { limit } = req.query;

      const result = await this.refundService.getPendingRefunds(
        tenantId,
        branchId,
        limit ? parseInt(limit) : undefined
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getPendingRefunds controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get refund statistics
   */
  async getRefundStatistics(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { dateFrom, dateTo } = req.query;

      const result = await this.refundService.getRefundStatistics(
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
      logger.error('Error in getRefundStatistics controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get refunds by payment ID
   */
  async getRefundsByPayment(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { paymentId } = req.params;

      const result = await this.refundService.getRefunds(
        { paymentId },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getRefundsByPayment controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get refunds by patient ID
   */
  async getRefundsByPatient(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { patientId } = req.params;

      const result = await this.refundService.getRefunds(
        { patientId },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getRefundsByPatient controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get refunds by invoice ID
   */
  async getRefundsByInvoice(req, res) {
    try {
      const { tenantId, branchId } = req.user;
      const { invoiceId } = req.params;

      const result = await this.refundService.getRefunds(
        { invoiceId },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getRefundsByInvoice controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get refund approval queue
   */
  async getRefundApprovalQueue(req, res) {
    try {
      const { tenantId, branchId } = req.user;

      const result = await this.refundService.getRefunds(
        { status: 'REQUESTED', sortBy: 'createdAt', sortOrder: 'asc' },
        tenantId,
        branchId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getRefundApprovalQueue controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Bulk approve refunds
   */
  async bulkApproveRefunds(req, res) {
    try {
      const { userId, tenantId, branchId } = req.user;
      const { refundIds, approvalNotes } = req.body;

      if (!refundIds || !Array.isArray(refundIds) || refundIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Refund IDs array is required'
        });
      }

      const results = [];
      const errors = [];

      for (const refundId of refundIds) {
        try {
          const result = await this.refundService.approveRefund(
            refundId,
            { approvalNotes },
            userId,
            tenantId,
            branchId
          );

          if (result.success) {
            results.push({ refundId, status: 'approved' });
          } else {
            errors.push({ refundId, error: result.message });
          }
        } catch (error) {
          errors.push({ refundId, error: error.message });
        }
      }

      res.json({
        success: true,
        data: {
          approved: results,
          errors: errors,
          summary: {
            total: refundIds.length,
            approved: results.length,
            failed: errors.length
          }
        },
        message: `Bulk approval completed: ${results.length} approved, ${errors.length} failed`
      });
    } catch (error) {
      logger.error('Error in bulkApproveRefunds controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new RefundController();