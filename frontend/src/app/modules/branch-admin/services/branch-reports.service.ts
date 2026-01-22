import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BranchReportsService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin/reports`;

  constructor(private http: HttpClient) {}

  getBranchPerformanceReport(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/performance?period=${period}`);
  }

  getStaffUtilizationReport(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/staff-utilization?period=${period}`);
  }

  getPatientFlowReport(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/patient-flow?period=${period}`);
  }

  getRevenueReport(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/revenue?period=${period}`);
  }

  exportReport(reportType: string, format: 'csv' | 'xlsx' | 'pdf' = 'pdf'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${reportType}/export?format=${format}`, { responseType: 'blob' });
  }
}