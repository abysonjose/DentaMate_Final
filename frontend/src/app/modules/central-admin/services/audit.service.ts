import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  tenantId: string;
  tenantName: string;
  action: string;
  resource: string;
  resourceId: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed' | 'unauthorized' | 'forbidden';
  statusCode: number;
  requestData?: any;
  responseData?: any;
  errorMessage?: string;
  duration: number;
  sessionId: string;
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_config' | 'user_management' | 'financial' | 'ai_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  metadata: {
    browserInfo?: string;
    deviceInfo?: string;
    location?: string;
    referrer?: string;
  };
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'password_change' | 'account_locked' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access';
  userId?: string;
  userName?: string;
  tenantId?: string;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export interface ComplianceReport {
  id: string;
  reportType: 'hipaa' | 'gdpr' | 'sox' | 'custom';
  generatedAt: Date;
  generatedBy: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalEvents: number;
    criticalEvents: number;
    complianceScore: number;
    violations: number;
  };
  sections: {
    dataAccess: any;
    userManagement: any;
    systemSecurity: any;
    dataProtection: any;
  };
  recommendations: string[];
  status: 'draft' | 'final' | 'submitted';
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly apiUrl = `${environment.apiUrl}/central-admin/audit`;

  constructor(private http: HttpClient) {}

  // Audit Logs
  getAuditLogs(filters?: any): Observable<AuditLog[]> {
    return this.http.post<AuditLog[]>(`${this.apiUrl}/logs`, filters || {});
  }

  getAuditLogById(id: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${this.apiUrl}/logs/${id}`);
  }

  getAuditLogsByUser(userId: string, limit: number = 100): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs/user/${userId}?limit=${limit}`);
  }

  getAuditLogsByTenant(tenantId: string, limit: number = 100): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs/tenant/${tenantId}?limit=${limit}`);
  }

  getAuditLogsByResource(resource: string, resourceId: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs/resource/${resource}/${resourceId}`);
  }

  // Security Events
  getSecurityEvents(filters?: any): Observable<SecurityEvent[]> {
    return this.http.post<SecurityEvent[]>(`${this.apiUrl}/security-events`, filters || {});
  }

  getSecurityEventById(id: string): Observable<SecurityEvent> {
    return this.http.get<SecurityEvent>(`${this.apiUrl}/security-events/${id}`);
  }

  createSecurityEvent(event: Partial<SecurityEvent>): Observable<SecurityEvent> {
    return this.http.post<SecurityEvent>(`${this.apiUrl}/security-events`, event);
  }

  resolveSecurityEvent(id: string, resolution: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/security-events/${id}/resolve`, { resolution });
  }

  getUnresolvedSecurityEvents(): Observable<SecurityEvent[]> {
    return this.http.get<SecurityEvent[]>(`${this.apiUrl}/security-events/unresolved`);
  }

  getCriticalSecurityEvents(): Observable<SecurityEvent[]> {
    return this.http.get<SecurityEvent[]>(`${this.apiUrl}/security-events/critical`);
  }

  // User Activity Monitoring
  getUserActivity(userId: string, period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/user-activity/${userId}?period=${period}`);
  }

  getUserLoginHistory(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user-activity/${userId}/login-history`);
  }

  getSuspiciousUserActivity(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user-activity/suspicious`);
  }

  getFailedLoginAttempts(period: string = '24h'): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user-activity/failed-logins?period=${period}`);
  }

  // Data Access Monitoring
  getDataAccessLogs(filters?: any): Observable<AuditLog[]> {
    return this.http.post<AuditLog[]>(`${this.apiUrl}/data-access`, filters || {});
  }

  getSensitiveDataAccess(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/data-access/sensitive`);
  }

  getUnauthorizedAccessAttempts(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/data-access/unauthorized`);
  }

  getDataExportLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/data-access/exports`);
  }

  // System Configuration Changes
  getConfigurationChanges(period: string = '30d'): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/config-changes?period=${period}`);
  }

  getSystemSettingsChanges(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/config-changes/system`);
  }

  getUserPermissionChanges(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/config-changes/permissions`);
  }

  // Financial Transaction Auditing
  getFinancialAuditLogs(period: string = '30d'): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/financial?period=${period}`);
  }

  getPaymentTransactionLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/financial/payments`);
  }

  getRefundTransactionLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/financial/refunds`);
  }

  getSubscriptionChangeLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/financial/subscriptions`);
  }

  // AI Usage Auditing
  getAiUsageAuditLogs(period: string = '30d'): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/ai-usage?period=${period}`);
  }

  getAiModelAccessLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/ai-usage/model-access`);
  }

  getAiConfigurationChanges(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/ai-usage/config-changes`);
  }

  // Compliance Reporting
  getComplianceReports(): Observable<ComplianceReport[]> {
    return this.http.get<ComplianceReport[]>(`${this.apiUrl}/compliance/reports`);
  }

  getComplianceReportById(id: string): Observable<ComplianceReport> {
    return this.http.get<ComplianceReport>(`${this.apiUrl}/compliance/reports/${id}`);
  }

  generateComplianceReport(config: any): Observable<ComplianceReport> {
    return this.http.post<ComplianceReport>(`${this.apiUrl}/compliance/reports/generate`, config);
  }

  getComplianceScore(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/compliance/score?period=${period}`);
  }

  getComplianceViolations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/compliance/violations`);
  }

  // Analytics and Insights
  getAuditAnalytics(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics?period=${period}`);
  }

  getActivityTrends(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/trends`);
  }

  getRiskAssessment(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/risk-assessment`);
  }

  getAnomalyDetection(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/analytics/anomalies`);
  }

  // Search and Filtering
  searchAuditLogs(query: string, filters?: any): Observable<AuditLog[]> {
    return this.http.post<AuditLog[]>(`${this.apiUrl}/search`, { query, ...filters });
  }

  getAuditLogsByDateRange(startDate: Date, endDate: Date): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs/date-range?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
  }

  getAuditLogsByCategory(category: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs/category/${category}`);
  }

  // Retention and Archiving
  getRetentionPolicies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/retention/policies`);
  }

  updateRetentionPolicy(policy: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/retention/policies/${policy.id}`, policy);
  }

  archiveOldLogs(beforeDate: Date): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/retention/archive`, { beforeDate });
  }

  getArchivedLogs(filters?: any): Observable<AuditLog[]> {
    return this.http.post<AuditLog[]>(`${this.apiUrl}/retention/archived`, filters || {});
  }

  // Export and Backup
  exportAuditLogs(filters: any, format: 'csv' | 'xlsx' | 'json' = 'csv'): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/export?format=${format}`, filters, { responseType: 'blob' });
  }

  exportSecurityEvents(format: 'csv' | 'xlsx' | 'json' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/security-events/export?format=${format}`, { responseType: 'blob' });
  }

  exportComplianceReport(reportId: string, format: 'pdf' | 'xlsx' = 'pdf'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/compliance/reports/${reportId}/export?format=${format}`, { 
      responseType: 'blob' 
    });
  }

  // Real-time Monitoring
  getRealtimeAuditStream(): Observable<AuditLog> {
    // This would typically use WebSocket or Server-Sent Events
    return this.http.get<AuditLog>(`${this.apiUrl}/realtime/stream`);
  }

  getRealtimeSecurityAlerts(): Observable<SecurityEvent> {
    // This would typically use WebSocket or Server-Sent Events
    return this.http.get<SecurityEvent>(`${this.apiUrl}/realtime/security-alerts`);
  }

  // Alerting and Notifications
  getAuditAlerts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alerts`);
  }

  createAuditAlert(alert: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/alerts`, alert);
  }

  updateAuditAlert(id: string, alert: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/alerts/${id}`, alert);
  }

  deleteAuditAlert(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/alerts/${id}`);
  }
}