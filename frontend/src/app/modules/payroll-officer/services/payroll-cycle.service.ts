import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PayrollCycle } from './payroll-officer.service';

export interface PayrollProcessingResult {
  success: boolean;
  processedEmployees: number;
  totalEmployees: number;
  errors: PayrollProcessingError[];
  warnings: PayrollProcessingWarning[];
}

export interface PayrollProcessingError {
  employeeId: string;
  employeeName: string;
  error: string;
  severity: 'error' | 'warning';
}

export interface PayrollProcessingWarning {
  employeeId: string;
  employeeName: string;
  warning: string;
  canProceed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PayrollCycleService {
  private readonly apiUrl = `${environment.apiUrl}/payroll/cycles`;

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

  // Cycle Management
  getCycles(): Observable<PayrollCycle[]> {
    return this.http.get<PayrollCycle[]>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }

  getCycle(cycleId: string): Observable<PayrollCycle> {
    return this.http.get<PayrollCycle>(`${this.apiUrl}/${cycleId}`, {
      headers: this.getHeaders()
    });
  }

  createCycle(cycle: Partial<PayrollCycle>): Observable<PayrollCycle> {
    return this.http.post<PayrollCycle>(this.apiUrl, cycle, {
      headers: this.getHeaders()
    });
  }

  updateCycle(cycleId: string, cycle: Partial<PayrollCycle>): Observable<PayrollCycle> {
    return this.http.put<PayrollCycle>(`${this.apiUrl}/${cycleId}`, cycle, {
      headers: this.getHeaders()
    });
  }

  deleteCycle(cycleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${cycleId}`, {
      headers: this.getHeaders()
    });
  }

  // Payroll Processing
  validateCycle(cycleId: string): Observable<PayrollProcessingResult> {
    return this.http.post<PayrollProcessingResult>(`${this.apiUrl}/${cycleId}/validate`, {}, {
      headers: this.getHeaders()
    });
  }

  processCycle(cycleId: string): Observable<PayrollProcessingResult> {
    return this.http.post<PayrollProcessingResult>(`${this.apiUrl}/${cycleId}/process`, {}, {
      headers: this.getHeaders()
    });
  }

  finalizeCycle(cycleId: string): Observable<PayrollCycle> {
    return this.http.post<PayrollCycle>(`${this.apiUrl}/${cycleId}/finalize`, {}, {
      headers: this.getHeaders()
    });
  }

  reopenCycle(cycleId: string): Observable<PayrollCycle> {
    return this.http.post<PayrollCycle>(`${this.apiUrl}/${cycleId}/reopen`, {}, {
      headers: this.getHeaders()
    });
  }

  // Cycle Statistics
  getCycleStatistics(cycleId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${cycleId}/statistics`, {
      headers: this.getHeaders()
    });
  }

  // Bulk Operations
  bulkProcessCycles(cycleIds: string[]): Observable<PayrollProcessingResult[]> {
    return this.http.post<PayrollProcessingResult[]>(`${this.apiUrl}/bulk-process`, 
      { cycleIds }, 
      { headers: this.getHeaders() }
    );
  }

  // Export Operations
  exportCycleData(cycleId: string, format: 'pdf' | 'excel' | 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${cycleId}/export`, {
      headers: this.getHeaders(),
      params: { format },
      responseType: 'blob'
    });
  }

  // Audit Trail
  getCycleAuditLog(cycleId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${cycleId}/audit-log`, {
      headers: this.getHeaders()
    });
  }
}