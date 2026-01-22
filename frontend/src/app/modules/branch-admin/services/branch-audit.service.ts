import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BranchAuditService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin/audit`;

  constructor(private http: HttpClient) {}

  getBranchAuditLogs(filters?: any): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/logs`, filters || {});
  }

  getStaffActivityLogs(staffId?: string): Observable<any[]> {
    const params = staffId ? `?staffId=${staffId}` : '';
    return this.http.get<any[]>(`${this.apiUrl}/staff-activity${params}`);
  }

  reportIncident(incident: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/incidents`, incident);
  }

  getIncidentReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/incidents`);
  }
}