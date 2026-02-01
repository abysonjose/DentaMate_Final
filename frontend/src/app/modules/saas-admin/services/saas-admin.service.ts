import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  systemUptime: number;
  activeServices: number;
  totalServices: number;
}

export interface GrowthMetrics {
  newSignups: number;
  churnRate: number;
  netGrowth: number;
  revenueGrowth: number;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'license_expiring' | 'service_down' | 'payment_failed';
  title: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
}

export interface ChartData {
  labels: string[];
  values: number[];
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  tenantId?: string;
}

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  affectedServices: string[];
  bypassUsers: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SaasAdminService {
  private readonly apiUrl = `${environment.apiUrl}/saas-admin`;

  constructor(private http: HttpClient) {}

  // Dashboard & Overview
  getPlatformMetrics(): Observable<PlatformMetrics> {
    return this.http.get<PlatformMetrics>(`${this.apiUrl}/dashboard/metrics`);
  }

  getGrowthMetrics(): Observable<GrowthMetrics> {
    return this.http.get<GrowthMetrics>(`${this.apiUrl}/dashboard/growth`);
  }

  getServiceStatuses(): Observable<ServiceStatus[]> {
    return this.http.get<ServiceStatus[]>(`${this.apiUrl}/system/services/status`);
  }

  getSystemAlerts(): Observable<SystemAlert[]> {
    return this.http.get<SystemAlert[]>(`${this.apiUrl}/alerts`);
  }

  dismissAlert(alertId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/alerts/${alertId}/dismiss`, {});
  }

  acknowledgeAlert(alertId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/alerts/${alertId}/acknowledge`, {});
  }

  // Chart Data
  getRevenueChartData(months: number): Observable<ChartData> {
    const params = new HttpParams().set('months', months.toString());
    return this.http.get<ChartData>(`${this.apiUrl}/analytics/revenue-chart`, { params });
  }

  getSignupChartData(days: number): Observable<ChartData> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ChartData>(`${this.apiUrl}/analytics/signup-chart`, { params });
  }

  getTenantDistributionData(): Observable<ChartData> {
    return this.http.get<ChartData>(`${this.apiUrl}/analytics/tenant-distribution`);
  }

  // Recent Activities
  getRecentActivit
        id: 'alert_1',
        type: 'LICENSE_EXPIRY',
        severity: 'HIGH',
        title: 'License Expiring Soon',
        message: '5 licenses are expiring within the next 7 days',
        timestamp: new Date(),
        isRead: false,
        actionRequired: true,
        actionUrl: '/saas-admin/licenses?filter=expiring'
      },
      {
        id: 'alert_2',
        type: 'USAGE_LIMIT',
        severity: 'MEDIUM',
        title: 'Usage Limit Warning',
        message: 'Tenant ABC Dental has exceeded 80% of their user limit',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: false,
        tenantId: 'tenant_abc',
        actionRequired: true,
        actionUrl: '/saas-admin/licenses?tenantId=tenant_abc'
      },
      {
        id: 'alert_3',
        type: 'PAYMENT_FAILED',
        severity: 'CRITICAL',
        title: 'Payment Failed',
        message: 'Payment failed for XYZ Clinic - subscription at risk',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        isRead: false,
        tenantId: 'tenant_xyz',
        actionRequired: true,
        actionUrl: '/saas-admin/licenses?tenantId=tenant_xyz'
      }
    ];
    
    this.alertsSubject.next(mockAlerts);
  }

  getSystemAlerts(): SystemAlert[] {
    return this.alertsSubject.value;
  }

  markAlertAsRead(alertId: string): void {
    const alerts = this.alertsSubject.value.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    );
    this.alertsSubject.next(alerts);
  }

  dismissAlert(alertId: string): void {
    const alerts = this.alertsSubject.value.filter(alert => alert.id !== alertId);
    this.alertsSubject.next(alerts);
  }

  getUnreadAlertsCount(): number {
    return this.alertsSubject.value.filter(alert => !alert.isRead).length;
  }

  getCriticalAlertsCount(): number {
    return this.alertsSubject.value.filter(alert => 
      alert.severity === 'CRITICAL' && !alert.isRead
    ).length;
  }

  // Maintenance Mode Management
  private loadMaintenanceStatus(): void {
    // In a real implementation, this would load from the backend
    const mockMaintenanceMode: MaintenanceMode = {
      enabled: false,
      message: '',
      affectedServices: [],
      notifyUsers: false
    };
    
    this.maintenanceModeSubject.next(mockMaintenanceMode);
  }

  enableMaintenanceMode(config: Partial<MaintenanceMode>): Observable<any> {
    const maintenanceConfig = {
      ...this.maintenanceModeSubject.value,
      ...config,
      enabled: true
    };
    
    // In a real implementation, this would call the backend API
    this.maintenanceModeSubject.next(maintenanceConfig);
    
    return this.http.post(`${this.apiUrl}/maintenance/enable`, maintenanceConfig);
  }

  disableMaintenanceMode(): Observable<any> {
    const maintenanceConfig = {
      ...this.maintenanceModeSubject.value,
      enabled: false
    };
    
    this.maintenanceModeSubject.next(maintenanceConfig);
    
    return this.http.post(`${this.apiUrl}/maintenance/disable`, {});
  }

  getMaintenanceStatus(): MaintenanceMode {
    return this.maintenanceModeSubject.value;
  }

  // Feature Flag Management
  getGlobalFeatureFlags(): Observable<any> {
    return this.http.get(`${this.apiUrl}/feature-flags/global`);
  }

  updateGlobalFeatureFlag(flagName: string, enabled: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/feature-flags/global/${flagName}`, { enabled });
  }

  getTenantFeatureFlags(tenantId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/feature-flags/tenant/${tenantId}`);
  }

  updateTenantFeatureFlag(tenantId: string, flagName: string, enabled: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/feature-flags/tenant/${tenantId}/${flagName}`, { enabled });
  }

  // System Configuration
  getSystemConfiguration(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/configuration`);
  }

  updateSystemConfiguration(config: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/system/configuration`, config);
  }

  // Backup & Recovery
  initiateSystemBackup(): Observable<any> {
    return this.http.post(`${this.apiUrl}/system/backup`, {});
  }

  getBackupHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/backups`);
  }

  restoreFromBackup(backupId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/system/restore/${backupId}`, {});
  }

  // Security & Compliance
  getSecurityEvents(days: number = 7): Observable<any> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get(`${this.apiUrl}/security/events`, { params });
  }

  getComplianceReport(type: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/compliance/report/${type}`);
  }

  // Notification Management
  sendSystemNotification(notification: {
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'ERROR';
    targetAudience: 'ALL' | 'ADMINS' | 'SPECIFIC_TENANTS';
    tenantIds?: string[];
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/notifications/system`, notification);
  }

  // Health Checks
  getSystemHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/health`);
  }

  getServiceStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/services/status`);
  }

  restartService(serviceName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/system/services/${serviceName}/restart`, {});
  }

  // Real-time Updates
  subscribeToRealTimeUpdates(): Observable<any> {
    // In a real implementation, this would use WebSocket or Server-Sent Events
    // For now, we'll simulate with periodic HTTP calls
    return new Observable(observer => {
      const interval = setInterval(() => {
        this.getDashboardOverview().subscribe(
          data => observer.next(data),
          error => observer.error(error)
        );
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    });
  }
}