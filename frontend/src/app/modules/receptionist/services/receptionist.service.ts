import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DashboardStats {
  totalAppointments: number;
  checkedInPatients: number;
  walkInPatients: number;
  activeQueues: number;
  pendingCheckIns: number;
  doctorDelays: number;
}

export interface RecentActivity {
  id: string;
  type: 'registration' | 'appointment' | 'checkin' | 'token';
  description: string;
  timestamp: Date;
  icon: string;
  userId: string;
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  actionable?: boolean;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReceptionistService {
  private readonly apiUrl = `${environment.apiUrl}/receptionist`;
  private readonly wsUrl = `${environment.wsUrl}/receptionist`;
  
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Dashboard Data
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  getRecentActivities(limit: number = 20): Observable<RecentActivity[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<RecentActivity[]>(`${this.apiUrl}/activities/recent`, { params });
  }

  // Real-time Updates
  subscribeToUpdates(): void {
    // WebSocket connection for real-time updates
    // Implementation would depend on your WebSocket setup
  }

  // Alert Management
  addAlert(alert: Omit<Alert, 'id' | 'timestamp'>): void {
    const newAlert: Alert = {
      ...alert,
      id: this.generateId(),
      timestamp: new Date()
    };
    
    const currentAlerts = this.alertsSubject.value;
    this.alertsSubject.next([newAlert, ...currentAlerts]);
  }

  removeAlert(alertId: string): void {
    const currentAlerts = this.alertsSubject.value;
    const filteredAlerts = currentAlerts.filter(alert => alert.id !== alertId);
    this.alertsSubject.next(filteredAlerts);
  }

  clearAllAlerts(): void {
    this.alertsSubject.next([]);
  }

  // Activity Logging
  logActivity(activity: Omit<RecentActivity, 'id' | 'timestamp'>): Observable<RecentActivity> {
    const activityData = {
      ...activity,
      timestamp: new Date()
    };
    return this.http.post<RecentActivity>(`${this.apiUrl}/activities`, activityData);
  }

  // System Status
  getSystemStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/status`);
  }

  // Performance Metrics
  getPerformanceMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metrics/performance`);
  }

  // Utility Methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Keyboard Shortcuts Management
  registerKeyboardShortcuts(): void {
    // Register global keyboard shortcuts for receptionist actions
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'r':
          event.preventDefault();
          this.triggerQuickAction('register-patient');
          break;
        case 'b':
          event.preventDefault();
          this.triggerQuickAction('book-appointment');
          break;
        case 'i':
          event.preventDefault();
          this.triggerQuickAction('check-in');
          break;
        case 'q':
          event.preventDefault();
          this.triggerQuickAction('view-queues');
          break;
        case 'f':
          event.preventDefault();
          this.triggerQuickAction('find-patient');
          break;
      }
    }
  }

  private triggerQuickAction(action: string): void {
    // Emit events for quick actions
    // This would be handled by the dashboard component
    console.log(`Quick action triggered: ${action}`);
  }

  // Data Refresh
  refreshDashboardData(): Observable<any> {
    return this.http.post(`${this.apiUrl}/dashboard/refresh`, {});
  }

  // Branch Context
  setBranchContext(branchId: string): void {
    // Set the current branch context for all operations
    localStorage.setItem('currentBranchId', branchId);
  }

  getCurrentBranchId(): string | null {
    return localStorage.getItem('currentBranchId');
  }

  // User Preferences
  getUserPreferences(): Observable<any> {
    return this.http.get(`${this.apiUrl}/preferences`);
  }

  updateUserPreferences(preferences: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/preferences`, preferences);
  }

  // Emergency Actions
  triggerEmergencyAlert(message: string, severity: 'low' | 'medium' | 'high'): Observable<any> {
    return this.http.post(`${this.apiUrl}/emergency/alert`, { message, severity });
  }

  // Audit Trail
  getAuditTrail(startDate?: Date, endDate?: Date): Observable<any[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<any[]>(`${this.apiUrl}/audit`, { params });
  }
}