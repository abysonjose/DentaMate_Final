import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Clinic {
  id: string;
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'inactive' | 'suspended' | 'expired';
  licenseKey: string;
  maxUsers: number;
  currentUsers: number;
  maxBranches: number;
  currentBranches: number;
  features: string[];
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  timezone: string;
  currency: string;
  language: string;
  branchAdminId?: string;
  settings: {
    aiEnabled: boolean;
    ocrEnabled: boolean;
    realtimeQueueEnabled: boolean;
    multiTenantEnabled: boolean;
  };
}

export interface CreateClinicRequest {
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  subscriptionPlan: string;
  maxUsers: number;
  maxBranches: number;
  timezone: string;
  currency: string;
  language: string;
  features: string[];
  branchAdminEmail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private readonly apiUrl = `${environment.apiUrl}/central-admin/clinics`;
  private readonly tenantServiceUrl = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) {}

  // Enhanced integration with tenant-organization-service
  getAllClinics(): Observable<Clinic[]> {
    return this.http.get<Clinic[]>(`${this.tenantServiceUrl}/clinics`);
  }

  getClinicById(id: string): Observable<Clinic> {
    return this.http.get<Clinic>(`${this.tenantServiceUrl}/clinics/${id}`);
  }

  createClinic(clinic: CreateClinicRequest): Observable<Clinic> {
    return this.http.post<Clinic>(`${this.tenantServiceUrl}/create`, clinic);
  }

  updateClinic(id: string, clinic: Partial<Clinic>): Observable<Clinic> {
    return this.http.put<Clinic>(`${this.tenantServiceUrl}/clinics/${id}`, clinic);
  }

  deleteClinic(id: string): Observable<void> {
    return this.http.delete<void>(`${this.tenantServiceUrl}/clinics/${id}`);
  }

  // Status Management - Enhanced with tenant service integration
  activateClinic(id: string): Observable<void> {
    return this.http.patch<void>(`${this.tenantServiceUrl}/clinics/${id}/activate`, {});
  }

  deactivateClinic(id: string): Observable<void> {
    return this.http.patch<void>(`${this.tenantServiceUrl}/clinics/${id}/deactivate`, {});
  }

  suspendClinic(id: string, reason: string): Observable<void> {
    return this.http.patch<void>(`${this.tenantServiceUrl}/clinics/${id}/suspend`, { reason });
  }

  // Tenant-specific operations
  getTenantConfiguration(tenantId: string): Observable<any> {
    return this.http.get(`${this.tenantServiceUrl}/${tenantId}/configuration`);
  }

  updateTenantConfiguration(tenantId: string, config: any): Observable<any> {
    return this.http.put(`${this.tenantServiceUrl}/${tenantId}/configuration`, config);
  }

  getTenantLimits(tenantId: string): Observable<any> {
    return this.http.get(`${this.tenantServiceUrl}/${tenantId}/limits`);
  }

  updateTenantLimits(tenantId: string, limits: any): Observable<any> {
    return this.http.put(`${this.tenantServiceUrl}/${tenantId}/limits`, limits);
  }

  getTenantAuditLogs(tenantId: string, filters?: any): Observable<any[]> {
    const params = filters ? { ...filters } : {};
    return this.http.get<any[]>(`${this.tenantServiceUrl}/${tenantId}/audit-logs`, { params });
  }

  // License Management
  generateLicenseKey(id: string): Observable<{ licenseKey: string }> {
    return this.http.post<{ licenseKey: string }>(`${this.apiUrl}/${id}/license/generate`, {});
  }

  revokeLicenseKey(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/license`);
  }

  // Feature Management
  updateClinicFeatures(id: string, features: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/features`, { features });
  }

  toggleFeature(id: string, feature: string, enabled: boolean): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/features/${feature}`, { enabled });
  }

  // Analytics
  getClinicAnalytics(id: string, period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/analytics?period=${period}`);
  }

  getClinicUsageStats(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/usage`);
  }

  // Bulk Operations
  bulkUpdateStatus(clinicIds: string[], status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk/status`, { clinicIds, status });
  }

  bulkUpdateFeatures(clinicIds: string[], features: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk/features`, { clinicIds, features });
  }

  // Search and Filter
  searchClinics(query: string): Observable<Clinic[]> {
    return this.http.get<Clinic[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }

  filterClinics(filters: any): Observable<Clinic[]> {
    return this.http.post<Clinic[]>(`${this.apiUrl}/filter`, filters);
  }

  // Export
  exportClinicsData(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?format=${format}`, { 
      responseType: 'blob' 
    });
  }
}