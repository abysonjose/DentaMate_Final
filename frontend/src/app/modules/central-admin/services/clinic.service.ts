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

  constructor(private http: HttpClient) {}

  // CRUD Operations
  getAllClinics(): Observable<Clinic[]> {
    return this.http.get<Clinic[]>(this.apiUrl);
  }

  getClinicById(id: string): Observable<Clinic> {
    return this.http.get<Clinic>(`${this.apiUrl}/${id}`);
  }

  createClinic(clinic: CreateClinicRequest): Observable<Clinic> {
    return this.http.post<Clinic>(this.apiUrl, clinic);
  }

  updateClinic(id: string, clinic: Partial<Clinic>): Observable<Clinic> {
    return this.http.put<Clinic>(`${this.apiUrl}/${id}`, clinic);
  }

  deleteClinic(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Status Management
  activateClinic(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivateClinic(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  suspendClinic(id: string, reason: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/suspend`, { reason });
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