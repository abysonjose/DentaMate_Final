const Department = require('../models/Department');
const Branch = require('../models/Branch');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class DepartmentController {
  // Create a new department
  async createDepartment(req, res) {
    try {
      // Verify branch exists and user has access
      const branch = await Branch.findOne({
        branchId: req.body.branchId,
        deletedAt: null
      }).populate({
        path: 'clinicId',
        select: 'tenantId',
        match: req.user.role === 'SAAS_ADMIN' ? {} : { tenantId: req.user.tenantId }
      });

      if (!branch || !branch.clinicId) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found or access denied'
        });
      }

      // For BRANCH_ADMIN, ensure they can only create in their own branch
      if (req.user.role === 'BRANCH_ADMIN' && req.body.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this branch'
        });
      }

      const department = new Department({
        departmentId: uuidv4(),
        ...req.body
      });

      await department.save();
      logger.info(`Department created: ${department.departmentId} for branch: ${req.body.branchId}`);

      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: department
      });
    } catch (error) {
      logger.error('Error in createDepartment controller:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Department with this name already exists in this branch'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create department',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get department by ID
  async getDepartmentById(req, res) {
    try {
      const { id } = req.params;
      
      const department = await Department.findOne({
        departmentId: id,
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
          message: 'Department not found'
        });
      }

      // For BRANCH_ADMIN and staff, ensure they can only access their own branch
      if (['BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(req.user.role)) {
        if (department.branchId.branchId !== req.user.branchId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this department'
          });
        }
      }

      res.json({
        success: true,
        data: department
      });
    } catch (error) {
      logger.error('Error in getDepartmentById controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve department'
      });
    }
  }

  // List departments
  async listDepartments(req, res) {
    try {
      const {
        branchId,
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
      
      if (status) {
        query.status = status;
      }
      
      if (type) {
        query.type = type;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
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
            from: 'branches',
            localField: 'branchId',
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
            departments: [
              { $skip: skip },
              { $limit: parseInt(limit) },
              {
                $project: {
                  departmentId: 1,
                  branchId: 1,
                  name: 1,
                  type: 1,
                  description: 1,
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

      const [result] = await Department.aggregate(pipeline);
      const departments = result.departments || [];
      const total = result.totalCount[0]?.count || 0;

      res.json({
        success: true,
        data: departments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error in listDepartments controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve departments'
      });
    }
  }

  // Update department
  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      
      const department = await Department.findOne({
        departmentId: id,
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
          message: 'Department not found'
        });
      }

      // For BRANCH_ADMIN, ensure they can only update their own branch
      if (req.user.role === 'BRANCH_ADMIN' && department.branchId.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this department'
        });
      }

      Object.assign(department, req.body);
      department.updatedAt = new Date();
      
      await department.save();
      logger.info(`Department updated: ${id}`);

      res.json({
        success: true,
        message: 'Department updated successfully',
        data: department
      });
    } catch (error) {
      logger.error('Error in updateDepartment controller:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Department with this name already exists in this branch'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update department'
      });
    }
  }

  // Delete department (soft delete)
  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      
      const department = await Department.findOne({
        departmentId: id,
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
          message: 'Department not found'
        });
      }

      // For BRANCH_ADMIN, ensure they can only delete their own branch departments
      if (req.user.role === 'BRANCH_ADMIN' && department.branchId.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this department'
        });
      }

      department.deletedAt = new Date();
      department.status = 'INACTIVE';
      
      await department.save();
      logger.info(`Department soft deleted: ${id}`);

      res.json({
        success: true,
        message: 'Department deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteDepartment controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete department'
      });
    }
  }
}

module.exports = new DepartmentController();