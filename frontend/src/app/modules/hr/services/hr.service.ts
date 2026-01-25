import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface HrDashboardStats {
  totalStaff: number;
  activeEmployees: number;
  onDutyStaff: number;
  absentStaff: number;
  pendingLeaveRequests: number;
  staffShortages: number;
  missingDocuments: number;
  roleDistribution: { [key: string]: number };
  departmentDistribution: { [key: string]: number };
  attendanceRate: number;
  leaveUtilization: number;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  branch: string;
  joiningDate: Date;
  status: 'active' | 'inactive' | 'suspended';
  profilePicture?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  type: string;
  name: string;
  url: string;
  expiryDate?: Date;
  status: 'valid' | 'expired' | 'expiring_soon';
  uploadedAt: Date;
}

export interface Alert {
  id: string;
  type: 'staff_shortage' | 'leave_approval' | 'document_expiry' | 'attendance_issue';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  acknowledged: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HrService {
  private apiUrl = `${environment.apiUrl}/hr`;
  private dashboardStatsSubject = new BehaviorSubject<HrDashboardStats | null>(null);
  private alertsSubject = new BehaviorSubject<Alert[]>([]);

  public dashboardStats$ = this.dashboardStatsSubject.asObservable();
  public alerts$ = this.alertsSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'Content-Type': 'application/json'
    });
  }

  // Dashboard Stats
  getDashboardStats(): Observable<HrDashboardStats> {
    return this.http.get<HrDashboardStats>(`${this.apiUrl}/dashboard/stats`, {
      headers: this.getHeaders()
    });
  }

  refreshDashboardStats(): void {
    this.getDashboardStats().subscribe(stats => {
      this.dashboardStatsSubject.next(stats);
    });
  }

  // Alerts Management
  getAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiUrl}/alerts`, {
      headers: this.getHeaders()
    });
  }

  acknowledgeAlert(alertId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/alerts/${alertId}/acknowledge`, {}, {
      headers: this.getHeaders()
    });
  }

  refreshAlerts(): void {
    this.getAlerts().subscribe(alerts => {
      this.alertsSubject.next(alerts);
    });
  }

  // Employee Management
  getEmployees(params?: any): Observable<{ employees: Employee[], total: number }> {
    return this.http.get<{ employees: Employee[], total: number }>(`${this.apiUrl}/employees`, {
      headers: this.getHeaders(),
      params
    });
  }

  getEmployee(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/employees/${id}`, {
      headers: this.getHeaders()
    });
  }

  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(`${this.apiUrl}/employees`, employee, {
      headers: this.getHeaders()
    });
  }

  updateEmployee(id: string, employee: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/employees/${id}`, employee, {
      headers: this.getHeaders()
    });
  }

  deactivateEmployee(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/employees/${id}/deactivate`, {}, {
      headers: this.getHeaders()
    });
  }

  activateEmployee(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/employees/${id}/activate`, {}, {
      headers: this.getHeaders()
    });
  }

  // Role and Department Management
  getAvailableRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/roles`, {
      headers: this.getHeaders()
    });
  }

  getDepartments(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/departments`, {
      headers: this.getHeaders()
    });
  }

  getBranches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/branches`, {
      headers: this.getHeaders()
    });
  }

  // Reports
  generateStaffReport(params: any): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/staff`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    });
  }

  generateAttendanceReport(params: any): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/attendance`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    });
  }

  generateLeaveReport(params: any): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/leave`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    });
  }

  generateDepartmentReport(params: any): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/department`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    });
  }

  // Audit Logs
  getAuditLogs(params?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/audit-logs`, {
      headers: this.getHeaders(),
      params
    });
  }
}