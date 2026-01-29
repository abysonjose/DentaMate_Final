const LedgerEntry = require('../models/LedgerEntry');
const FinancialPeriod = require('../models/FinancialPeriod');
const CacheService = require('./CacheService');
const logger = require('../utils/logger');

class LedgerService {
  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Create a new ledger entry
   */
  async createLedgerEntry(entryData, userId) {
    try {
      // Validate that the period is open for posting
      const canPost = await FinancialPeriod.canPostToLedger(
        entryData.tenantId,
        entryData.branchId,
        entryData.period
      );

      if (!canPost) {
        throw new Error('Cannot post to closed or locked financial period');
      }

      // Create the ledger entry
      const ledgerEntry = new LedgerEntry({
        ...entryData,
        createdBy: userId
      });

      await ledgerEntry.save();

      // Clear related caches
      await this.clearLedgerCaches(entryData.tenantId, entryData.branchId, entryData.period);

      logger.logFinancialOperation('LEDGER_ENTRY_CREATED', {
        tenantId: entryData.tenantId,
        branchId: entryData.branchId,
        amount: entryData.amount,
        reference: entryData.reference,
        userId
      });

      return ledgerEntry;
    } catch (error) {
      logger.error('Failed to create ledger entry:', error);
      throw error;
    }
  }

  /**
   * Get ledger entries with filtering and pagination
   */
  async getLedgerEntries(filters, pagination, tenantId, branchId) {
    try {
      const cacheKey = this.cacheService.generateKey(
        'ledger_entries',
        tenantId,
        branchId,
        JSON.stringify(filters),
        JSON.stringify(pagination)
      );

      // Try to get from cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query
      const query = { tenantId, branchId, ...filters };
      
      // Handle date range filtering
      if (filters.startDate || filters.endDate) {
        query.date = {};
        if (filters.startDate) query.date.$gte = new Date(filters.startDate);
        if (filters.endDate) query.date.$lte = new Date(filters.endDate);
      }

      // Execute query with pagination
      const skip = (pagination.page - 1) * pagination.limit;
      const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

      const [entries, total] = await Promise.all([
        LedgerEntry.find(query)
          .sort({ [pagination.sortBy]: sortOrder })
          .skip(skip)
          .limit(pagination.limit)
          .lean(),
        LedgerEntry.countDocuments(query)
      ]);

      const result = {
        entries,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit)
        }
      };

      // Cache the result for 5 minutes
      await this.cacheService.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      logger.error('Failed to get ledger entries:', error);
      throw error;
    }
  }

  /**
   * Get a single ledger entry by ID
   */
  async getLedgerEntryById(entryId, tenantId, branchId) {
    try {
      const cacheKey = this.cacheService.generateKey('ledger_entry', entryId);
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const entry = await LedgerEntry.findOne({
        entryId,
        tenantId,
        branchId
      }).lean();

      if (!entry) {
        throw new Error('Ledger entry not found');
      }

      // Cache for 10 minutes
      await this.cacheService.set(cacheKey, entry, 600);

      return entry;
    } catch (error) {
      logger.error('Failed to get ledger entry:', error);
      throw error;
    }
  }

  /**
   * Post a ledger entry (make it immutable)
   */
  async postLedgerEntry(entryId, userId, tenantId, branchId) {
    try {
      const entry = await LedgerEntry.findOne({
        entryId,
        tenantId,
        branchId
      });

      if (!entry) {
        throw new Error('Ledger entry not found');
      }

      await entry.post(userId);

      // Clear caches
      await this.clearLedgerCaches(tenantId, branchId, entry.period);
      await this.cacheService.del(this.cacheService.generateKey('ledger_entry', entryId));

      logger.logFinancialOperation('LEDGER_ENTRY_POSTED', {
        tenantId,
        branchId,
        entryId,
        amount: entry.amount,
        userId
      });

      return entry;
    } catch (error) {
      logger.error('Failed to post ledger entry:', error);
      throw error;
    }
  }

  /**
   * Reverse a ledger entry
   */
  async reverseLedgerEntry(entryId, reason, userId, tenantId, branchId) {
    try {
      const entry = await LedgerEntry.findOne({
        entryId,
        tenantId,
        branchId
      });

      if (!entry) {
        throw new Error('Ledger entry not found');
      }

      await entry.reverse(userId, reason);

      // Create reversal entry
      const reversalEntry = new LedgerEntry({
        tenantId,
        branchId,
        debitAccount: entry.creditAccount, // Swap accounts
        creditAccount: entry.debitAccount,
        amount: entry.amount,
        currency: entry.currency,
        reference: `REVERSAL_${entry.reference}`,
        referenceService: 'manual-entry',
        date: new Date(),
        description: `Reversal of ${entry.description} - Reason: ${reason}`,
        department: entry.department,
        doctorId: entry.doctorId,
        patientId: entry.patientId,
        treatmentType: entry.treatmentType,
        createdBy: userId,
        metadata: {
          originalEntryId: entryId,
          reversalReason: reason
        }
      });

      await reversalEntry.save();
      await reversalEntry.post(userId);

      // Update original entry with reversal reference
      entry.reversalEntryId = reversalEntry.entryId;
      await entry.save();

      // Clear caches
      await this.clearLedgerCaches(tenantId, branchId, entry.period);

      logger.logFinancialOperation('LEDGER_ENTRY_REVERSED', {
        tenantId,
        branchId,
        originalEntryId: entryId,
        reversalEntryId: reversalEntry.entryId,
        amount: entry.amount,
        reason,
        userId
      });

      return { originalEntry: entry, reversalEntry };
    } catch (error) {
      logger.error('Failed to reverse ledger entry:', error);
      throw error;
    }
  }

  /**
   * Generate trial balance for a period
   */
  async generateTrialBalance(tenantId, branchId, period) {
    try {
      const cacheKey = this.cacheService.generateKey('trial_balance', tenantId, branchId, period);
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const trialBalance = await LedgerEntry.getTrialBalance(tenantId, branchId, period);

      // Get detailed account balances
      const accounts = [
        'CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'EQUIPMENT',
        'PREPAID_EXPENSES', 'OTHER_ASSETS', 'GOODWILL', 'REVENUE',
        'ACCOUNTS_PAYABLE', 'ACCRUED_EXPENSES', 'UNEARNED_REVENUE',
        'LOANS_PAYABLE', 'EQUITY', 'RETAINED_EARNINGS', 'OTHER_LIABILITIES'
      ];

      const accountBalances = await Promise.all(
        accounts.map(async (account) => {
          const balance = await LedgerEntry.getAccountBalance(tenantId, branchId, account, period);
          return { account, balance };
        })
      );

      const result = {
        period,
        summary: trialBalance,
        accountBalances,
        isBalanced: Math.abs(trialBalance.totalDebits - trialBalance.totalCredits) < 0.01,
        generatedAt: new Date()
      };

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, result, 1800);

      return result;
    } catch (error) {
      logger.error('Failed to generate trial balance:', error);
      throw error;
    }
  }

  /**
   * Get account balance for a specific account
   */
  async getAccountBalance(tenantId, branchId, account, period) {
    try {
      const cacheKey = this.cacheService.generateKey('account_balance', tenantId, branchId, account, period);
      
      const cached = await this.cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const balance = await LedgerEntry.getAccountBalance(tenantId, branchId, account, period);

      // Cache for 15 minutes
      await this.cacheService.set(cacheKey, balance, 900);

      return balance;
    } catch (error) {
      logger.error('Failed to get account balance:', error);
      throw error;
    }
  }

  /**
   * Get ledger summary for a period
   */
  async getLedgerSummary(tenantId, branchId, period) {
    try {
      const cacheKey = this.cacheService.generateKey('ledger_summary', tenantId, branchId, period);
      
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const pipeline = [
        {
          $match: {
            tenantId,
            branchId,
            period,
            isPosted: true,
            isReversed: false
          }
        },
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            byService: {
              $push: {
                service: '$referenceService',
                amount: '$amount'
              }
            },
            byDepartment: {
              $push: {
                department: '$department',
                amount: '$amount'
              }
            }
          }
        },
        {
          $project: {
            totalEntries: 1,
            totalAmount: 1,
            serviceBreakdown: {
              $reduce: {
                input: '$byService',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[{
                        k: '$$this.service',
                        v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.service', input: '$$value' } }, 0] }, '$$this.amount'] }
                      }]]
                    }
                  ]
                }
              }
            },
            departmentBreakdown: {
              $reduce: {
                input: '$byDepartment',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[{
                        k: '$$this.department',
                        v: { $add: [{ $ifNull: [{ $getField: { field: '$$this.department', input: '$$value' } }, 0] }, '$$this.amount'] }
                      }]]
                    }
                  ]
                }
              }
            }
          }
        }
      ];

      const result = await LedgerEntry.aggregate(pipeline);
      const summary = result[0] || {
        totalEntries: 0,
        totalAmount: 0,
        serviceBreakdown: {},
        departmentBreakdown: {}
      };

      summary.period = period;
      summary.generatedAt = new Date();

      // Cache for 20 minutes
      await this.cacheService.set(cacheKey, summary, 1200);

      return summary;
    } catch (error) {
      logger.error('Failed to get ledger summary:', error);
      throw error;
    }
  }

  /**
   * Validate ledger entry data
   */
  validateLedgerEntry(entryData) {
    const errors = [];

    // Validate debit and credit accounts are different
    if (entryData.debitAccount === entryData.creditAccount) {
      errors.push('Debit and credit accounts must be different');
    }

    // Validate amount is positive
    if (entryData.amount <= 0) {
      errors.push('Amount must be positive');
    }

    // Validate date is not in the future
    if (new Date(entryData.date) > new Date()) {
      errors.push('Date cannot be in the future');
    }

    // Validate reference is provided
    if (!entryData.reference || entryData.reference.trim().length === 0) {
      errors.push('Reference is required');
    }

    return errors;
  }

  /**
   * Clear ledger-related caches
   */
  async clearLedgerCaches(tenantId, branchId, period) {
    try {
      const patterns = [
        `ledger_entries:${tenantId}:${branchId}:*`,
        `trial_balance:${tenantId}:${branchId}:${period}`,
        `ledger_summary:${tenantId}:${branchId}:${period}`,
        `account_balance:${tenantId}:${branchId}:*:${period}`
      ];

      await Promise.all(
        patterns.map(pattern => this.cacheService.deletePattern(pattern))
      );
    } catch (error) {
      logger.warn('Failed to clear ledger caches:', error);
    }
  }

  /**
   * Get unposted ledger entries
   */
  async getUnpostedEntries(tenantId, branchId, limit = 50) {
    try {
      return await LedgerEntry.find({
        tenantId,
        branchId,
        isPosted: false
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
    } catch (error) {
      logger.error('Failed to get unposted entries:', error);
      throw error;
    }
  }

  /**
   * Bulk post ledger entries
   */
  async bulkPostEntries(entryIds, userId, tenantId, branchId) {
    try {
      const entries = await LedgerEntry.find({
        entryId: { $in: entryIds },
        tenantId,
        branchId,
        isPosted: false
      });

      if (entries.length === 0) {
        throw new Error('No unposted entries found');
      }

      const results = [];
      for (const entry of entries) {
        try {
          await entry.post(userId);
          results.push({ entryId: entry.entryId, status: 'posted' });
        } catch (error) {
          results.push({ entryId: entry.entryId, status: 'failed', error: error.message });
        }
      }

      // Clear caches for all affected periods
      const periods = [...new Set(entries.map(entry => entry.period))];
      await Promise.all(
        periods.map(period => this.clearLedgerCaches(tenantId, branchId, period))
      );

      logger.logFinancialOperation('BULK_POST_ENTRIES', {
        tenantId,
        branchId,
        entriesCount: entries.length,
        successCount: results.filter(r => r.status === 'posted').length,
        userId
      });

      return results;
    } catch (error) {
      logger.error('Failed to bulk post entries:', error);
      throw error;
    }
  }
}

module.exports = LedgerService;