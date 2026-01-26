const SubscriptionPlan = require('../models/SubscriptionPlan');
const SaasAuditLog = require('../models/SaasAuditLog');
const logger = require('../utils/logger');

class SubscriptionPlanService {

  async createPlan(planData, createdBy) {
    try {
      // Check if plan with same name exists
      const existingPlan = await SubscriptionPlan.findOne({ name: planData.name });
      if (existingPlan) {
        throw new Error('Subscription plan with this name already exists');
      }

      // Create plan
      const plan = new SubscriptionPlan({
        ...planData,
        auditInfo: {
          createdBy,
          createdAt: new Date()
        }
      });

      await plan.save();

      // Log audit
      await SaasAuditLog.logAction({
        action: 'PLAN_CREATED',
        entityType: 'SUBSCRIPTION_PLAN',
        entityId: plan.planId,
        performedBy: {
          userId: createdBy,
          userRole: 'SAAS_ADMIN'
        },
        changes: {
          after: plan.toPublicJSON(),
          summary: `Created subscription plan: ${plan.name}`
        },
        impact: {
          severity: 'MEDIUM',
          systemWideImpact: true
        }
      });

      logger.info(`Subscription plan created: ${plan.planId}`);
      return plan.toPublicJSON();

    } catch (error) {
      logger.error('Error creating subscription plan:', error);
      throw error;
    }
  }

  async updatePlan(planId, updateData, updatedBy) {
    try {
      const plan = await SubscriptionPlan.findOne({ planId });
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const oldData = plan.toPublicJSON();

      // Update plan
      Object.assign(plan, updateData);
      plan.auditInfo.updatedBy = updatedBy;
      plan.auditInfo.updatedAt = new Date();
      plan.auditInfo.version += 1;

      await plan.save();

      // Log audit
      await SaasAuditLog.logAction({
        action: 'PLAN_UPDATED',
        entityType: 'SUBSCRIPTION_PLAN',
        entityId: plan.planId,
        performedBy: {
          userId: updatedBy,
          userRole: 'SAAS_ADMIN'
        },
        changes: {
          before: oldData,
          after: plan.toPublicJSON(),
          fields: Object.keys(updateData),
          summary: `Updated subscription plan: ${plan.name}`
        },
        impact: {
          severity: 'MEDIUM',
          systemWideImpact: true
        }
      });

      logger.info(`Subscription plan updated: ${planId}`);
      return plan.toPublicJSON();

    } catch (error) {
      logger.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  async deprecatePlan(planId, deprecatedBy, reason) {
    try {
      const plan = await SubscriptionPlan.findOne({ planId });
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const oldData = plan.toPublicJSON();

      plan.status = 'DEPRECATED';
      plan.auditInfo.updatedBy = deprecatedBy;
      plan.auditInfo.updatedAt = new Date();

      await plan.save();

      // Log audit
      await SaasAuditLog.logAction({
        action: 'PLAN_DEPRECATED',
        entityType: 'SUBSCRIPTION_PLAN',
        entityId: plan.planId,
        performedBy: {
          userId: deprecatedBy,
          userRole: 'SAAS_ADMIN'
        },
        changes: {
          before: oldData,
          after: plan.toPublicJSON(),
          fields: ['status'],
          summary: `Deprecated subscription plan: ${plan.name}. Reason: ${reason}`
        },
        impact: {
          severity: 'HIGH',
          systemWideImpact: true,
          businessImpact: 'Plan no longer available for new subscriptions'
        }
      });

      logger.warn(`Subscription plan deprecated: ${planId}, Reason: ${reason}`);
      return plan.toPublicJSON();

    } catch (error) {
      logger.error('Error deprecating subscription plan:', error);
      throw error;
    }
  }

  async activatePlan(planId, activatedBy) {
    try {
      const plan = await SubscriptionPlan.findOne({ planId });
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const oldData = plan.toPublicJSON();

      plan.status = 'ACTIVE';
      plan.auditInfo.updatedBy = activatedBy;
      plan.auditInfo.updatedAt = new Date();

      await plan.save();

      // Log audit
      await SaasAuditLog.logAction({
        action: 'PLAN_ACTIVATED',
        entityType: 'SUBSCRIPTION_PLAN',
        entityId: plan.planId,
        performedBy: {
          userId: activatedBy,
          userRole: 'SAAS_ADMIN'
        },
        changes: {
          before: oldData,
          after: plan.toPublicJSON(),
          fields: ['status'],
          summary: `Activated subscription plan: ${plan.name}`
        },
        impact: {
          severity: 'MEDIUM',
          systemWideImpact: true
        }
      });

      logger.info(`Subscription plan activated: ${planId}`);
      return plan.toPublicJSON();

    } catch (error) {
      logger.error('Error activating subscription plan:', error);
      throw error;
    }
  }

  async getAllPlans(includeInactive = false) {
    try {
      const query = includeInactive ? {} : { status: 'ACTIVE' };
      
      const plans = await SubscriptionPlan.find(query)
        .sort({ isPopular: -1, 'pricing.monthly.price': 1 })
        .lean();

      return plans.map(plan => {
        delete plan._id;
        delete plan.__v;
        return plan;
      });

    } catch (error) {
      logger.error('Error getting subscription plans:', error);
      throw error;
    }
  }

  async getPlanById(planId) {
    try {
      const plan = await SubscriptionPlan.findOne({ planId }).lean();
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      delete plan._id;
      delete plan.__v;
      return plan;

    } catch (error) {
      logger.error('Error getting subscription plan:', error);
      throw error;
    }
  }

  async getPopularPlans() {
    try {
      const plans = await SubscriptionPlan.find({ 
        status: 'ACTIVE', 
        isPopular: true 
      }).sort({ 'pricing.monthly.price': 1 }).lean();

      return plans.map(plan => {
        delete plan._id;
        delete plan.__v;
        return plan;
      });

    } catch (error) {
      logger.error('Error getting popular plans:', error);
      throw error;
    }
  }

  async createCustomPlan(basePlanId, customizations, createdBy, tenantId) {
    try {
      const basePlan = await SubscriptionPlan.findOne({ planId: basePlanId });
      if (!basePlan) {
        throw new Error('Base subscription plan not found');
      }

      // Create custom plan based on base plan
      const customPlan = new SubscriptionPlan({
        name: `${basePlan.name}_CUSTOM_${tenantId}`,
        displayName: `${basePlan.displayName} (Custom)`,
        description: `Custom plan based on ${basePlan.displayName}`,
        pricing: customizations.pricing || basePlan.pricing,
        limits: { ...basePlan.limits, ...customizations.limits },
        features: {
          enabledModules: customizations.enabledModules || basePlan.features.enabledModules,
          aiFeatures: { ...basePlan.features.aiFeatures, ...customizations.aiFeatures },
          advancedFeatures: { ...basePlan.features.advancedFeatures, ...customizations.advancedFeatures }
        },
        status: 'ACTIVE',
        isCustomizable: false, // Custom plans cannot be further customized
        trialPeriodDays: customizations.trialPeriodDays || basePlan.trialPeriodDays,
        metadata: {
          targetAudience: `Custom plan for tenant ${tenantId}`,
          basePlanId: basePlanId
        },
        auditInfo: {
          createdBy,
          createdAt: new Date()
        }
      });

      await customPlan.save();

      // Log audit
      await SaasAuditLog.logAction({
        action: 'PLAN_CREATED',
        entityType: 'SUBSCRIPTION_PLAN',
        entityId: customPlan.planId,
        tenantId,
        performedBy: {
          userId: createdBy,
          userRole: 'SAAS_ADMIN'
        },
        changes: {
          after: customPlan.toPublicJSON(),
          summary: `Created custom plan for tenant ${tenantId} based on ${basePlan.name}`
        },
        impact: {
          severity: 'MEDIUM',
          affectedTenants: [tenantId]
        }
      });

      logger.info(`Custom subscription plan created: ${customPlan.planId} for tenant: ${tenantId}`);
      return customPlan.toPublicJSON();

    } catch (error) {
      logger.error('Error creating custom subscription plan:', error);
      throw error;
    }
  }

  async getPlanUsageStats() {
    try {
      const stats = await SubscriptionPlan.aggregate([
        {
          $lookup: {
            from: 'licenses',
            localField: 'planId',
            foreignField: 'planId',
            as: 'licenses'
          }
        },
        {
          $project: {
            planId: 1,
            name: 1,
            displayName: 1,
            status: 1,
            'pricing.monthly.price': 1,
            'pricing.yearly.price': 1,
            totalLicenses: { $size: '$licenses' },
            activeLicenses: {
              $size: {
                $filter: {
                  input: '$licenses',
                  cond: { $eq: ['$$this.status', 'ACTIVE'] }
                }
              }
            },
            trialLicenses: {
              $size: {
                $filter: {
                  input: '$licenses',
                  cond: { $eq: ['$$this.status', 'TRIAL'] }
                }
              }
            }
          }
        },
        {
          $sort: { totalLicenses: -1 }
        }
      ]);

      return stats;

    } catch (error) {
      logger.error('Error getting plan usage stats:', error);
      throw error;
    }
  }
}

module.exports = SubscriptionPlanService;