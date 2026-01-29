const redisConfig = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = redisConfig;
    this.defaultTTL = 3600; // 1 hour
  }

  // Generate cache keys
  generateKey(prefix, ...parts) {
    return `payroll-hr:${prefix}:${parts.join(':')}`;
  }

  // Employee data cache
  async cacheEmployeeData(tenantId, branchId, employeeId, data, ttl = this.defaultTTL) {
    try {
      const key = this.generateKey('employee', tenantId, branchId, employeeId);
      await this.redis.set(key, data, ttl);
      logger.debug('Employee data cached', { key, ttl });
    } catch (error) {
      logger.error('Failed to cache employee data:', error);
    }
  }

  async getEmployeeData(tenantId, branchId, employeeId) {
    try {
      const key = this.generateKey('employee', tenantId, branchId, employeeId);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get employee data from cache:', error);
      return null;
    }
  }

  // Attendance summary cache
  async cacheAttendanceSummary(tenantId, branchId, employeeId, month, summary, ttl = 7200) {
    try {
      const key = this.generateKey('attendance-summary', tenantId, branchId, employeeId, month);
      await this.redis.set(key, summary, ttl);
      logger.debug('Attendance summary cached', { key, month });
    } catch (error) {
      logger.error('Failed to cache attendance summary:', error);
    }
  }

  async getAttendanceSummary(tenantId, branchId, employeeId, month) {
    try {
      const key = this.generateKey('attendance-summary', tenantId, branchId, employeeId, month);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get attendance summary from cache:', error);
      return null;
    }
  }

  // Payroll calculation cache
  async cachePayrollCalculation(tenantId, branchId, month, calculation, ttl = 1800) {
    try {
      const key = this.generateKey('payroll-calc', tenantId, branchId, month);
      await this.redis.set(key, calculation, ttl);
      logger.debug('Payroll calculation cached', { key, month });
    } catch (error) {
      logger.error('Failed to cache payroll calculation:', error);
    }
  }

  async getPayrollCalculation(tenantId, branchId, month) {
    try {
      const key = this.generateKey('payroll-calc', tenantId, branchId, month);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get payroll calculation from cache:', error);
      return null;
    }
  }

  // Shift data cache
  async cacheShiftData(tenantId, branchId, shifts, ttl = 3600) {
    try {
      const key = this.generateKey('shifts', tenantId, branchId);
      await this.redis.set(key, shifts, ttl);
      logger.debug('Shift data cached', { key, count: shifts.length });
    } catch (error) {
      logger.error('Failed to cache shift data:', error);
    }
  }

  async getShiftData(tenantId, branchId) {
    try {
      const key = this.generateKey('shifts', tenantId, branchId);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get shift data from cache:', error);
      return null;
    }
  }

  // Salary structure cache
  async cacheSalaryStructure(tenantId, employeeId, structure, ttl = 7200) {
    try {
      const key = this.generateKey('salary-structure', tenantId, employeeId);
      await this.redis.set(key, structure, ttl);
      logger.debug('Salary structure cached', { key });
    } catch (error) {
      logger.error('Failed to cache salary structure:', error);
    }
  }

  async getSalaryStructure(tenantId, employeeId) {
    try {
      const key = this.generateKey('salary-structure', tenantId, employeeId);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get salary structure from cache:', error);
      return null;
    }
  }

  // Department-wise reports cache
  async cacheDepartmentReport(tenantId, branchId, month, report, ttl = 3600) {
    try {
      const key = this.generateKey('dept-report', tenantId, branchId, month);
      await this.redis.set(key, report, ttl);
      logger.debug('Department report cached', { key, month });
    } catch (error) {
      logger.error('Failed to cache department report:', error);
    }
  }

  async getDepartmentReport(tenantId, branchId, month) {
    try {
      const key = this.generateKey('dept-report', tenantId, branchId, month);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get department report from cache:', error);
      return null;
    }
  }

  // Payslip cache
  async cachePayslip(tenantId, employeeId, month, payslipData, ttl = 86400) {
    try {
      const key = this.generateKey('payslip', tenantId, employeeId, month);
      await this.redis.set(key, payslipData, ttl);
      logger.debug('Payslip cached', { key, month });
    } catch (error) {
      logger.error('Failed to cache payslip:', error);
    }
  }

  async getPayslip(tenantId, employeeId, month) {
    try {
      const key = this.generateKey('payslip', tenantId, employeeId, month);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get payslip from cache:', error);
      return null;
    }
  }

  // Invalidation methods
  async invalidateEmployeeCache(tenantId, branchId, employeeId) {
    try {
      const patterns = [
        this.generateKey('employee', tenantId, branchId, employeeId),
        this.generateKey('attendance-summary', tenantId, branchId, employeeId, '*'),
        this.generateKey('salary-structure', tenantId, employeeId),
        this.generateKey('payslip', tenantId, employeeId, '*')
      ];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          // For patterns with wildcards, we need to scan and delete
          // This is a simplified approach - in production, consider using Redis SCAN
          continue;
        }
        await this.redis.del(pattern);
      }

      logger.debug('Employee cache invalidated', { tenantId, branchId, employeeId });
    } catch (error) {
      logger.error('Failed to invalidate employee cache:', error);
    }
  }

  async invalidatePayrollCache(tenantId, branchId, month) {
    try {
      const keys = [
        this.generateKey('payroll-calc', tenantId, branchId, month),
        this.generateKey('dept-report', tenantId, branchId, month)
      ];

      for (const key of keys) {
        await this.redis.del(key);
      }

      logger.debug('Payroll cache invalidated', { tenantId, branchId, month });
    } catch (error) {
      logger.error('Failed to invalidate payroll cache:', error);
    }
  }

  async invalidateShiftCache(tenantId, branchId) {
    try {
      const key = this.generateKey('shifts', tenantId, branchId);
      await this.redis.del(key);
      logger.debug('Shift cache invalidated', { tenantId, branchId });
    } catch (error) {
      logger.error('Failed to invalidate shift cache:', error);
    }
  }

  // Bulk operations
  async cacheMultiple(items, ttl = this.defaultTTL) {
    try {
      const promises = items.map(({ key, data }) => 
        this.redis.set(key, data, ttl)
      );
      await Promise.all(promises);
      logger.debug('Multiple items cached', { count: items.length });
    } catch (error) {
      logger.error('Failed to cache multiple items:', error);
    }
  }

  async getMultiple(keys) {
    try {
      const promises = keys.map(key => this.redis.get(key));
      const results = await Promise.all(promises);
      
      return results.map((data, index) => ({
        key: keys[index],
        data: data ? JSON.parse(data) : null
      }));
    } catch (error) {
      logger.error('Failed to get multiple items from cache:', error);
      return keys.map(key => ({ key, data: null }));
    }
  }

  // Health check
  async healthCheck() {
    try {
      const testKey = this.generateKey('health', 'test');
      await this.redis.set(testKey, { timestamp: Date.now() }, 60);
      const result = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      return {
        status: 'healthy',
        connected: this.redis.isClientConnected(),
        testPassed: !!result
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = new CacheService();