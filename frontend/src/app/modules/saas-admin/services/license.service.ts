import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface License {
  licenseId: string;
  licenseKey: string;
  tenantId: string;
  planId: string;
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';
  validity: {
    startDate: Date;
    endDate: Date;
    trialEndDate?: Date;
    gracePeriodDays: number;
  };
  subscription: {
    subscriptionId?: string;
    billingCycle: 'monthly' | 'yearly';
    autoRenewal: boolean;
    nextBillingDate?: Date;
    lastPaymentDate?: Date;
    paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'OVERDUE';
  };
  usage: {
    currentBranches: number;
    currentUsers: number;
    currentAppointmentsThisMonth: number;
    storageUsedGB: number;
    aiRequestsThisMonth: number;
    lastUsageUpdate: Date;
  };
  limits: {
    maxBranches: number;
    maxUsers: number;
    maxAppointmentsPerMonth: number;
    storageQuotaGB: number;
    maxAiRequestsPerMonth: number;
  };
  features: {
    enabledModules: string[];
    aiFeatures: {
      xrayAnalysis: boolean;
      cavityDetection: boolean;
      boneLossDetection: boolean;
      prescriptionOCR: boolean;
    };
    customizations: {
      customBranding: boolean;
      apiAccess: boolean;
      prioritySupport: boolean;
    };
  };
  restrictions: {
    ipWhitelist: string[];
    domainRestrictions: string[];
    maintenanceMode: boolean;
    suspensionReason?: string;
  };
  auditInfo: {
    issuedBy: string;
    issuedAt: Date;
    lastModifiedBy?: string;
    lastModifiedAt?: Date;
    revocationReason?: string;
    revokedBy?: string;
    revokedAt?: Date;
  };
  // Virtual fields
  isExpired?: boolean;
  isInGracePeriod?: boolean;
  daysUntilExpiry?: number;
}

export interface LicenseFilters {
  status?: string;
  tenantId?: string;
  planId?: string;
  expiringInDays?: number;
}

export interface LicensePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface LicenseListResponse {
  licenses: License[];
  pagination: LicensePagination;
}

export interface CreateLicenseRequest {
  tenantId: string;
  planId: string;
  billingCycle?: 'monthly' | 'yearly';
  autoRenewal?: boolean;
  skipTrial?: boolean;
  gracePeriodDays?: number;
  startDate?: Date;
  endDate?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  private readonly apiUrl = `${environment.apiUrl}/saas-admin/licenses`;

  constructor(private http: HttpClient) {}

  // License CRUD Operations
  issueLicense(request: CreateLicenseRequest): Observable<{ success: boolean; message: string; data: License }> {
    return this.http.post<{ success: boolean; message: string; data: License }>(this.apiUrl, request);
  }

  getAllLicenses(filters: LicenseFilters = {}, page: number = 1, limit: number = 50): Observable<{ success: boolean; data: LicenseListResponse }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.tenantId) {
      params = params.set('tenantId', filters.tenantId);
    }
    if (filters.planId) {
      params = params.set('planId', filters.planId);
    }
    if (filters.expiringInDays) {
      params = params.set('expiringInDays', filters.expiringInDays.toString());
    }

    return this.http.get<{ success: boolean; data: LicenseListResponse }>(this.apiUrl, { params });
  }

  getLicenseById(licenseId: string): Observable<{ success: boolean; data: License }> {
    return this.http.get<{ success: boolean; data: License }>(`${this.apiUrl}/${licenseId}`);
  }

  getLicenseByTenant(tenantId: string): Observable<{ success: boolean; data: License }> {
    const params = new HttpParams().set('tenantId', tenantId);
    return this.http.get<{ success: boolean; data: License }>(`${this.apiUrl}/tenant`, { params });
  }

  // License Actions
  renewLicense(licenseId: string, options: any = {}): Observable<{ success: boolean; message: string; data: License }> {
    return this.http.put<{ success: boolean; message: string; data: License }>(`${this.apiUrl}/${licenseId}/renew`, options);
  }

  suspendLicense(licenseId: string, reason: string): Observable<{ success: boolean; message: string; data: License }> {
    return this.http.put<{ success: boolean; message: string; data: License }>(`${this.apiUrl}/${licenseId}/suspend`, { reason });
  }

  reactivateLicense(licenseId: string): Observable<{ success: boolean; message: string; data: License }> {
    return this.http.put<{ success: boolean; message: string; data: License }>(`${this.apiUrl}/${licenseId}/reactivate`, {});
  }

  revokeLicense(licenseId: string, reason: string): Observable<{ success: boolean; message: string; data: License }> {
    return this.http.put<{ success: boolean; message: string; data: License }>(`${this.apiUrl}/${licenseId}/revoke`, { reason });
  }

  // License Analytics
  getExpiringLicenses(days: number = 30): Observable<{ success: boolean; data: License[] }> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<{ success: boolean; data: License[] }>(`${this.apiUrl}/expiring`, { params });
  }

  getLicenseUsageStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/usage`);
  }

  getLicenseStatusDistribution(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/status-distribution`);
  }

  // License Validation
  validateLicenseKey(licenseKey: string): Observable<{ success: boolean; data: { valid: boolean; license?: License } }> {
    return this.http.post<{ success: boolean; data: { valid: boolean; license?: License } }>(`${this.apiUrl}/validate`, { licenseKey });
  }

  // Usage Tracking
  updateLicenseUsage(licenseId: string, usageData: Partial<License['usage']>): Observable<{ success: boolean; data: License }> {
    return this.http.put<{ success: boolean; data: License }>(`${this.apiUrl}/${licenseId}/usage`, usageData);
  }

  // Bulk Operations
  bulkSuspendLicenses(licenseIds: string[], reason: string): Observable<{ success: boolean; message: string; results: any[] }> {
    return this.http.post<{ success: boolean; message: string; results: any[] }>(`${this.apiUrl}/bulk/suspend`, { licenseIds, reason });
  }

  bulkReactivateLicenses(licenseIds: string[]): Observable<{ success: boolean; message: string; results: any[] }> {
    return this.http.post<{ success: boolean; message: string; results: any[] }>(`${this.apiUrl}/bulk/reactivate`, { licenseIds });
  }

  bulkRenewLicenses(licenseIds: string[], options: any = {}): Observable<{ success: boolean; message: string; results: any[] }> {
    return this.http.post<{ success: boolean; message: string; results: any[] }>(`${this.apiUrl}/bulk/renew`, { licenseIds, ...options });
  }

  // License History
  getLicenseHistory(licenseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${licenseId}/history`);
  }

  // License Notifications
  sendExpiryNotifications(licenseIds: string[]): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/notifications/expiry`, { licenseIds });
  }

  sendUsageWarnings(licenseIds: string[]): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/notifications/usage-warning`, { licenseIds });
  }

  // License Export
  exportLicenses(filters: LicenseFilters = {}, format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    let params = new HttpParams().set('format', format);

    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.tenantId) {
      params = params.set('tenantId', filters.tenantId);
    }
    if (filters.planId) {
      params = params.set('planId', filters.planId);
    }

    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  // Helper Methods
  getUsagePercentage(license: License, type: 'branches' | 'users' | 'appointments' | 'storage' | 'ai'): number {
    switch (type) {
      case 'branches':
        return Math.round((license.usage.currentBranches / license.limits.maxBranches) * 100);
      case 'users':
        return Math.round((license.usage.currentUsers / license.limits.maxUsers) * 100);
      case 'appointments':
        return Math.round((license.usage.currentAppointmentsThisMonth / license.limits.maxAppointmentsPerMonth) * 100);
      case 'storage':
        return Math.round((license.usage.storageUsedGB / license.limits.storageQuotaGB) * 100);
      case 'ai':
        return Math.round((license.usage.aiRequestsThisMonth / license.limits.maxAiRequestsPerMonth) * 100);
      default:
        return 0;
    }
  }

  isUsageLimitExceeded(license: License, type: 'branches' | 'users' | 'appointments' | 'storage' | 'ai'): boolean {
    return this.getUsagePercentage(license, type) >= 100;
  }

  getDaysUntilExpiry(license: License): number {
    const now = new Date();
    const expiryDate = new Date(license.validity.endDate);
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isLicenseExpiringSoon(license: License, warningDays: number = 30): boolean {
    return this.getDaysUntilExpiry(license) <= warningDays && this.getDaysUntilExpiry(license) > 0;
  }

  getStatusColor(status: License['status']): string {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'TRIAL':
        return 'primary';
      case 'SUSPENDED':
        return 'warn';
      case 'EXPIRED':
      case 'REVOKED':
        return 'accent';
      default:
        return 'basic';
    }
  }

  getStatusIcon(status: License['status']): string {
    switch (status) {
      case 'ACTIVE':
        return 'check_circle';
      case 'TRIAL':
        return 'schedule';
      case 'SUSPENDED':
        return 'pause_circle';
      case 'EXPIRED':
        return 'expired';
      case 'REVOKED':
        return 'cancel';
      default:
        return 'help';
    }
  }
}