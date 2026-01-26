const Room = require('../models/Room');
const Department = require('../models/Department');
const Branch = require('../models/Branch');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class RoomController {
  // Create a new room
  async createRoom(req, res) {
    try {
      // Verify department exists and user has access
      const department = await Department.findOne({
        departmentId: req.body.departmentId,
        deletedAt: null
      }).populate({
        path: 'branchId',
        populate: {
          path: 'clinicId',
          select: 'tenantId',
          match: req.user.role === 'SAAS_ADMIN' ? {} : { tenantId: req.user.tenantId }
        }
      });

      if (!department || !department.branchId?.clinicId) {
        return res.status(404).json({
          success: false,
          message: 'Department not found or access denied'
        });
      }

      // For BRANCH_ADMIN, ensure they can only create in their own branch
      if (req.user.role === 'BRANCH_ADMIN' && department.branchId.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this branch'
        });
      }

      const room = new Room({
        roomId: uuidv4(),
        ...req.body
      });

      await room.save();
      logger.info(`Room created: ${room.roomId} for department: ${req.body.departmentId}`);

      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: room
      });
    } catch (error) {
      logger.error('Error in createRoom controller:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Room with this name already exists in this branch'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create room',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get room by ID
  async getRoomById(req, res) {
    try {
      const { id } = req.params;
      
      const room = await Room.findOne({
        roomId: id,
        deletedAt: null
      }).populate({
        path: 'departmentId',
        populate: {
          path: 'branchId',
          populate: {
            path: 'clinicId',
            select: 'tenantId',
            match: req.user.role === 'SAAS_ADMIN' ? {} : { tenantId: req.user.tenantId }
          }
        }
      });

      if (!room || !room.departmentId?.branchId?.clinicId) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // For BRANCH_ADMIN and staff, ensure they can only access their own branch
      if (['BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(req.user.role)) {
        if (room.departmentId.branchId.branchId !== req.user.branchId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this room'
          });
        }
      }

      res.json({
        success: true,
        data: room
      });
    } catch (error) {
      logger.error('Error in getRoomById controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve room'
      });
    }
  }

  // List rooms
  async listRooms(req, res) {
    try {
      const {
        branchId,
        departmentId,
        page = 1,
        limit = 10,
        status,
        type,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = { deletedAt: null };
      
      if (branchId) {
        query.branchId = branchId;
      }
      
      if (departmentId) {
        query.departmentId = departmentId;
      }
      
      if (status) {
        query.status = status;
      }
      
      if (type) {
        query.type = type;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { equipment: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // For BRANCH_ADMIN and staff, filter by their branch
      if (['BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(req.user.role)) {
        query.branchId = req.user.branchId;
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      // Build aggregation pipeline for tenant filtering
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'departments',
            localField: 'departmentId',
            foreignField: 'departmentId',
            as: 'department'
          }
        },
        { $unwind: '$department' },
        {
          $lookup: {
            from: 'branches',
            localField: 'department.branchId',
            foreignField: 'branchId',
            as: 'branch'
          }
        },
        { $unwind: '$branch' },
        {
          $lookup: {
            from: 'clinics',
            localField: 'branch.clinicId',
            foreignField: 'clinicId',
            as: 'clinic'
          }
        },
        { $unwind: '$clinic' }
      ];

      // Filter by tenant for non-SAAS_ADMIN users
      if (req.user.role !== 'SAAS_ADMIN') {
        pipeline.push({
          $match: { 'clinic.tenantId': req.user.tenantId }
        });
      }

      pipeline.push(
        { $sort: sort },
        {
          $facet: {
            rooms: [
              { $skip: skip },
              { $limit: parseInt(limit) },
              {
                $project: {
                  roomId: 1,
                  branchId: 1,
                  departmentId: 1,
                  name: 1,
                  type: 1,
                  capacity: 1,
                  equipment: 1,
                  status: 1,
                  createdAt: 1,
                  updatedAt: 1
                }
              }
            ],
            totalCount: [
              { $count: 'count' }
            ]
          }
        }
      );

      const [result] = await Room.aggregate(pipeline);
      const rooms = result.rooms || [];
      const total = result.totalCount[0]?.count || 0;

      res.json({
        success: true,
        data: rooms,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error in listRooms controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve rooms'
      });
    }
  }

  // Update room
  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      
      const room = await Room.findOne({
        roomId: id,
        deletedAt: null
      }).populate({
        path: 'departmentId',
        populate: {
          path: 'branchId',
          populate: {
            path: 'clinicId',
            select: 'tenantId',
            match: req.user.role === 'SAAS_ADMIN' ? {} : { tenantId: req.user.tenantId }
          }
        }
      });

      if (!room || !room.departmentId?.branchId?.clinicId) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // For BRANCH_ADMIN, ensure they can only update their own branch
      if (req.user.role === 'BRANCH_ADMIN' && room.departmentId.branchId.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this room'
        });
      }

      Object.assign(room, req.body);
      room.updatedAt = new Date();
      
      await room.save();
      logger.info(`Room updated: ${id}`);

      res.json({
        success: true,
        message: 'Room updated successfully',
        data: room
      });
    } catch (error) {
      logger.error('Error in updateRoom controller:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Room with this name already exists in this branch'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update room'
      });
    }
  }

  // Update room status
  async updateRoomStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      
      const room = await Room.findOne({
        roomId: id,
        deletedAt: null
      }).populate({
        path: 'departmentId',
        populate: {
          path: 'branchId',
          populate: {
            path: 'clinicId',
            select: 'tenantId',
            match: req.user.role === 'SAAS_ADMIN' ? {} : { tenantId: req.user.tenantId }
          }
        }
      });

      if (!room || !room.departmentId?.branchId?.clinicId) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // For BRANCH_ADMIN and staff, ensure they can only update their own branch
      if (['BRANCH_ADMIN', 'NURSE', 'RECEPTIONIST'].includes(req.user.role)) {
        if (room.departmentId.branchId.branchId !== req.user.branchId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this room'
          });
        }
      }

      room.status = status;
      if (reason) {
        room.statusReason = reason;
      }
      room.updatedAt = new Date();
      
      await room.save();
      logger.info(`Room status updated: ${id} to ${status}`);

      res.json({
        success: true,
        message: 'Room status updated successfully',
        data: room
      });
    } catch (error) {
      logger.error('Error in updateRoomStatus controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to update room status'
      });
    }
  }

  // Delete room (soft delete)
  async deleteRoom(req, res) {
    try {
      const { id } = req.params;
      
      const room = await Room.findOne({
        roomId: id,
        deletedAt: null
      }).populate({
        path: 'departmentId',
        populate: {
          path: 'branchId',
          populate: {
            path: 'clinicId',
            select: 'tenantId',
            match: req.user.role === 'SAAS_ADMIN' ? {} : { tenantId: req.user.tenantId }
          }
        }
      });

      if (!room || !room.departmentId?.branchId?.clinicId) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // For BRANCH_ADMIN, ensure they can only delete their own branch rooms
      if (req.user.role === 'BRANCH_ADMIN' && room.departmentId.branchId.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this room'
        });
      }

      room.deletedAt = new Date();
      room.status = 'OUT_OF_SERVICE';
      
      await room.save();
      logger.info(`Room soft deleted: ${id}`);

      res.json({
        success: true,
        message: 'Room deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteRoom controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete room'
      });
    }
  }
}

module.exports = new RoomController();