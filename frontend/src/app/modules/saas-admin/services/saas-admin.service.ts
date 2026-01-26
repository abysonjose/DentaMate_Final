import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PlatformOverview {
  overview: {
    totalClinics: number;
    activeClinics: number;
    inactiveClinics: number;
    totalRevenue: number;
    activeUsers: number;
    systemHealth: number;
  };
  growth: {
    newSignups: number;
    churnedClinics: number;
    netGrowth: number;
    revenueGrowth: {
      current: number;
      previous: number;
      growthPercentage: number;
    };
  };
  distribution: {
    subscriptionDistribution: Array<{
      plan: string;
      clinics: number;
      revenue: number;
    }>;
    geographicDistribution: Array<{
      region: string;
      clinics: number;
      users: number;
    }>;
  };
  alerts: Array<{
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    timestamp: Date;
    entityType: string;
    entityId: string;
    tenantId?: string;
  }>;
}

export interface SystemAlert {
  id: string;
  type: 'LICENSE_EXPIRY' | 'USAGE_LIMIT' | 'PAYMENT_FAILED' | 'SYSTEM_ERROR' | 'SECURITY_INCIDENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  tenantId?: string;
  actionRequired: boolean;
  actionUrl?: string;
}

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  affectedServices: string[];
  notifyUsers: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SaasAdminService {
  private readonly apiUrl = `${environment.apiUrl}/saas-admin`;
  
  private alertsSubject = new BehaviorSubject<SystemAlert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();
  
  private maintenanceModeSubject = new BehaviorSubject<MaintenanceMode>({
    enabled: false,
    message: '',
    affectedServices: [],
    notifyUsers: false
  });
  public maintenanceMode$ = this.maintenanceModeSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSystemAlerts();
    this.loadMaintenanceStatus();
  }

  // Dashboard & Overview
  getDashboardOverview(period: string = '30d'): Observable<{ success: boolean; data: PlatformOverview }> {
    const params = new HttpParams().set('period', period);
    return this.http.get<{ success: boolean; data: PlatformOverview }>(`${this.apiUrl}/dashboard/overview`, { params });
  }

  getUsageAnalytics(period: string = '30d'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get(`${this.apiUrl}/analytics/usage`, { params });
  }

  getRevenueAnalytics(period: string = '12m'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get(`${this.apiUrl}/analytics/revenue`, { params });
  }

  getCustomerAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/customers`);
  }

  // System Alerts Management
  private loadSystemAlerts(): void {
    // In a real implementation, this would load from the backend
    // For now, we'll simulate some alerts
    const mockAlerts: SystemAlert[] = [
      {
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