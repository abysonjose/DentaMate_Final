const Branch = require('../models/Branch');
const Clinic = require('../models/Clinic');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class BranchService {
  async createBranch(branchData, tenantId) {
    try {
      // Verify clinic exists and belongs to tenant
      const clinic = await Clinic.findOne({
        clinicId: branchData.clinicId,
        tenantId,
        deletedAt: null
      });

      if (!clinic) {
        const error = new Error('Clinic not found or access denied');
        error.statusCode = 404;
        throw error;
      }

      const branch = new Branch({
        branchId: uuidv4(),
        ...branchData
      });

      await branch.save();
      logger.info(`Branch created: ${branch.branchId} for clinic: ${branchData.clinicId}`);
      
      return branch;
    } catch (error) {
      logger.error('Error creating branch:', error);
      throw error;
    }
  }

  async getBranchById(branchId, tenantId, userRole, userBranchId) {
    try {
      const branch = await Branch.findOne({
        branchId,
        deletedAt: null
      }).populate({
        path: 'clinicId',
        select: 'clinicId name tenantId',
        match: userRole === 'SAAS_ADMIN' ? {} : { tenantId }
      });

      if (!branch || !branch.clinicId) {
        const error = new Error('Branch not found');
        error.statusCode = 404;
        throw error;
      }

      // For BRANCH_ADMIN and staff, ensure they can only access their own branch
      if (['BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(userRole)) {
        if (branchId !== userBranchId) {
          const error = new Error('Access denied to this branch');
          error.statusCode = 403;
          throw error;
        }
      }

      return branch;
    } catch (error) {
      logger.error('Error getting branch by ID:', error);
      throw error;
    }
  }

  async listBranches(filters, tenantId, userRole, userBranchId) {
    try {
      const {
        clinicId,
        page = 1,
        limit = 10,
        status,
        search,
        city,
        state,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build aggregation pipeline
      const pipeline = [];

      // Match stage
      const matchStage = { deletedAt: null };
      
      if (status) matchStage.status = status;
      if (clinicId) matchStage.clinicId = clinicId;
      if (city) matchStage['address.city'] = { $regex: city, $options: 'i' };
      if (state) matchStage['address.state'] = { $regex: state, $options: 'i' };

      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: 'i' } },
          { 'address.city': { $regex: search, $options: 'i' } },
          { 'address.state': { $regex: search, $options: 'i' } }
        ];
      }

      // For BRANCH_ADMIN and staff, filter by their branch
      if (['BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(userRole)) {
        matchStage.branchId = userBranchId;
      }

      pipeline.push({ $match: matchStage });

      // Lookup clinic information
      pipeline.push({
        $lookup: {
          from: 'clinics',
          localField: 'clinicId',
          foreignField: 'clinicId',
          as: 'clinic'
        }
      });

      // Unwind clinic
      pipeline.push({ $unwind: '$clinic' });

      // Filter by tenant for non-SAAS_ADMIN users
      if (userRole !== 'SAAS_ADMIN') {
        pipeline.push({
          $match: { 'clinic.tenantId': tenantId }
        });
      }

      // Sort stage
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      pipeline.push({ $sort: sort });

      // Facet for pagination
      pipeline.push({
        $facet: {
          branches: [
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) }
          ],
          totalCount: [
            { $count: 'count' }
          ]
        }
      });

      const [result] = await Branch.aggregate(pipeline);
      const branches = result.branches || [];
      const total = result.totalCount[0]?.count || 0;

      return {
        branches,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error listing branches:', error);
      throw error;
    }
  }

  async updateBranch(branchId, updateData, tenantId, userRole, userBranchId) {
    try {
      // For BRANCH_ADMIN, ensure they can only update their own branch
      if (userRole === 'BRANCH_ADMIN' && branchId !== userBranchId) {
        const error = new Error('Access denied to this branch');
        error.statusCode = 403;
        throw error;
      }

      const branch = await Branch.findOne({
        branchId,
        deletedAt: null
      }).populate({
        path: 'clinicId',
        select: 'tenantId',
        match: userRole === 'SAAS_ADMIN' ? {} : { tenantId }
      });

      if (!branch || !branch.clinicId) {
        const error = new Error('Branch not found');
        error.statusCode = 404;
        throw error;
      }

      Object.assign(branch, updateData);
      branch.updatedAt = new Date();
      
      await branch.save();
      logger.info(`Branch updated: ${branchId}`);
      
      return branch;
    } catch (error) {
      logger.error('Error updating branch:', error);
      throw error;
    }
  }

  async deleteBranch(branchId, tenantId, userRole) {
    try {
      const branch = await Branch.findOne({
        branchId,
        deletedAt: null
      }).populate({
        path: 'clinicId',
        select: 'tenantId',
        match: userRole === 'SAAS_ADMIN' ? {} : { tenantId }
      });

      if (!branch || !branch.clinicId) {
        const error = new Error('Branch not found');
        error.statusCode = 404;
        throw error;
      }

      branch.deletedAt = new Date();
      branch.status = 'INACTIVE';
      
      await branch.save();
      logger.info(`Branch soft deleted: ${branchId}`);
      
      return branch;
    } catch (error) {
      logger.error('Error deleting branch:', error);
      throw error;
    }
  }

  async getBranchesByClinic(clinicId, tenantId) {
    try {
      const branches = await Branch.find({
        clinicId,
        deletedAt: null,
        status: 'ACTIVE'
      }).populate({
        path: 'clinicId',
        select: 'tenantId',
        match: { tenantId }
      }).select('branchId name address status');

      return branches.filter(branch => branch.clinicId);
    } catch (error) {
      logger.error('Error getting branches by clinic:', error);
      throw error;
    }
  }
}

module.exports = new BranchService();