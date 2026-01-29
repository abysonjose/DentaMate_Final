const { v4: uuidv4 } = require('uuid');
const DiagnosticOrder = require('../models/DiagnosticOrder');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');
const NotificationService = require('./NotificationService');

class DiagnosticOrderService {
  constructor() {
    this.cacheService = new CacheService();
    this.notificationService = new NotificationService();
  }

  /**
   * Create a new diagnostic order
   */
  async createOrder(orderData, createdBy) {
    try {
      const orderId = uuidv4();
      
      const order = new DiagnosticOrder({
        orderId,
        ...orderData,
        statusHistory: [{
          status: 'CREATED',
          timestamp: new Date(),
          updatedBy: createdBy,
          notes: 'Order created'
        }]
      });

      await order.save();

      // Cache the order
      await this.cacheService.set(`order:${orderId}`, order, 3600);

      // Send notification to lab staff
      await this.notificationService.notifyNewOrder(order);

      logger.info('Diagnostic order created', {
        orderId,
        tenantId: order.tenantId,
        branchId: order.branchId,
        testType: order.testType,
        priority: order.priority,
        createdBy
      });

      return order;
    } catch (error) {
      logger.error('Error creating diagnostic order:', error);
      throw error;
    }
  }

  /**
   * Get orders with filtering and pagination
   */
  async getOrders(filters, pagination, userContext) {
    try {
      const { tenantId, branchId, role, userId } = userContext;
      
      // Build query based on user role and context
      let query = { tenantId, isActive: true };
      
      // Add branch filter for branch-specific roles
      if (branchId && !['CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(role)) {
        query.branchId = branchId;
      }

      // Add role-specific filters
      if (role === 'DOCTOR') {
        query.doctorId = userId;
      } else if (role === 'LAB_STAFF') {
        query.$or = [
          { assignedLabStaffId: userId },
          { assignedLabStaffId: { $exists: false } },
          { assignedLabStaffId: null }
        ];
      } else if (role === 'PATIENT') {
        query.patientId = userId;
      }

      // Apply additional filters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          if (key === 'startDate' || key === 'endDate') {
            if (!query.createdAt) query.createdAt = {};
            if (key === 'startDate') query.createdAt.$gte = new Date(filters[key]);
            if (key === 'endDate') query.createdAt.$lte = new Date(filters[key]);
          } else {
            query[key] = filters[key];
          }
        }
      });

      // Execute query with pagination
      const [orders, total] = await Promise.all([
        DiagnosticOrder.find(query)
          .populate('uploads')
          .populate('aiResults')
          .sort({ priority: -1, createdAt: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit),
        DiagnosticOrder.countDocuments(query)
      ]);

      return {
        orders,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Error getting diagnostic orders:', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrderById(orderId, userContext) {
    try {
      // Try cache first
      let order = await this.cacheService.get(`order:${orderId}`);
      
      if (!order) {
        order = await DiagnosticOrder.findOne({ 
          orderId, 
          tenantId: userContext.tenantId,
          isActive: true 
        })
        .populate('uploads')
        .populate('aiResults');

        if (!order) {
          throw new Error('Order not found');
        }

        // Cache the order
        await this.cacheService.set(`order:${orderId}`, order, 3600);
      }

      // Check access permissions
      this.validateOrderAccess(order, userContext);

      return order;
    } catch (error) {
      logger.error('Error getting diagnostic order:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, statusData, updatedBy, userContext) {
    try {
      const order = await this.getOrderById(orderId, userContext);
      
      // Validate status transition
      this.validateStatusTransition(order.status, statusData.status, userContext.role);

      // Update order
      await order.updateStatus(statusData.status, updatedBy, statusData.notes);

      // Clear cache
      await this.cacheService.del(`order:${orderId}`);

      // Send notifications based on status
      await this.notificationService.notifyStatusChange(order, statusData.status);

      logger.info('Order status updated', {
        orderId,
        oldStatus: order.status,
        newStatus: statusData.status,
        updatedBy
      });

      return order;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Assign order to lab staff
   */
  async assignOrder(orderId, labStaffId, assignedBy, userContext) {
    try {
      const order = await this.getOrderById(orderId, userContext);
      
      if (order.status !== 'CREATED') {
        throw new Error('Order can only be assigned when in CREATED status');
      }

      await order.assignToLabStaff(labStaffId, assignedBy);

      // Clear cache
      await this.cacheService.del(`order:${orderId}`);

      // Notify lab staff
      await this.notificationService.notifyOrderAssignment(order, labStaffId);

      logger.info('Order assigned to lab staff', {
        orderId,
        labStaffId,
        assignedBy
      });

      return order;
    } catch (error) {
      logger.error('Error assigning order:', error);
      throw error;
    }
  }

  /**
   * Get lab worklist
   */
  async getWorklist(userContext, filters = {}) {
    try {
      const { tenantId, branchId, role, userId } = userContext;
      
      let labStaffId = null;
      if (role === 'LAB_STAFF') {
        labStaffId = userId;
      }

      const cacheKey = `worklist:${tenantId}:${branchId}:${labStaffId || 'all'}`;
      
      // Try cache first
      let worklist = await this.cacheService.get(cacheKey);
      
      if (!worklist) {
        worklist = await DiagnosticOrder.findWorklist(tenantId, branchId, labStaffId);
        
        // Cache for 5 minutes
        await this.cacheService.set(cacheKey, worklist, 300);
      }

      // Apply additional filters
      if (Object.keys(filters).length > 0) {
        worklist = worklist.filter(order => {
          return Object.keys(filters).every(key => {
            if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
              return true;
            }
            return order[key] === filters[key];
          });
        });
      }

      return worklist;
    } catch (error) {
      logger.error('Error getting worklist:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(userContext, dateRange = {}) {
    try {
      const { tenantId, branchId, role, userId } = userContext;
      
      let matchQuery = { tenantId, isActive: true };
      
      if (branchId && !['CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(role)) {
        matchQuery.branchId = branchId;
      }

      if (role === 'DOCTOR') {
        matchQuery.doctorId = userId;
      } else if (role === 'LAB_STAFF') {
        matchQuery.assignedLabStaffId = userId;
      }

      if (dateRange.start || dateRange.end) {
        matchQuery.createdAt = {};
        if (dateRange.start) matchQuery.createdAt.$gte = new Date(dateRange.start);
        if (dateRange.end) matchQuery.createdAt.$lte = new Date(dateRange.end);
      }

      const stats = await DiagnosticOrder.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            statusBreakdown: {
              $push: '$status'
            },
            testTypeBreakdown: {
              $push: '$testType'
            },
            priorityBreakdown: {
              $push: '$priority'
            },
            avgCompletionTime: {
              $avg: {
                $subtract: ['$actualCompletionTime', '$createdAt']
              }
            }
          }
        },
        {
          $project: {
            totalOrders: 1,
            avgCompletionTime: 1,
            statusCounts: {
              $arrayToObject: {
                $map: {
                  input: ['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
                  as: 'status',
                  in: {
                    k: '$$status',
                    v: {
                      $size: {
                        $filter: {
                          input: '$statusBreakdown',
                          cond: { $eq: ['$$this', '$$status'] }
                        }
                      }
                    }
                  }
                }
              }
            },
            testTypeCounts: {
              $arrayToObject: {
                $map: {
                  input: ['XRAY', 'CBCT', 'MRI', 'DENTAL_SCAN', 'PANORAMIC', 'BITEWING', 'PERIAPICAL', 'CEPHALOMETRIC'],
                  as: 'testType',
                  in: {
                    k: '$$testType',
                    v: {
                      $size: {
                        $filter: {
                          input: '$testTypeBreakdown',
                          cond: { $eq: ['$$this', '$$testType'] }
                        }
                      }
                    }
                  }
                }
              }
            },
            priorityCounts: {
              $arrayToObject: {
                $map: {
                  input: ['NORMAL', 'URGENT', 'STAT'],
                  as: 'priority',
                  in: {
                    k: '$$priority',
                    v: {
                      $size: {
                        $filter: {
                          input: '$priorityBreakdown',
                          cond: { $eq: ['$$this', '$$priority'] }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]);

      return stats[0] || {
        totalOrders: 0,
        statusCounts: {},
        testTypeCounts: {},
        priorityCounts: {},
        avgCompletionTime: null
      };
    } catch (error) {
      logger.error('Error getting order statistics:', error);
      throw error;
    }
  }

  /**
   * Validate order access based on user role
   */
  validateOrderAccess(order, userContext) {
    const { role, userId, tenantId, branchId } = userContext;

    // Tenant isolation
    if (order.tenantId !== tenantId) {
      throw new Error('Access denied: Different tenant');
    }

    // Branch isolation for branch-specific roles
    if (branchId && !['CENTRAL_ADMIN', 'SAAS_ADMIN'].includes(role) && order.branchId !== branchId) {
      throw new Error('Access denied: Different branch');
    }

    // Role-specific access control
    switch (role) {
      case 'DOCTOR':
        if (order.doctorId !== userId) {
          throw new Error('Access denied: Not your order');
        }
        break;
      case 'PATIENT':
        if (order.patientId !== userId) {
          throw new Error('Access denied: Not your order');
        }
        break;
      case 'LAB_STAFF':
        // Lab staff can access orders in their branch
        break;
      case 'NURSE':
      case 'HEAD_NURSE':
      case 'BRANCH_ADMIN':
        // These roles can access orders in their branch
        break;
      case 'CENTRAL_ADMIN':
      case 'SAAS_ADMIN':
        // These roles have broader access
        break;
      default:
        throw new Error('Access denied: Invalid role');
    }
  }

  /**
   * Validate status transitions
   */
  validateStatusTransition(currentStatus, newStatus, userRole) {
    const allowedTransitions = {
      'CREATED': ['ASSIGNED', 'CANCELLED'],
      'ASSIGNED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [], // Terminal state
      'CANCELLED': [] // Terminal state
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    // Role-based transition validation
    if (newStatus === 'CANCELLED' && !['DOCTOR', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'].includes(userRole)) {
      throw new Error('Only doctors and admins can cancel orders');
    }

    if (['IN_PROGRESS', 'COMPLETED'].includes(newStatus) && !['LAB_STAFF', 'BRANCH_ADMIN', 'CENTRAL_ADMIN'].includes(userRole)) {
      throw new Error('Only lab staff and admins can update order progress');
    }
  }
}

module.exports = DiagnosticOrderService;