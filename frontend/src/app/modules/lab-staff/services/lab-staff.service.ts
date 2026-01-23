import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LabStaffProfile {
  id: string;
  staffId: string;
  name: string;
  email: string;
  phone: string;
  branchId: string;
  branchName: string;
  department: 'radiology' | 'pathology' | 'laboratory' | 'imaging';
  specializations: string[];
  certifications: string[];
  workingHours: {
    [key: string]: { start: string; end: string; isWorking: boolean };
  };
  isActive: boolean;
  joinedAt: Date;
}

export interface DiagnosticRequest {
  id: string;
  requestId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  testType: 'xray' | 'cbct' | 'mri' | 'ct_scan' | 'ultrasound' | 'blood_test' | 'urine_test' | 'biopsy';
  priority: 'routine' | 'urgent' | 'emergency';
  status: 'received' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  requestedAt: Date;
  scheduledAt?: Date;
  completedAt?: Date;
  notes: string;
  clinicalHistory?: string;
  instructions?: string;
  branchId: string;
  assignedTo?: string;
}

export interface DiagnosticReport {
  id: string;
  requestId: string;
  patientId: string;
  testType: string;
  files: {
    type: 'image' | 'pdf' | 'dicom';
    filename: string;
    url: string;
    size: number;
    uploadedAt: Date;
  }[];
  labRemarks: string;
  technicalNotes: string;
  qualityScore?: number;
  aiProcessingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  aiResults?: any;
  status: 'draft' | 'submitted' | 'validated' | 'finalized';
  uploadedBy: string;
  uploadedAt: Date;
  validatedBy?: string;
  validatedAt?: Date;
}

export interface LabStaffMetrics {
  todayRequests: number;
  pendingUploads: number;
  completedReports: number;
  urgentRequests: number;
  aiProcessingQueue: number;
  averageProcessingTime: number;
  qualityScore: number;
  reworkRequests: number;
}

export interface LabStaffAlert {
  id: string;
  type: 'urgent_request' | 'delayed_upload' | 'ai_processing_error' | 'system_issue' | 'quality_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionRequired: boolean;
  relatedEntity?: {
    type: 'request' | 'report' | 'patient';
    id: string;
    name: string;
  };
}

export interface WorklistItem {
  id: string;
  requestId: string;
  patientName: string;
  testType: string;
  priority: string;
  status: string;
  requestedAt: Date;
  estimatedTime: number;
  doctorName: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LabStaffService {
  private readonly apiUrl = `${environment.apiUrl}/lab-staff`;
  
  // State management
  private profileSubject = new BehaviorSubject<LabStaffProfile | null>(null);
  private alertsSubject = new BehaviorSubject<LabStaffAlert[]>([]);
  private metricsSubject = new BehaviorSubject<LabStaffMetrics | null>(null);
  private worklistSubject = new BehaviorSubject<WorklistItem[]>([]);

  // Public observables
  public profile$ = this.profileSubject.asObservable();
  public alerts$ = this.alertsSubject.asObservable();
  public metrics$ = this.metricsSubject.asObservable();
  public worklist$ = this.worklistSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadProfile();
  }

  // Profile Management
  getProfile(): Observable<LabStaffProfile> {
    return this.http.get<LabStaffProfile>(`${this.apiUrl}/profile`);
  }

  updateProfile(profile: Partial<LabStaffProfile>): Observable<LabStaffProfile> {
    return this.http.put<LabStaffProfile>(`${this.apiUrl}/profile`, profile);
  }

  private loadProfile(): void {
    this.getProfile().subscribe({
      next: (profile) => this.profileSubject.next(profile),
      error: (error) => console.error('Error loading profile:', error)
    });
  }

  // Dashboard Metrics
  getDashboardMetrics(): Observable<LabStaffMetrics> {
    return this.http.get<LabStaffMetrics>(`${this.apiUrl}/dashboard/metrics`);
  }

  getTodayOverview(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/today-overview`);
  }

  // Worklist Management
  getWorklist(): Observable<WorklistItem[]> {
    return this.http.get<WorklistItem[]>(`${this.apiUrl}/worklist`);
  }

  getWorklistByStatus(status: string): Observable<WorklistItem[]> {
    return this.http.get<WorklistItem[]>(`${this.apiUrl}/worklist?status=${status}`);
  }

  updateWorklistItemStatus(requestId: string, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/worklist/${requestId}/status`, { status });
  }

  // Diagnostic Requests
  getDiagnosticRequests(filters?: any): Observable<DiagnosticRequest[]> {
    const params = filters ? new URLSearchParams(filters).toString() : '';
    return this.http.get<DiagnosticRequest[]>(`${this.apiUrl}/requests?${params}`);
  }

  getDiagnosticRequest(requestId: string): Observable<DiagnosticRequest> {
    return this.http.get<DiagnosticRequest>(`${this.apiUrl}/requests/${requestId}`);
  }

  updateRequestStatus(requestId: string, status: string, notes?: string): Observable<DiagnosticRequest> {
    return this.http.patch<DiagnosticRequest>(`${this.apiUrl}/requests/${requestId}/status`, {
      status,
      notes
    });
  }

  assignRequestToSelf(requestId: string): Observable<DiagnosticRequest> {
    return this.http.patch<DiagnosticRequest>(`${this.apiUrl}/requests/${requestId}/assign`, {});
  }

  // Patient Verification
  verifyPatient(patientId: string, appointmentId?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients/${patientId}/verify`, {
      appointmentId
    });
  }

  getPatientInfo(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/patients/${patientId}`);
  }

  // Report Management
  getReports(filters?: any): Observable<DiagnosticReport[]> {
    const params = filters ? new URLSearchParams(filters).toString() : '';
    return this.http.get<DiagnosticReport[]>(`${this.apiUrl}/reports?${params}`);
  }

  getReport(reportId: string): Observable<DiagnosticReport> {
    return this.http.get<DiagnosticReport>(`${this.apiUrl}/reports/${reportId}`);
  }

  createReport(requestId: string, reportData: any): Observable<DiagnosticReport> {
    return this.http.post<DiagnosticReport>(`${this.apiUrl}/reports`, {
      requestId,
      ...reportData
    });
  }

  updateReport(reportId: string, reportData: Partial<DiagnosticReport>): Observable<DiagnosticReport> {
    return this.http.put<DiagnosticReport>(`${this.apiUrl}/reports/${reportId}`, reportData);
  }

  submitReport(reportId: string): Observable<DiagnosticReport> {
    return this.http.patch<DiagnosticReport>(`${this.apiUrl}/reports/${reportId}/submit`, {});
  }

  // File Upload
  uploadReportFiles(requestId: string, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });
    formData.append('requestId', requestId);

    return this.http.post(`${this.apiUrl}/reports/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  deleteReportFile(reportId: string, fileId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/reports/${reportId}/files/${fileId}`);
  }

  // AI Integration
  triggerAiAnalysis(reportId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ai/analyze/${reportId}`, {});
  }

  getAiAnalysisStatus(reportId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/ai/status/${reportId}`);
  }

  getAiResults(reportId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/ai/results/${reportId}`);
  }

  // Alerts Management
  getAlerts(): Observable<LabStaffAlert[]> {
    return this.http.get<LabStaffAlert[]>(`${this.apiUrl}/alerts`);
  }

  markAlertAsRead(alertId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/alerts/${alertId}/read`, {});
  }

  dismissAlert(alertId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/alerts/${alertId}`);
  }

  // Compliance & Audit
  getAuditLogs(filters?: any): Observable<any[]> {
    const params = filters ? new URLSearchParams(filters).toString() : '';
    return this.http.get<any[]>(`${this.apiUrl}/audit?${params}`);
  }

  getComplianceReport(dateRange: { start: Date; end: Date }): Observable<any> {
    return this.http.post(`${this.apiUrl}/compliance/report`, dateRange);
  }

  // Error Handling & Rework
  requestRework(reportId: string, reason: string, notes: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reports/${reportId}/rework`, {
      reason,
      notes
    });
  }

  flagQualityIssue(reportId: string, issue: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reports/${reportId}/quality-issue`, issue);
  }

  // Statistics & Analytics
  getPerformanceStats(period: 'day' | 'week' | 'month'): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/performance?period=${period}`);
  }

  getQualityMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/quality`);
  }

  // Utility Methods
  getCurrentProfile(): LabStaffProfile | null {
    return this.profileSubject.value;
  }

  getCurrentMetrics(): LabStaffMetrics | null {
    return this.metricsSubject.value;
  }

  refreshData(): void {
    this.loadProfile();
    this.getDashboardMetrics().subscribe({
      next: (metrics) => this.metricsSubject.next(metrics),
      error: (error) => console.error('Error loading metrics:', error)
    });
    this.getAlerts().subscribe({
      next: (alerts) => this.alertsSubject.next(alerts),
      error: (error) => console.error('Error loading alerts:', error)
    });
  }
}