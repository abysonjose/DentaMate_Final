const DiagnosticOrderService = require('../services/DiagnosticOrderService');
const logger = require('../utils/logger');

class DiagnosticOrderController {
  constructor() {
    this.orderService = new DiagnosticOrderService();
  }

  /**
   * Create a new diagnostic order
   */
  async createOrder(req, res) {
    try {
      const orderData = req.body;
      const userContext = req.user;

      // Validate required fields
      const requiredFields = ['patientId', 'appointmentId', 'doctorId', 'testType'];
      for (const field of requiredFields) {
        if (!orderData[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field}`
          });
        }
      }

      // Add tenant and branch context
      orderData.tenantId = userContext.tenantId;
      orderData.branchId = userContext.branchId;

      const order = await this.orderService.createOrder(orderData, userContext.userId);

      res.status(201).json({
        success: true,
        message: 'Diagnostic order created successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error creating diagnostic order:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create diagnostic order'
      });
    }
  }

  /**
   * Get diagnostic orders with filtering and pagination
   */
  async getOrders(req, res) {
    try {
      const filters = {
        status: req.query.status,
        testType: req.query.testType,
        priority: req.query.priority,
        patientId: req.query.patientId,
        doctorId: req.query.doctorId,
        assignedLabStaffId: req.query.assignedLabStaffId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        skip: ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 20)
      };

      const result = await this.orderService.getOrders(filters, pagination, req.user);

      res.json({
        success: true,
        message: 'Orders retrieved successfully',
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting diagnostic orders:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve orders'
      });
    }
  }

  /**
   * Get a specific diagnostic order
   */
  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const order = await this.orderService.getOrderById(orderId, req.user);

      res.json({
        success: true,
        message: 'Order retrieved successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error getting diagnostic order:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve order'
      });
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const statusData = req.body;

      if (!statusData.status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const order = await this.orderService.updateOrderStatus(
        orderId,
        statusData,
        req.user.userId,
        req.user
      );

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error updating order status:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 
                        error.message.includes('Invalid status') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update order status'
      });
    }
  }

  /**
   * Assign order to lab staff
   */
  async assignOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { labStaffId } = req.body;

      if (!labStaffId) {
        return res.status(400).json({
          success: false,
          message: 'Lab staff ID is required'
        });
      }

      const order = await this.orderService.assignOrder(
        orderId,
        labStaffId,
        req.user.userId,
        req.user
      );

      res.json({
        success: true,
        message: 'Order assigned successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error assigning order:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 
                        error.message.includes('can only be assigned') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to assign order'
      });
    }
  }

  /**
   * Get lab worklist
   */
  async getWorklist(req, res) {
    try {
      const filters = {
        testType: req.query.testType,
        priority: req.query.priority
      };

      const worklist = await this.orderService.getWorklist(req.user, filters);

      res.json({
        success: true,
        message: 'Worklist retrieved successfully',
        data: worklist
      });
    } catch (error) {
      logger.error('Error getting worklist:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve worklist'
      });
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(req, res) {
    try {
      const dateRange = {
        start: req.query.startDate,
        end: req.query.endDate
      };

      const stats = await this.orderService.getOrderStatistics(req.user, dateRange);

      res.json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      logger.error('Error getting order statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve statistics'
      });
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await this.orderService.updateOrderStatus(
        orderId,
        { status: 'CANCELLED', notes: reason },
        req.user.userId,
        req.user
      );

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error cancelling order:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to cancel order'
      });
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(req, res) {
    try {
      const { orderId } = req.params;
      const order = await this.orderService.getOrderById(orderId, req.user);

      res.json({
        success: true,
        message: 'Order history retrieved successfully',
        data: {
          orderId: order.orderId,
          statusHistory: order.statusHistory,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }
      });
    } catch (error) {
      logger.error('Error getting order history:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Access denied') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve order history'
      });
    }
  }
}

module.exports = DiagnosticOrderController;