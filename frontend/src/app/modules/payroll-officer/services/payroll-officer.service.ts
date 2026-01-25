import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface PayrollStats {
  totalEmployees: number;
  processedEmployees: number;
  pendingEmployees: number;
  payrollStatus: 'pending' | 'processing' | 'completed' | 'finalized';
  totalPayroll: number;
  averageSalary: number;
  deductionsTotal: number;
  allowancesTotal: number;
  currentCycleId?: string;
  currentMonth: number;
  currentYear: number;
}

export interface PayrollAlert {
  id: string;
  type: 'missing_data' | 'calculation_error' | 'approval_pending' | 'finalization_ready';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionRequired: boolean;
  cycleId?: string;
  employeeId?: string;
}

export interface PayrollCycle {
  id: string;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'processing' | 'completed' | 'finalized';
  totalEmployees: number;
  processedEmployees: number;
  totalPayroll: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
  finalizedBy?: string;
}

export interface EmployeePayroll {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  baseSalary: number;
  allowances: PayrollComponent[];
  deductions: PayrollComponent[];
  grossSalary: number;
  netSalary: number;
  status: 'pending' | 'processed' | 'approved' | 'paid';
  attendanceDays: number;
  workingDays: number;
  leaveDays: number;
  overtimeHours: number;
}

export interface PayrollComponent {
  type: string;
  amount: number;
  description?: string;
}
@Injectable({
  providedIn: 'root'
})
export class PayrollOfficerService {
  private readonly apiUrl = `${environment.apiUrl}/payroll`;
  private dashboardStatsSubject = new BehaviorSubject<PayrollStats | null>(null);
  private alertsSubject = new BehaviorSubject<PayrollAlert[]>([]);
  
  public dashboardStats$ = this.dashboardStatsSubject.asObservable();
  public alerts$ = this.alertsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenantId');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'Content-Type': 'application/json'
    });
  }

  // Dashboard Stats
  getDashboardStats(): Observable<PayrollStats> {
    return this.http.get<PayrollStats>(`${this.apiUrl}/dashboard/stats`, {
      headers: this.getHeaders()
    });
  }

  refreshDashboardStats(): void {
    this.getDashboardStats().subscribe(stats => {
      this.dashboardStatsSubject.next(stats);
    });
  }

  // Alerts Management
  getAlerts(): Observable<PayrollAlert[]> {
    return this.http.get<PayrollAlert[]>(`${this.apiUrl}/alerts`, {
      headers: this.getHeaders()
    });
  }

  markAlertAsRead(alertId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/alerts/${alertId}/read`, {}, {
      headers: this.getHeaders()
    });
  }

  dismissAlert(alertId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/alerts/${alertId}`, {
      headers: this.getHeaders()
    });
  }

  refreshAlerts(): void {
    this.getAlerts().subscribe(alerts => {
      this.alertsSubject.next(alerts);
    });
  }

  // Payroll Cycles
  getPayrollCycles(): Observable<PayrollCycle[]> {
    return this.http.get<PayrollCycle[]>(`${this.apiUrl}/cycles`, {
      headers: this.getHeaders()
    });
  }

  getPayrollCycle(cycleId: string): Observable<PayrollCycle> {
    return this.http.get<PayrollCycle>(`${this.apiUrl}/cycles/${cycleId}`, {
      headers: this.getHeaders()
    });
  }

  createPayrollCycle(cycle: Partial<PayrollCycle>): Observable<PayrollCycle> {
    return this.http.post<PayrollCycle>(`${this.apiUrl}/cycles`, cycle, {
      headers: this.getHeaders()
    });
  }

  updatePayrollCycle(cycleId: string, cycle: Partial<PayrollCycle>): Observable<PayrollCycle> {
    return this.http.put<PayrollCycle>(`${this.apiUrl}/cycles/${cycleId}`, cycle, {
      headers: this.getHeaders()
    });
  }

  // Payroll Processing
  processPayroll(cycleId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cycles/${cycleId}/process`, {}, {
      headers: this.getHeaders()
    });
  }

  finalizePayroll(cycleId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cycles/${cycleId}/finalize`, {}, {
      headers: this.getHeaders()
    });
  }

  // Employee Payroll
  getEmployeePayroll(cycleId: string): Observable<EmployeePayroll[]> {
    return this.http.get<EmployeePayroll[]>(`${this.apiUrl}/cycles/${cycleId}/employees`, {
      headers: this.getHeaders()
    });
  }

  updateEmployeePayroll(employeePayrollId: string, data: Partial<EmployeePayroll>): Observable<EmployeePayroll> {
    return this.http.put<EmployeePayroll>(`${this.apiUrl}/employee-payroll/${employeePayrollId}`, data, {
      headers: this.getHeaders()
    });
  }

  // Reports
  generatePayrollReport(params: any): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/monthly`, {
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

  generatePayslipReport(cycleId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/payslips/${cycleId}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  private loadInitialData(): void {
    this.refreshDashboardStats();
    this.refreshAlerts();
  }

  getUnreadAlertsCount(): number {
    return this.alertsSubject.value.filter(alert => !alert.isRead).length;
  }

  getCriticalAlertsCount(): number {
    return this.alertsSubject.value.filter(alert => alert.severity === 'critical').length;
  }
}