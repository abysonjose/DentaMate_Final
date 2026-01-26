const License = require('../models/License');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SaasAuditLog = require('../models/SaasAuditLog');
const axios = require('axios');
const logger = require('../utils/logger');

class SaasAnalyticsService {

  async getPlatformOverview(period = '30d') {
    try {
      const days = parseInt(period.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalClinics,
        activeClinics,
        totalRevenue,
        newSignups,
        churnedClinics,
        systemHealth
      ] = await Promise.all([
        this.getTotalClinics(),
        this.getActiveClinics(),
        this.getTotalRevenue(startDate),
        this.getNewSignups(startDate),
        this.getChurnedClinics(startDate),
        this.getSystemHealth()
      ]);

      const activeUsers = await this.getActiveUsers();
      const subscriptionDistribution = await this.getSubscriptionDistribution();
      const revenueGrowth = await this.getRevenueGrowth(days);

      return {
        overview: {
          totalClinics,
          activeClinics,
          inactiveClinics: totalClinics - activeClinics,
          totalRevenue,
          activeUsers,
          systemHealth: systemHealth.overallHealth
        },
        growth: {
          newSignups,
          churnedClinics,
          netGrowth: newSignups - churnedClinics,
          revenueGrowth
        },
        distribution: {
          subscriptionDistribution,
          geographicDistribution: await this.getGeographicDistribution()
        },
        alerts: await this.getSystemAlerts()
      };

    } catch (error) {
      logger.error('Error getting platform overview:', error);
      throw error;
    }
  }

  async getTotalClinics() {
    try {
      return await License.countDocuments({});
    } catch (error) {
      logger.error('Error getting total clinics:', error);
      return 0;
    }
  }

  async getActiveClinics() {
    try {
      return await License.countDocuments({
        status: { $in: ['TRIAL', 'ACTIVE'] }
      });
    } catch (error) {
      logger.error('Error getting active clinics:', error);
      return 0;
    }
  }

  async getTotalRevenue(startDate) {
    try {
      // This would typically integrate with a billing service
      // For now, we'll calculate based on active licenses and their plans
      const activeLicenses = await License.find({
        status: 'ACTIVE',
        'subscription.lastPaymentDate': { $gte: startDate }
      }).populate('planId');

      let totalRevenue = 0;
      for (const license of activeLicenses) {
        if (license.planId) {
          const price = license.subscription.billingCycle === 'yearly' 
            ? license.planId.pricing.yearly.price 
            : license.planId.pricing.monthly.price;
          totalRevenue += price;
        }
      }

      return totalRevenue;
    } catch (error) {
      logger.error('Error calculating total revenue:', error);
      return 0;
    }
  }

  async getNewSignups(startDate) {
    try {
      return await License.countDocuments({
        'auditInfo.issuedAt': { $gte: startDate }
      });
    } catch (error) {
      logger.error('Error getting new signups:', error);
      return 0;
    }
  }

  async getChurnedClinics(startDate) {
    try {
      return await License.countDocuments({
        status: { $in: ['EXPIRED', 'REVOKED'] },
        'auditInfo.lastModifiedAt': { $gte: startDate }
      });
    } catch (error) {
      logger.error('Error getting churned clinics:', error);
      return 0;
    }
  }

  async getActiveUsers() {
    try {
      // This would integrate with the user service to get actual user counts
      // For now, we'll sum up the current users from all active licenses
      const result = await License.aggregate([
        { $match: { status: { $in: ['TRIAL', 'ACTIVE'] } } },
        { $group: { _id: null, totalUsers: { $sum: '$usage.currentUsers' } } }
      ]);

      return result.length > 0 ? result[0].totalUsers : 0;
    } catch (error) {
      logger.error('Error getting active users:', error);
      return 0;
    }
  }

  async getSubscriptionDistribution() {
    try {
      const distribution = await License.aggregate([
        { $match: { status: { $in: ['TRIAL', 'ACTIVE'] } } },
        {
          $lookup: {
            from: 'subscription_plans',
            localField: 'planId',
            foreignField: 'planId',
            as: 'plan'
          }
        },
        { $unwind: '$plan' },
        {
          $group: {
            _id: '$plan.name',
            count: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: {
                  if: { $eq: ['$subscription.billingCycle', 'yearly'] },
                  then: '$plan.pricing.yearly.price',
                  else: '$plan.pricing.monthly.price'
                }
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return distribution.map(item => ({
        plan: item._id,
        clinics: item.count,
        revenue: item.revenue
      }));
    } catch (error) {
      logger.error('Error getting subscription distribution:', error);
      return [];
    }
  }

  async getGeographicDistribution() {
    try {
      // This would integrate with tenant service to get geographic data
      // For now, return mock data
      return [
        { region: 'North America', clinics: 45, users: 1250 },
        { region: 'Europe', clinics: 32, users: 890 },
        { region: 'Asia Pacific', clinics: 28, users: 760 },
        { region: 'Latin America', clinics: 15, users: 420 },
        { region: 'Others', clinics: 8, users: 180 }
      ];
    } catch (error) {
      logger.error('Error getting geographic distribution:', error);
      return [];
    }
  }

  async getRevenueGrowth(days) {
    try {
      const currentPeriodStart = new Date();
      currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
      
      const previousPeriodStart = new Date();
      previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
      const previousPeriodEnd = new Date();
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

      const [currentRevenue, previousRevenue] = await Promise.all([
        this.getTotalRevenue(currentPeriodStart),
        this.getTotalRevenue(previousPeriodStart, previousPeriodEnd)
      ]);

      const growth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      return {
        current: currentRevenue,
        previous: previousRevenue,
        growthPercentage: Math.round(growth * 100) / 100
      };
    } catch (error) {
      logger.error('Error calculating revenue growth:', error);
      return { current: 0, previous: 0, growthPercentage: 0 };
    }
  }

  async getSystemHealth() {
    try {
      // This would integrate with monitoring services
      // For now, return mock health data
      const services = [
        { name: 'API Gateway', status: 'healthy', uptime: 99.9 },
        { name: 'Auth Service', status: 'healthy', uptime: 99.8 },
        { name: 'Tenant Service', status: 'healthy', uptime: 99.7 },
        { name: 'Appointment Service', status: 'healthy', uptime: 99.9 },
        { name: 'AI Service', status: 'degraded', uptime: 98.5 },
        { name: 'Database', status: 'healthy', uptime: 99.9 }
      ];

      const healthyServices = services.filter(s => s.status === 'healthy').length;
      const overallHealth = Math.round((healthyServices / services.length) * 100);

      return {
        overallHealth,
        services,
        criticalIssues: services.filter(s => s.status === 'critical').length,
        warnings: services.filter(s => s.status === 'degraded').length
      };
    } catch (error) {
      logger.error('Error getting system health:', error);
      return { overallHealth: 0, services: [], criticalIssues: 0, warnings: 0 };
    }
  }

  async getSystemAlerts() {
    try {
      const alerts = await SaasAuditLog.find({
        'impact.severity': { $in: ['HIGH', 'CRITICAL'] },
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).sort({ timestamp: -1 }).limit(10);

      return alerts.map(alert => ({
        id: alert.logId,
        severity: alert.impact.severity,
        message: alert.changes.summary || alert.action,
        timestamp: alert.timestamp,
        entityType: alert.entityType,
        entityId: alert.entityId,
        tenantId: alert.tenantId
      }));
    } catch (error) {
      logger.error('Error getting system alerts:', error);
      return [];
    }
  }

  async getUsageAnalytics(period = '30d') {
    try {
      const days = parseInt(period.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const usageStats = await License.aggregate([
        { $match: { status: { $in: ['TRIAL', 'ACTIVE'] } } },
        {
          $group: {
            _id: null,
            totalBranches: { $sum: '$usage.currentBranches' },
            totalUsers: { $sum: '$usage.currentUsers' },
            totalAppointments: { $sum: '$usage.currentAppointmentsThisMonth' },
            totalStorageGB: { $sum: '$usage.storageUsedGB' },
            totalAiRequests: { $sum: '$usage.aiRequestsThisMonth' },
            maxBranches: { $sum: '$limits.maxBranches' },
            maxUsers: { $sum: '$limits.maxUsers' },
            maxAppointments: { $sum: '$limits.maxAppointmentsPerMonth' },
            maxStorageGB: { $sum: '$limits.storageQuotaGB' },
            maxAiRequests: { $sum: '$limits.maxAiRequestsPerMonth' }
          }
        }
      ]);

      const stats = usageStats[0] || {};

      return {
        branches: {
          used: stats.totalBranches || 0,
          limit: stats.maxBranches || 0,
          percentage: stats.maxBranches ? Math.round((stats.totalBranches / stats.maxBranches) * 100) : 0
        },
        users: {
          used: stats.totalUsers || 0,
          limit: stats.maxUsers || 0,
          percentage: stats.maxUsers ? Math.round((stats.totalUsers / stats.maxUsers) * 100) : 0
        },
        appointments: {
          used: stats.totalAppointments || 0,
          limit: stats.maxAppointments || 0,
          percentage: stats.maxAppointments ? Math.round((stats.totalAppointments / stats.maxAppointments) * 100) : 0
        },
        storage: {
          used: stats.totalStorageGB || 0,
          limit: stats.maxStorageGB || 0,
          percentage: stats.maxStorageGB ? Math.round((stats.totalStorageGB / stats.maxStorageGB) * 100) : 0
        },
        aiRequests: {
          used: stats.totalAiRequests || 0,
          limit: stats.maxAiRequests || 0,
          percentage: stats.maxAiRequests ? Math.round((stats.totalAiRequests / stats.maxAiRequests) * 100) : 0
        }
      };
    } catch (error) {
      logger.error('Error getting usage analytics:', error);
      throw error;
    }
  }

  async getRevenueAnalytics(period = '12m') {
    try {
      const months = parseInt(period.replace('m', ''));
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Generate monthly revenue data
      const monthlyRevenue = [];
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);

        const revenue = await this.getTotalRevenue(monthStart, monthEnd);
        
        monthlyRevenue.push({
          month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
          revenue: revenue,
          monthName: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        });
      }

      // Calculate MRR (Monthly Recurring Revenue)
      const activeLicenses = await License.find({ status: 'ACTIVE' }).populate('planId');
      let mrr = 0;
      
      for (const license of activeLicenses) {
        if (license.planId) {
          const monthlyPrice = license.subscription.billingCycle === 'yearly'
            ? license.planId.pricing.yearly.price / 12
            : license.planId.pricing.monthly.price;
          mrr += monthlyPrice;
        }
      }

      return {
        monthlyRevenue,
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12), // Annual Recurring Revenue
        totalRevenue: monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0)
      };
    } catch (error) {
      logger.error('Error getting revenue analytics:', error);
      throw error;
    }
  }

  async getCustomerAnalytics() {
    try {
      const [
        customerLifetimeValue,
        churnRate,
        customerAcquisitionCost,
        customerSatisfaction
      ] = await Promise.all([
        this.calculateCustomerLifetimeValue(),
        this.calculateChurnRate(),
        this.calculateCustomerAcquisitionCost(),
        this.getCustomerSatisfactionScore()
      ]);

      return {
        lifetimeValue: customerLifetimeValue,
        churnRate: churnRate,
        acquisitionCost: customerAcquisitionCost,
        satisfactionScore: customerSatisfaction,
        retentionRate: 100 - churnRate
      };
    } catch (error) {
      logger.error('Error getting customer analytics:', error);
      throw error;
    }
  }

  async calculateCustomerLifetimeValue() {
    try {
      // Simplified CLV calculation
      const avgMonthlyRevenue = await this.getAverageMonthlyRevenue();
      const avgCustomerLifespan = 24; // months (would be calculated from actual data)
      return Math.round(avgMonthlyRevenue * avgCustomerLifespan);
    } catch (error) {
      logger.error('Error calculating CLV:', error);
      return 0;
    }
  }

  async calculateChurnRate() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalCustomersStart, churnedCustomers] = await Promise.all([
        License.countDocuments({
          'auditInfo.issuedAt': { $lte: thirtyDaysAgo }
        }),
        License.countDocuments({
          status: { $in: ['EXPIRED', 'REVOKED'] },
          'auditInfo.lastModifiedAt': { $gte: thirtyDaysAgo }
        })
      ]);

      return totalCustomersStart > 0 ? Math.round((churnedCustomers / totalCustomersStart) * 100 * 100) / 100 : 0;
    } catch (error) {
      logger.error('Error calculating churn rate:', error);
      return 0;
    }
  }

  async calculateCustomerAcquisitionCost() {
    try {
      // This would integrate with marketing/sales data
      // For now, return estimated value
      return 150; // USD
    } catch (error) {
      logger.error('Error calculating CAC:', error);
      return 0;
    }
  }

  async getCustomerSatisfactionScore() {
    try {
      // This would integrate with support/feedback systems
      // For now, return estimated score
      return 4.2; // out of 5
    } catch (error) {
      logger.error('Error getting satisfaction score:', error);
      return 0;
    }
  }

  async getAverageMonthlyRevenue() {
    try {
      const activeLicenses = await License.find({ status: 'ACTIVE' }).populate('planId');
      
      if (activeLicenses.length === 0) return 0;

      let totalMonthlyRevenue = 0;
      for (const license of activeLicenses) {
        if (license.planId) {
          const monthlyPrice = license.subscription.billingCycle === 'yearly'
            ? license.planId.pricing.yearly.price / 12
            : license.planId.pricing.monthly.price;
          totalMonthlyRevenue += monthlyPrice;
        }
      }

      return Math.round(totalMonthlyRevenue / activeLicenses.length);
    } catch (error) {
      logger.error('Error calculating average monthly revenue:', error);
      return 0;
    }
  }
}

module.exports = SaasAnalyticsService;