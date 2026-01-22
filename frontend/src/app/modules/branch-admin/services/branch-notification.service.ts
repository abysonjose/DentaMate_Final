import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BranchNotificationService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin/notifications`;

  constructor(private http: HttpClient) {}

  sendStaffAnnouncement(message: string, targetRoles?: string[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/announcement`, { message, targetRoles });
  }

  getNotificationHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/history`);
  }

  configureNotificationSettings(settings: any): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/settings`, settings);
  }
}