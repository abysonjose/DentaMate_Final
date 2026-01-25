import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EmployeePayroll, PayrollComponent } from './payroll-officer.service';

export interface EmployeePayrollFilter {
  cycleId?: string;
  department?: string;
  status?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

export interface EmployeePayrollResponse {
  employees: EmployeePayroll[];
  total: number;
  page: number;
  limit: number;
}

export interface SalaryAdjustment {
  employeeId: string;
  adjustmentType: 'allowance' | 'deduction' | 'bonus' | 'penalty';
  amount: number;
  description: string;
  isRecurring: boolean;
}

export interface AttendanceData {
  employeeId: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;
  lateHours: number;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeePayrollService {
  private readonly apiUrl = `${environment.apiUrl}/payroll/employee-payroll`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenantId');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'Content-Type': 'application/json'
    });
  }

  // Employee Payroll Management
  getEmployeePayroll(filter: EmployeePayrollFilter): Observable<EmployeePayrollResponse> {
    return this.http.get<EmployeePayrollResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params: { ...filter } as any
    });
  }

  getEmployeePayrollById(id: string): Observable<EmployeePayroll> {
    return this.http.get<EmployeePayroll>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  updateEmployeePayroll(id: string, data: Partial<EmployeePayroll>): Observable<EmployeePayroll> {
    return this.http.put<EmployeePayroll>(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders()
    });
  }

  // Salary Calculations
  calculateSalary(employeeId: string, cycleId: string): Observable<EmployeePayroll> {
    return this.http.post<EmployeePayroll>(`${this.apiUrl}/calculate`, 
      { employeeId, cycleId }, 
      { headers: this.getHeaders() }
    );
  }

  recalculateAllSalaries(cycleId: string): Observable<EmployeePayroll[]> {
    return this.http.post<EmployeePayroll[]>(`${this.apiUrl}/recalculate-all`, 
      { cycleId }, 
      { headers: this.getHeaders() }
    );
  }

  // Salary Adjustments
  applySalaryAdjustment(adjustment: SalaryAdjustment): Observable<EmployeePayroll> {
    return this.http.post<EmployeePayroll>(`${this.apiUrl}/adjustment`, adjustment, {
      headers: this.getHeaders()
    });
  }

  removeSalaryAdjustment(employeeId: string, adjustmentId: string): Observable<EmployeePayroll> {
    return this.http.delete<EmployeePayroll>(`${this.apiUrl}/${employeeId}/adjustment/${adjustmentId}`, {
      headers: this.getHeaders()
    });
  }

  // Attendance Integration
  syncAttendanceData(cycleId: string): Observable<AttendanceData[]> {
    return this.http.post<AttendanceData[]>(`${this.apiUrl}/sync-attendance`, 
      { cycleId }, 
      { headers: this.getHeaders() }
    );
  }

  updateAttendanceData(employeeId: string, attendanceData: AttendanceData): Observable<EmployeePayroll> {
    return this.http.put<EmployeePayroll>(`${this.apiUrl}/${employeeId}/attendance`, attendanceData, {
      headers: this.getHeaders()
    });
  }

  // Payroll Components
  addPayrollComponent(employeeId: string, component: PayrollComponent): Observable<EmployeePayroll> {
    return this.http.post<EmployeePayroll>(`${this.apiUrl}/${employeeId}/component`, component, {
      headers: this.getHeaders()
    });
  }

  updatePayrollComponent(employeeId: string, componentId: string, component: PayrollComponent): Observable<EmployeePayroll> {
    return this.http.put<EmployeePayroll>(`${this.apiUrl}/${employeeId}/component/${componentId}`, component, {
      headers: this.getHeaders()
    });
  }

  removePayrollComponent(employeeId: string, componentId: string): Observable<EmployeePayroll> {
    return this.http.delete<EmployeePayroll>(`${this.apiUrl}/${employeeId}/component/${componentId}`, {
      headers: this.getHeaders()
    });
  }

  // Approval Workflow
  approveEmployeePayroll(employeeId: string): Observable<EmployeePayroll> {
    return this.http.post<EmployeePayroll>(`${this.apiUrl}/${employeeId}/approve`, {}, {
      headers: this.getHeaders()
    });
  }

  rejectEmployeePayroll(employeeId: string, reason: string): Observable<EmployeePayroll> {
    return this.http.post<EmployeePayroll>(`${this.apiUrl}/${employeeId}/reject`, 
      { reason }, 
      { headers: this.getHeaders() }
    );
  }

  bulkApprovePayroll(employeeIds: string[]): Observable<EmployeePayroll[]> {
    return this.http.post<EmployeePayroll[]>(`${this.apiUrl}/bulk-approve`, 
      { employeeIds }, 
      { headers: this.getHeaders() }
    );
  }

  // Reports and Export
  exportEmployeePayroll(cycleId: string, format: 'pdf' | 'excel' | 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export`, {
      headers: this.getHeaders(),
      params: { cycleId, format },
      responseType: 'blob'
    });
  }

  getPayrollSummary(cycleId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/summary`, {
      headers: this.getHeaders(),
      params: { cycleId }
    });
  }

  // Validation
  validatePayrollData(cycleId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate`, 
      { cycleId }, 
      { headers: this.getHeaders() }
    );
  }
}