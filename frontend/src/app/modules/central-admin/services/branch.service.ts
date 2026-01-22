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

  constructor(private http: HttpClient) {}

  getAllBranches(): Observable<Branch[]> {
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