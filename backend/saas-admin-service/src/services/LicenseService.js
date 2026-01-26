const License = require('../models/License');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SaasAuditLog = require('../models/SaasAuditLog');
const { generateLicenseKey } = require('../utils/licenseGenerator');
const logger = require('../utils/logger');

class LicenseService {
  
  async issueLicense(tenantId, planId, issuedBy, options = {}) {
    try {
      // Get subscription plan details
      const plan = await SubscriptionPlan.findOne({ planId, status: 'ACTIVE' });
      if (!plan) {
        throw new Error('Subscription plan not found or inactive');
      }

      // Check if tenant already has an active license
      const existingLicense = await License.findOne({ 
        tenantId, 
        status: { $in: ['TRIAL', 'ACTIVE'] } 
      });
      
      if (existingLicense) {
        throw new Error('Tenant already has an active license');
      }

      // Generate license key
      const licenseKey = generateLicenseKey(tenantId, planId);

      // Calculate validity dates
      const startDate = options.startDate || new Date();
      const trialEndDate = new Date(startDate);
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialPeriodDays);
      
      const endDate = options.endDate || new Date(startDate);
      if (options.billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Create license
      const license = new License({
        licenseKey,
        tenantId,
        planId,
        status: options.skipTrial ? 'ACTIVE' : 'TRIAL',
        validity: {
          startDate,
          endDate,
          trialEndDate: options.skipTrial ? null : trialEndDate,
          gracePeriodDays: options.gracePeriodDays || 7
        },
        subscription: {
          billingCycle: options.billingCycle || 'monthly',
          autoRenewal: options.autoRenewal !== false,
          nextBillingDate: options.skipTrial ? endDate : trialEndDate
        },
        limits: {
          maxBranches: plan.limits.maxBranches,
          maxUsers: plan.limits.maxUsers,
          maxAppointmentsPerMonth: plan.limits.maxAppointmentsPerMonth,
          storageQuotaGB: plan.limits.storageQuotaGB,
          maxAiRequestsPerMonth: plan.limits.maxAiRequestsPerMonth
        },
        features: {
          enabledModules: [...plan.features.enabledModules],
          aiFeatures: { ...plan.features.aiFeatures },
          customizations: { ...plan.features.advancedFeatures }
        },
        auditInfo: {
          issuedBy
        }
      });

      await license.save();

      // Log audit
      await SaasAuditLog.logAction({
        action: 'LICENSE_ISSUED',
        entityType: 'LICENSE',
        entityId: license.licenseId,
        tenantId,
        performedBy: {
          userId: issuedBy,
          userRole: 'SAAS_ADMIN'
        },
        changes: {
          after: license.toPublicJSON(),
          summary: `License issued for plan ${plan.name}`
        },
        impact: {
          severity: 'MEDIUM',
          affectedTenants: [tenantId]
        }
      });

      logger.info(`License issued successfully: ${license.licenseId} for tenant: ${tenantId}`);
      return license.toPublicJSON();

    } catch (error) {
      logger.error('Error issuing license:', error);
      throw error;
    }
  }

  async renewLicense(licenseId, renewedBy, options = {}) {
    try {
      const license = await License.findOne({ licenseId });
      if (!license) {
        throw new Error('License not found');
      }

      const oldEndDate = license.validity.endDate;
      const newEndDate = new Date(oldEndDate);
      
      if (license.subscription.billingCycle === 'yearly') {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      }

      const oldData = license.toPublicJSON();

      // Update license
      license.validity.endDate = newEndDate;
      license.subscription.nextBillingDate = newEndDate;
      license.subscription.lastPaymentDate = new Date();
      license.subscription.paymentStatus = 'PAID';
      license.status = 'ACTIVE';
      license.auditInfo.lastModifiedBy = renewedBy;
      license.auditInfo.lastModifiedAt = new Date();

      await license.save();

      // Log audit
      await SaasAuditLog.logAction({
        action: 'LICENSE_RENEWED',
        entityType: 'LICENSE',
        entityId: license.licenseId,
        tenantId: license.tenantId,
        performedBy: {
          userId: renewedBy,
          userRole: 'SAAS_ADMIN'
        },
        changes: {
          before: oldData,
          after: license.toPublicJSON(),
          fields: ['validity.endDate', 'subscription.nextBillingDate', 'status'],
          summary: `License renewed until ${newEndDate.toISOString().split('T')[0]}`
        },
        impact: {
          severity: 'LOW',
          affectedTenants: [license.tenantId]
        }
      });

      logger.info(`License renewed successfully: ${licenseId}`);
      return license.toPublicJSON();

    } catch (error) {
      logger.error('Error renewing license:', error);
      throw error;
    }
  }

  async suspendLicense(licenseId, suspendedBy, reason) {
    try {
      const license = await License.findOne({ licenseId });
      if (!license) {
        throw new Error('License not found');
      }

      if (license.status === 'SUSPENDED') {
        throw new Error('License is already suspended');
      }

      const oldData = license.toPublicJSON();

      license.status = 'SUSPENDED';
      license.restrictions.suspensionReason = reason;
      license.auditInfo.lastModifiedBy = suspendedBy;
      license.auditInfo.lastModifiedAt = new Date();

      await license.save();

      // Log audit
      await SaasAuditLog.logAction({
        action: 'LICENSE_SUSPENDED',
        entityType: 'LICENSE',
        entityId: license.licenseId,
        tenantId: license.tenantId,
        performedBy: {
          userId: suspendedBy,
          userRole: 'SAAS_ADMIN'
        },
        changes: {
          before: oldData,
          after: license.toPublicJSON(),
          fields: ['status', 'restrictions.suspensionReason'],
          summary: `License suspended: ${reason}`
        },
        impact: {
          severity: 'HIGH',
          affectedTenants: [license.tenantId],
          businessImpact: 'Tenant services suspended'
        }
      });

      logger.warn(`License suspended: ${licenseId}, Reason: ${reason}`);
      return license.toPublicJSON();

    } catch (error) {
      logger.error('Error suspending license:', error);
      throw error;
    }
  }

  async revokeLicense(licenseId, revokedBy, reason) {
    try {
      const license = await License.findOne({ licenseId });
      if (!license) {
        throw new Error('License not found');
      }

      const oldData = license.toPublicJSON();

      license.status = 'REVOKED';
      license.auditInfo.revocationReason = reason;
      license.auditInfo.revokedBy = revokedBy;
      license.auditInfo.revokedAt = new Date();
      license.auditInfo.lastModifiedBy = revokedBy;
      license.auditInfo.lastModifiedAt = new Date();

      await license.save();

      // Log audit
      await SaasAuditLog.logAction({
        action: 'LICENSE_REVOKED',
        entityType: 'LICENSE',
        entityId: license.licenseId,
        tenantId: license.tenantId,
        performedBy: {
          userId: revokedBy,
          userRole: 'SAAS_ADMIN'
        },
        changes: {
          before: oldData,
          after: license.toPublicJSON(),
          fields: ['status', 'auditInfo.revocationReason'],
          summary: `License revoked: ${reason}`
        },
        impact: {
          severity: 'CRITICAL',
          affectedTenants: [license.tenantId],
          businessImpact: 'Tenant permanently terminated'
        }
      });

      logger.warn(`License revoked: ${licenseId}, Reason: ${reason}`);
      return license.toPublicJSON();

    } catch (error) {
      logger.error('Error revoking license:', error);
      throw error;
    }
  }

  async updateUsage(licenseId, usageData) {
    try {
      const license = await License.findOne({ licenseId });
      if (!license) {
        throw new Error('License not found');
      }

      // Update usage statistics
      Object.assign(license.usage, usageData);
      license.usage.lastUsageUpdate = new Date();

      await license.save();

      // Check for usage warnings
      await this.checkUsageWarnings(license);

      return license.toPublicJSON();

    } catch (error) {
      logger.error('Error updating license usage:', error);
      throw error;
    }
  }

  async checkUsageWarnings(license) {
    const warningThreshold = license.notifications.usageWarningThreshold;
    const now = new Date();
    const lastWarning = license.notifications.lastUsageWarning;
    
    // Only send warnings once per day
    if (lastWarning && (now - lastWarning) < 24 * 60 * 60 * 1000) {
      return;
    }

    const usageTypes = ['branches', 'users', 'appointments', 'storage', 'ai'];
    const warnings = [];

    for (const type of usageTypes) {
      const percentage = license.getUsagePercentage(type);
      if (percentage >= warningThreshold) {
        warnings.push({ type, percentage });
      }
    }

    if (warnings.length > 0) {
      license.notifications.lastUsageWarning = now;
      await license.save();

      // Log usage warning
      await SaasAuditLog.logAction({
        action: 'USAGE_WARNING_TRIGGERED',
        entityType: 'LICENSE',
        entityId: license.licenseId,
        tenantId: license.tenantId,
        performedBy: {
          userId: 'system',
          userRole: 'SYSTEM'
        },
        changes: {
          summary: `Usage warnings: ${warnings.map(w => `${w.type}: ${w.percentage}%`).join(', ')}`
        },
        impact: {
          severity: 'MEDIUM',
          affectedTenants: [license.tenantId]
        }
      });
    }
  }

  async getAllLicenses(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      const query = {};
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.tenantId) {
        query.tenantId = filters.tenantId;
      }
      
      if (filters.planId) {
        query.planId = filters.planId;
      }

      if (filters.expiringInDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.expiringInDays);
        query['validity.endDate'] = { $lte: futureDate };
      }

      const [licenses, total] = await Promise.all([
        License.find(query)
          .sort({ 'auditInfo.issuedAt': -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        License.countDocuments(query)
      ]);

      return {
        licenses: licenses.map(license => {
          delete license._id;
          delete license.__v;
          return license;
        }),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error getting licenses:', error);
      throw error;
    }
  }

  async getLicenseByTenant(tenantId) {
    try {
      const license = await License.findOne({ tenantId }).lean();
      if (!license) {
        return null;
      }

      delete license._id;
      delete license.__v;
      return license;

    } catch (error) {
      logger.error('Error getting license by tenant:', error);
      throw error;
    }
  }

  async getExpiringLicenses(days = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const licenses = await License.find({
        status: { $in: ['TRIAL', 'ACTIVE'] },
        'validity.endDate': { $lte: futureDate }
      }).sort({ 'validity.endDate': 1 }).lean();

      return licenses.map(license => {
        delete license._id;
        delete license.__v;
        return license;
      });

    } catch (error) {
      logger.error('Error getting expiring licenses:', error);
      throw error;
    }
  }
}

module.exports = LicenseService;