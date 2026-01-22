import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DashboardStats {
  totalClinics: number;
  totalBranches: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyGrowth: number;
  aiUsageStats: {
    totalRequests: number;
    accuracy: number;
    activeModules: number;
  };
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable({
  providedIn: 'root'
})
export class CentralAdminService {
  private readonly apiUrl = `${environment.apiUrl}/central-admin`;
  private alertsSubject = new BehaviorSubject<SystemAlert[]>([]);
  
  public alerts$ = this.alertsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSystemAlerts();
  }

  // Dashboard Statistics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  // System Alerts
  getSystemAlerts(): Observable<SystemAlert[]> {
    return this.http.get<SystemAlert[]>(`${this.apiUrl}/alerts`);
  }

  markAlertAsRead(alertId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/alerts/${alertId}/read`, {});
  }

  dismissAlert(alertId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/alerts/${alertId}`);
  }

  // System Health Monitoring
  getSystemHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/health`);
  }

  getServiceStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/services`);
  }

  // Global Configuration
  getGlobalSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/settings`);
  }

  updateGlobalSettings(settings: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/settings`, settings);
  }

  // Feature Toggles
  getFeatureFlags(): Observable<any> {
    return this.http.get(`${this.apiUrl}/features`);
  }

  updateFeatureFlag(flagName: string, enabled: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/features/${flagName}`, { enabled });
  }

  // Maintenance Mode
  enableMaintenanceMode(message?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/maintenance/enable`, { message });
  }

  disableMaintenanceMode(): Observable<any> {
    return this.http.post(`${this.apiUrl}/maintenance/disable`, {});
  }

  private loadSystemAlerts(): void {
    // Mock alerts for now - replace with real API call
    const mockAlerts: SystemAlert[] = [
      {
        id: '1',
        type: 'warning',
        title: 'High Memory Usage',
        message: 'AI Diagnosis Service is using 85% memory',
        timestamp: new Date(),
        isRead: false,
        severity: 'medium'
      },
      {
        id: '2',
        type: 'info',
        title: 'Scheduled Maintenance',
        message: 'System maintenance scheduled for tonight at 2 AM',
        timestamp: new Date(Date.now() - 3600000),
        isRead: false,
        severity: 'low'
      },
      {
        id: '3',
        type: 'error',
        title: 'Payment Gateway Error',
        message: 'Razorpay integration experiencing issues',
        timestamp: new Date(Date.now() - 7200000),
        isRead: true,
        severity: 'high'
      }
    ];
    
    this.alertsSubject.next(mockAlerts);
  }
}