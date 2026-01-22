import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Branch {
  id: string;
  name: string;
  clinicId: string;
  clinicName: string;
  code: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  branchAdminId?: string;
  branchAdminName?: string;
  operationalStatus: 'active' | 'inactive' | 'maintenance' | 'suspended';
  workingHours: {
    monday: { open: string; close: string; isOpen: boolean };
    tuesday: { open: string; close: string; isOpen: boolean };
    wednesday: { open: string; close: string; isOpen: boolean };
    thursday: { open: string; close: string; isOpen: boolean };
    friday: { open: string; close: string; isOpen: boolean };
    saturday: { open: string; close: string; isOpen: boolean };
    sunday: { open: string; close: string; isOpen: boolean };
  };
  departments: string[];
  totalRooms: number;
  activeRooms: number;
  totalStaff: number;
  activeStaff: number;
  monthlyPatients: number;
  monthlyRevenue: number;
  createdAt: Date;
  lastActivity: Date;
  timezone: string;
  settings: {
    appointmentBooking: boolean;
    walkInAllowed: boolean;
    onlinePayments: boolean;
    aiDiagnosisEnabled: boolean;
    queueManagement: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private readonly apiUrl = `${environment.apiUrl}/central-admin/branches`;
  private readonly tenantServiceUrl = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) {}

  // Enhanced integration with tenant-organization-service
  getAllBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.tenantServiceUrl}/branches`);
  }

  getBranchesByClinic(clinicId: string): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.tenantServiceUrl}/branches/clinic/${clinicId}`);
  }

  getBranchById(branchId: string): Observable<Branch> {
    return this.http.get<Branch>(`${this.tenantServiceUrl}/branches/${branchId}`);
  }

  createBranch(branchData: Partial<Branch>): Observable<Branch> {
    return this.http.post<Branch>(`${this.tenantServiceUrl}/branches`, branchData);
  }

  updateBranch(branchId: string, branchData: Partial<Branch>): Observable<Branch> {
    return this.http.put<Branch>(`${this.tenantServiceUrl}/branches/${branchId}`, branchData);
  }

  updateBranchStatus(branchId: string, status: string): Observable<Branch> {
    return this.http.patch<Branch>(`${this.tenantServiceUrl}/branches/${branchId}/status`, { status });
  }

  deleteBranch(branchId: string): Observable<void> {
    return this.http.delete<void>(`${this.tenantServiceUrl}/branches/${branchId}`);
  }

  getBranchAnalytics(branchId: string, dateRange?: { start: string; end: string }): Observable<any> {
    const params = dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : {};
    return this.http.get(`${this.tenantServiceUrl}/branches/${branchId}/analytics`, { params });
  }

  getBranchStaff(branchId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.tenantServiceUrl}/branches/${branchId}/staff`);
  }

  assignBranchAdmin(branchId: string, adminId: string): Observable<Branch> {
    return this.http.patch<Branch>(`${this.tenantServiceUrl}/branches/${branchId}/admin`, { adminId });
  }

  updateBranchSettings(branchId: string, settings: any): Observable<Branch> {
    return this.http.patch<Branch>(`${this.tenantServiceUrl}/branches/${branchId}/settings`, settings);
  }
    return this.http.get<Branch[]>(this.apiUrl);
  }

  getBranchesByClinic(clinicId: string): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.apiUrl}/clinic/${clinicId}`);
  }

  getBranchById(id: string): Observable<Branch> {
    return this.http.get<Branch>(`${this.apiUrl}/${id}`);
  }

  createBranch(branch: Partial<Branch>): Observable<Branch> {
    return this.http.post<Branch>(this.apiUrl, branch);
  }

  updateBranch(id: string, branch: Partial<Branch>): Observable<Branch> {
    return this.http.put<Branch>(`${this.apiUrl}/${id}`, branch);
  }

  deleteBranch(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateBranchStatus(id: string, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, { status });
  }

  getBranchAnalytics(id: string, period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/analytics?period=${period}`);
  }

  getBranchPerformance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/performance`);
  }
}