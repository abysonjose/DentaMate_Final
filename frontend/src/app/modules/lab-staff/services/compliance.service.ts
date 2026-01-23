import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: any;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export interface ComplianceCheck {
  id: string;
  type: 'HIPAA' | 'GDPR' | 'FDA' | 'INTERNAL';
  status: 'PASSED' | 'FAILED' | 'WARNING';
  description: string;
  details: any;
  checkedAt: Date;
  checkedBy: string;
}

export interface DataRetentionPolicy {
  id: string;
  dataType: string;
  retentionPeriod: number; // in days
  archiveAfter: number; // in days
  deleteAfter: number; // in days
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ComplianceService {
  private apiUrl = `${environment.apiUrl}/compliance`;

  constructor(private http: HttpClient) {}

  // Audit Logging
  logActivity(activity: string, resourceType: string, resourceId: string, details?: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/audit-logs`, {
      userId: this.getCurrentUserId(),
      action: activity,
      resourceType,
      resourceId,
      details: details || {},
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    });
  }

  getAuditLogs(filters?: any): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/audit-logs`, {
      params: filters || {}
    });
  }

  getAuditLogsByUser(userId: string, dateRange?: { start: Date, end: Date }): Observable<AuditLog[]> {
    const params: any = { userId };
    if (dateRange) {
      params.startDate = dateRange.start.toISOString();
      params.endDate = dateRange.end.toISOString();
    }
    return this.http.get<AuditLog[]>(`${this.apiUrl}/audit-logs/user`, { params });
  }

  getAuditLogsByResource(resourceType: string, resourceId: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/audit-logs/resource`, {
      params: { resourceType, resourceId }
    });
  }

  // Compliance Checks
  runComplianceCheck(checkType: string, resourceId?: string): Observable<ComplianceCheck> {
    return this.http.post<ComplianceCheck>(`${this.apiUrl}/checks`, {
      type: checkType,
      resourceId,
      checkedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getComplianceStatus(): Observable<ComplianceCheck[]> {
    return this.http.get<ComplianceCheck[]>(`${this.apiUrl}/status`);
  }

  getComplianceHistory(dateRange?: { start: Date, end: Date }): Observable<ComplianceCheck[]> {
    const params: any = {};
    if (dateRange) {
      params.startDate = dateRange.start.toISOString();
      params.endDate = dateRange.end.toISOString();
    }
    return this.http.get<ComplianceCheck[]>(`${this.apiUrl}/history`, { params });
  }

  // Data Access Tracking
  trackDataAccess(dataType: string, dataId: string, accessType: 'READ' | 'WRITE' | 'DELETE'): Observable<any> {
    return this.http.post(`${this.apiUrl}/data-access`, {
      userId: this.getCurrentUserId(),
      dataType,
      dataId,
      accessType,
      timestamp: new Date(),
      ipAddress: this.getClientIP()
    });
  }

  getDataAccessLogs(dataId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/data-access/${dataId}`);
  }

  // Privacy and Consent Management
  recordConsentGiven(patientId: string, consentType: string, details: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/consent`, {
      patientId,
      consentType,
      details,
      givenBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  recordConsentWithdrawn(patientId: string, consentType: string, reason: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/consent`, {
      body: {
        patientId,
        consentType,
        reason,
        withdrawnBy: this.getCurrentUserId(),
        timestamp: new Date()
      }
    });
  }

  getConsentStatus(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/consent/${patientId}`);
  }

  // Data Retention and Archival
  getRetentionPolicies(): Observable<DataRetentionPolicy[]> {
    return this.http.get<DataRetentionPolicy[]>(`${this.apiUrl}/retention/policies`);
  }

  applyRetentionPolicy(dataType: string, dataIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/retention/apply`, {
      dataType,
      dataIds,
      appliedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getDataDueForArchival(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/retention/due-archival`);
  }

  getDataDueForDeletion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/retention/due-deletion`);
  }

  // Security Monitoring
  reportSecurityIncident(incident: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/incidents`, {
      ...incident,
      reportedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getSecurityIncidents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/security/incidents`);
  }

  // Access Control Validation
  validateUserAccess(resourceType: string, resourceId: string, action: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiUrl}/access/validate`, {
      userId: this.getCurrentUserId(),
      resourceType,
      resourceId,
      action
    });
  }

  getAccessPermissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/access/permissions/${this.getCurrentUserId()}`);
  }

  // Data Anonymization
  anonymizeData(dataType: string, dataIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/anonymization`, {
      dataType,
      dataIds,
      requestedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getAnonymizationStatus(requestId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/anonymization/${requestId}/status`);
  }

  // Compliance Reporting
  generateComplianceReport(reportType: string, dateRange: { start: Date, end: Date }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/reports/${reportType}`, {
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      generatedBy: this.getCurrentUserId()
    }, {
      responseType: 'blob'
    });
  }

  getComplianceReportHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reports/history`);
  }

  // Data Breach Management
  reportDataBreach(breach: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/breaches`, {
      ...breach,
      reportedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getDataBreaches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/breaches`);
  }

  updateBreachStatus(breachId: string, status: string, notes: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/breaches/${breachId}`, {
      status,
      notes,
      updatedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  // Regulatory Compliance
  checkHIPAACompliance(resourceId: string): Observable<ComplianceCheck> {
    return this.runComplianceCheck('HIPAA', resourceId);
  }

  checkGDPRCompliance(resourceId: string): Observable<ComplianceCheck> {
    return this.runComplianceCheck('GDPR', resourceId);
  }

  checkFDACompliance(resourceId: string): Observable<ComplianceCheck> {
    return this.runComplianceCheck('FDA', resourceId);
  }

  // Training and Certification
  recordComplianceTraining(trainingType: string, completionDate: Date): Observable<any> {
    return this.http.post(`${this.apiUrl}/training`, {
      userId: this.getCurrentUserId(),
      trainingType,
      completionDate,
      recordedAt: new Date()
    });
  }

  getTrainingRecords(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/training/${this.getCurrentUserId()}`);
  }

  // Policy Management
  getPolicies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/policies`);
  }

  acknowledgePolicyRead(policyId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/policies/${policyId}/acknowledge`, {
      userId: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  // Utility Methods
  private getCurrentUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || '';
  }

  private getClientIP(): string {
    // This would typically be handled by the backend
    return 'client-ip';
  }

  // Compliance Dashboard Data
  getComplianceDashboardData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`);
  }

  // Risk Assessment
  assessComplianceRisk(resourceType: string, resourceId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/risk-assessment`, {
      resourceType,
      resourceId,
      assessedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  // Automated Compliance Monitoring
  enableAutomatedMonitoring(resourceType: string, rules: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/monitoring/enable`, {
      resourceType,
      rules,
      enabledBy: this.getCurrentUserId()
    });
  }

  getMonitoringAlerts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/monitoring/alerts`);
  }

  acknowledgeAlert(alertId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/monitoring/alerts/${alertId}/acknowledge`, {
      acknowledgedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }
}