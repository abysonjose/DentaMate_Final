const WorkingHours = require('../models/WorkingHours');
const Branch = require('../models/Branch');
const Department = require('../models/Department');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class WorkingHoursController {
  // Create/Update working hours
  async createWorkingHours(req, res) {
    try {
      const { branchId, departmentId } = req.body;

      // Verify branch exists and user has access
      const branch = await Branch.findOne({
        branchId,
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

      // If departmentId is provided, verify it exists and belongs to the branch
      if (departmentId) {
        const department = await Department.findOne({
          departmentId,
          branchId,
          deletedAt: null
        });

        if (!department) {
          return res.status(404).json({
            success: false,
            message: 'Department not found in this branch'
          });
        }
      }

      // For BRANCH_ADMIN, ensure they can only create for their own branch
      if (req.user.role === 'BRANCH_ADMIN' && branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this branch'
        });
      }

      // Check if working hours already exist for this combination
      const existingWorkingHours = await WorkingHours.findOne({
        branchId,
        departmentId: departmentId || null,
        dayOfWeek: req.body.dayOfWeek,
        effectiveDate: req.body.effectiveDate || null,
        deletedAt: null
      });

      if (existingWorkingHours) {
        // Update existing working hours
        Object.assign(existingWorkingHours, req.body);
        existingWorkingHours.updatedAt = new Date();
        
        await existingWorkingHours.save();
        logger.info(`Working hours updated: ${existingWorkingHours.workingHoursId}`);

        return res.json({
          success: true,
          message: 'Working hours updated successfully',
          data: existingWorkingHours
        });
      }

      // Create new working hours
      const workingHours = new WorkingHours({
        workingHoursId: uuidv4(),
        ...req.body
      });

      await workingHours.save();
      logger.info(`Working hours created: ${workingHours.workingHoursId} for branch: ${branchId}`);

      res.status(201).json({
        success: true,
        message: 'Working hours created successfully',
        data: workingHours
      });
    } catch (error) {
      logger.error('Error in createWorkingHours controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to create working hours',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get working hours by ID
  async getWorkingHoursById(req, res) {
    try {
      const { id } = req.params;
      
      const workingHours = await WorkingHours.findOne({
        workingHoursId: id,
        deletedAt: null
      }).populate({
        path: 'branchId',
        populate: {
          path: 'clinicId',
          select: 'tenantId',
          match: req.user.role === 'SAAS_ADMIN' ? {} : { tenantId: req.user.tenantId }
        }
      });

      if (!workingHours || !workingHours.branchId?.clinicId) {
        return res.status(404).json({
          success: false,
          message: 'Working hours not found'
        });
      }

      // For BRANCH_ADMIN and staff, ensure they can only access their own branch
      if (['BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(req.user.role)) {
        if (workingHours.branchId.branchId !== req.user.branchId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to these working hours'
          });
        }
      }

      res.json({
        success: true,
        data: workingHours
      });
    } catch (error) {
      logger.error('Error in getWorkingHoursById controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve working hours'
      });
    }
  }

  // Get working hours (list/filter)
  async getWorkingHours(req, res) {
    try {
      const {
        branchId,
        departmentId,
        dayOfWeek,
        isHoliday,
        effectiveDate,
        page = 1,
        limit = 10,
        sortBy = 'dayOfWeek',
        sortOrder = 'asc'
      } = req.query;

      const query = { deletedAt: null };
      
      if (branchId) {
        query.branchId = branchId;
      }
      
      if (departmentId) {
        query.departmentId = departmentId;
      }
      
      if (dayOfWeek) {
        query.dayOfWeek = dayOfWeek;
      }
      
      if (isHoliday !== undefined) {
        query.isHoliday = isHoliday === 'true';
      }
      
      if (effectiveDate) {
        query.effectiveDate = new Date(effectiveDate);
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
            workingHours: [
              { $skip: skip },
              { $limit: parseInt(limit) },
              {
                $project: {
                  workingHoursId: 1,
                  branchId: 1,
                  departmentId: 1,
                  dayOfWeek: 1,
                  openTime: 1,
                  closeTime: 1,
                  isHoliday: 1,
                  holidayName: 1,
                  effectiveDate: 1,
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

      const [result] = await WorkingHours.aggregate(pipeline);
      const workingHours = result.workingHours || [];
      const total = result.totalCount[0]?.count || 0;

      res.json({
        success: true,
        data: workingHours,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error in getWorkingHours controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve working hours'
      });
    }
  }

  // Update working hours
  async updateWorkingHours(req, res) {
    try {
      const { id } = req.params;
      
      const workingHours = await WorkingHours.findOne({
        workingHoursId: id,
        deletedAt: null
      }).populate({
        path: 'branchId',
        populate: {
          path: 'clinicId',
          select: 'tenantId',
          match: req.user.role === 'SAAS_ADMIN' ? {} : { tenantId: req.user.tenantId }
        }
      });

      if (!workingHours || !workingHours.branchId?.clinicId) {
        return res.status(404).json({
          success: false,
          message: 'Working hours not found'
        });
      }

      // For BRANCH_ADMIN, ensure they can only update their own branch
      if (req.user.role === 'BRANCH_ADMIN' && workingHours.branchId.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to these working hours'
        });
      }

      Object.assign(workingHours, req.body);
      workingHours.updatedAt = new Date();
      
      await workingHours.save();
      logger.info(`Working hours updated: ${id}`);

      res.json({
        success: true,
        message: 'Working hours updated successfully',
        data: workingHours
      });
    } catch (error) {
      logger.error('Error in updateWorkingHours controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to update working hours'
      });
    }
  }

  // Delete working hours
  async deleteWorkingHours(req, res) {
    try {
      const { id } = req.params;
      
      const workingHours = await WorkingHours.findOne({
        workingHoursId: id,
        deletedAt: null
      }).populate({
        path: 'branchId',
        populate: {
          path: 'clinicId',
          select: 'tenantId',
          match: req.user.role === 'SAAS_ADMIN' ? {} : { tenantId: req.user.tenantId }
        }
      });

      if (!workingHours || !workingHours.branchId?.clinicId) {
        return res.status(404).json({
          success: false,
          message: 'Working hours not found'
        });
      }

      // For BRANCH_ADMIN, ensure they can only delete their own branch working hours
      if (req.user.role === 'BRANCH_ADMIN' && workingHours.branchId.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to these working hours'
        });
      }

      workingHours.deletedAt = new Date();
      
      await workingHours.save();
      logger.info(`Working hours deleted: ${id}`);

      res.json({
        success: true,
        message: 'Working hours deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteWorkingHours controller:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete working hours'
      });
    }
  }
}

module.exports = new WorkingHoursController();