const { v4: uuidv4 } = require('uuid');
const Bill = require('../models/Bill');
const logger = require('../utils/logger');
const CacheService = require('./CacheService');

class BillService {
  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Create a new bill
   */
  async createBill(billData, userId, tenantId, branchId) {
    try {
      // Generate unique identifiers
      const billId = uuidv4();
      const billNumber = await Bill.generateBillNumber(tenantId, branchId);

      // Validate bill items and calculate totals
      const processedItems = this.processBillItems(billData.items);
      
      const bill = new Bill({
        billId,
        billNumber,
        tenantId,
        branchId,
        appointmentId: billData.appointmentId,
        patientId: billData.patientId,
        doctorId: billData.doctorId,
        items: processedItems,
        notes: billData.notes,
        createdBy: userId,
        createdByRole: 'BILLING_OFFICER'
      });

      await bill.save();

      // Log bill creation
      logger.logBillCreation(bill, userId, tenantId);

      // Cache the bill
      await this.cacheService.setBill(billId, bill);

      return {
        success: true,
        data: bill,
        message: 'Bill created successfully'
      };
    } catch (error) {
      logger.error('Error creating bill:', error);
      throw new Error(`Failed to create bill: ${error.message}`);
    }
  }

  /**
   * Get bill by ID
   */
  async getBillById(billId, tenantId, branchId) {
    try {
      // Try cache first
      let bill = await this.cacheService.getBill(billId);
      
      if (!bill) {
        bill = await Bill.findOne({ 
          billId, 
          tenantId, 
          branchId 
        });
        
        if (bill) {
          await this.cacheService.setBill(billId, bill);
        }
      }

      if (!bill) {
        return {
          success: false,
          message: 'Bill not found'
        };
      }

      return {
        success: true,
        data: bill
      };
    } catch (error) {
      logger.error('Error fetching bill:', error);
      throw new Error(`Failed to fetch bill: ${error.message}`);
    }
  }

  /**
   * Update bill (only if in DRAFT status)
   */
  async updateBill(billId, updateData, userId, tenantId, branchId) {
    try {
      const bill = await Bill.findOne({ 
        billId, 
        tenantId, 
        branchId 
      });

      if (!bill) {
        return {
          success: false,
          message: 'Bill not found'
        };
      }

      if (!bill.canModify()) {
        return {
          success: false,
          message: 'Bill cannot be modified in current status'
        };
      }

      // Process updated items if provided
      if (updateData.items) {
        updateData.items = this.processBillItems(updateData.items);
      }

      // Update bill
      Object.assign(bill, updateData);
      await bill.save();

      // Clear cache
      await this.cacheService.deleteBill(billId);

      // Log update
      logger.logAuditEvent('BILL_UPDATED', 'Bill', billId, updateData, userId, tenantId);

      return {
        success: true,
        data: bill,
        message: 'Bill updated successfully'
      };
    } catch (error) {
      logger.error('Error updating bill:', error);
      throw new Error(`Failed to update bill: ${error.message}`);
    }
  }

  /**
   * Cancel bill
   */
  async cancelBill(billId, reason, userId, tenantId, branchId) {
    try {
      const bill = await Bill.findOne({ 
        billId, 
        tenantId, 
        branchId 
      });

      if (!bill) {
        return {
          success: false,
          message: 'Bill not found'
        };
      }

      if (bill.status === 'CANCELLED') {
        return {
          success: false,
          message: 'Bill is already cancelled'
        };
      }

      await bill.cancel(userId, reason);

      // Clear cache
      await this.cacheService.deleteBill(billId);

      // Log cancellation
      logger.logAuditEvent('BILL_CANCELLED', 'Bill', billId, { reason }, userId, tenantId);

      return {
        success: true,
        data: bill,
        message: 'Bill cancelled successfully'
      };
    } catch (error) {
      logger.error('Error cancelling bill:', error);
      throw new Error(`Failed to cancel bill: ${error.message}`);
    }
  }

  /**
   * Get bills with pagination and filters
   */
  async getBills(filters, tenantId, branchId) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        patientId,
        appointmentId,
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
      if (appointmentId) query.appointmentId = appointmentId;

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      if (search) {
        query.$or = [
          { billNumber: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const skip = (page - 1) * limit;
      const [bills, total] = await Promise.all([
        Bill.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Bill.countDocuments(query)
      ]);

      return {
        success: true,
        data: {
          bills,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching bills:', error);
      throw new Error(`Failed to fetch bills: ${error.message}`);
    }
  }

  /**
   * Get bill statistics
   */
  async getBillStatistics(tenantId, branchId, dateFrom, dateTo) {
    try {
      const matchStage = { tenantId, branchId };
      
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Bill.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalBills: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            draftBills: {
              $sum: { $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0] }
            },
            generatedBills: {
              $sum: { $cond: [{ $eq: ['$status', 'GENERATED'] }, 1, 0] }
            },
            cancelledBills: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
            },
            averageAmount: { $avg: '$totalAmount' }
          }
        }
      ]);

      const result = stats[0] || {
        totalBills: 0,
        totalAmount: 0,
        draftBills: 0,
        generatedBills: 0,
        cancelledBills: 0,
        averageAmount: 0
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Error fetching bill statistics:', error);
      throw new Error(`Failed to fetch bill statistics: ${error.message}`);
    }
  }

  /**
   * Process bill items and calculate totals
   */
  processBillItems(items) {
    return items.map(item => {
      // Calculate total price
      const totalPrice = item.quantity * item.unitPrice;
      
      // Calculate discount amount
      const discountAmount = item.discountPercent 
        ? (totalPrice * item.discountPercent) / 100 
        : item.discountAmount || 0;
      
      // Calculate taxable amount
      const taxableAmount = totalPrice - discountAmount;
      
      // Calculate tax amount
      const taxAmount = item.taxPercent 
        ? (taxableAmount * item.taxPercent) / 100 
        : item.taxAmount || 0;

      return {
        ...item,
        totalPrice: totalPrice,
        discountAmount: Math.round(discountAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100
      };
    });
  }

  /**
   * Validate bill for invoice generation
   */
  async validateBillForInvoice(billId, tenantId, branchId) {
    try {
      const bill = await Bill.findOne({ 
        billId, 
        tenantId, 
        branchId 
      });

      if (!bill) {
        return {
          success: false,
          message: 'Bill not found'
        };
      }

      if (bill.status !== 'GENERATED') {
        return {
          success: false,
          message: 'Only generated bills can be converted to invoices'
        };
      }

      if (bill.totalAmount <= 0) {
        return {
          success: false,
          message: 'Bill amount must be greater than zero'
        };
      }

      return {
        success: true,
        data: bill
      };
    } catch (error) {
      logger.error('Error validating bill for invoice:', error);
      throw new Error(`Failed to validate bill: ${error.message}`);
    }
  }
}

module.exports = BillService;