import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';

// Integration interfaces
export interface LabDoctorNotification {
  id: string;
  type: 'lab_request_created' | 'results_available' | 'critical_result' | 'request_delayed' | 'quality_issue';
  title: string;
  message: string;
  requestId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  labStaffId?: string;
  labStaffName?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  acknowledged: boolean;
  data?: any;
}

export interface LabRequestStatus {
  requestId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  testTypes: string[];
  status: 'received' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'routine' | 'urgent' | 'emergency';
  assignedLabStaff?: string;
  assignedLabStaffName?: string;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  progress: number;
  notes?: string;
  lastUpdated: Date;
}

export interface DiagnosticResultNotification {
  id: string;
  requestId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  testType: string;
  resultType: 'normal' | 'abnormal' | 'critical' | 'inconclusive';
  findings: string[];
  recommendations: string[];
  aiAnalysisAvailable: boolean;
  aiConfidence?: number;
  labStaffId: string;
  labStaffName: string;
  uploadedAt: Date;
  requiresReview: boolean;
  criticalFlags: string[];
}

export interface LabWorkflowEvent {
  id: string;
  eventType: 'request_received' | 'patient_verified' | 'processing_started' | 'report_uploaded' | 'ai_analysis_complete' | 'results_sent';
  requestId: string;
  patientId: string;
  performedBy: string;
  performedByRole: 'doctor' | 'lab-staff';
  timestamp: Date;
  details: any;
  nextAction?: string;
  nextActionBy?: 'doctor' | 'lab-staff';
}

export interface LabStaffWorkload {
  staffId: string;
  staffName: string;
  department: string;
  currentWorkload: {
    pendingRequests: number;
    inProgressRequests: number;
    completedToday: number;
    averageProcessingTime: number;
  };
  availability: 'available' | 'busy' | 'break' | 'offline';
  specializations: string[];
  performanceMetrics: {
    qualityScore: number;
    onTimeDelivery: number;
    patientSatisfaction: number;
  };
}

export interface DoctorLabMetrics {
  doctorId: string;
  doctorName: string;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  criticalResults: number;
  averageTurnaroundTime: number;
  mostRequestedTests: { testType: string; count: number }[];
  preferredLabStaff: { staffId: string; staffName: string; requestCount: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class LabDoctorIntegrationService {
  private readonly apiUrl = `${environment.apiUrl}/lab-doctor-integration`;
  private socket: Socket;
  
  // Real-time data streams
  private notificationsSubject = new BehaviorSubject<LabDoctorNotification[]>([]);
  private requestStatusSubject = new BehaviorSubject<LabRequestStatus[]>([]);
  private workflowEventsSubject = new BehaviorSubject<LabWorkflowEvent[]>([]);
  private labStaffWorkloadSubject = new BehaviorSubject<LabStaffWorkload[]>([]);
  
  // Event streams
  private newNotificationSubject = new Subject<LabDoctorNotification>();
  private statusUpdateSubject = new Subject<LabRequestStatus>();
  private resultAvailableSubject = new Subject<DiagnosticResultNotification>();
  private workflowEventSubject = new Subject<LabWorkflowEvent>();
  
  // Public observables
  public notifications$ = this.notificationsSubject.asObservable();
  public requestStatus$ = this.requestStatusSubject.asObservable();
  public workflowEvents$ = this.workflowEventsSubject.asObservable();
  public labStaffWorkload$ = this.labStaffWorkloadSubject.asObservable();
  
  // Event observables
  public newNotification$ = this.newNotificationSubject.asObservable();
  public statusUpdate$ = this.statusUpdateSubject.asObservable();
  public resultAvailable$ = this.resultAvailableSubject.asObservable();
  public workflowEvent$ = this.workflowEventSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeWebSocket();
    this.loadInitialData();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private initializeWebSocket(): void {
    this.socket = io(`${environment.wsUrl}/lab-doctor`, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Listen for real-time updates
    this.socket.on('lab-request-status-update', (status: LabRequestStatus) => {
      this.statusUpdateSubject.next(status);
      this.updateRequestStatus(status);
    });

    this.socket.on('diagnostic-result-available', (result: DiagnosticResultNotification) => {
      this.resultAvailableSubject.next(result);
      this.createNotification({
        type: result.resultType === 'critical' ? 'critical_result' : 'results_available',
        title: result.resultType === 'critical' ? 'Critical Lab Result' : 'Lab Results Available',
        message: `Results for ${result.testType} are ready for ${result.patientName}`,
        requestId: result.requestId,
        patientId: result.patientId,
        patientName: result.patientName,
        doctorId: result.doctorId,
        priority: result.resultType === 'critical' ? 'critical' : 'medium',
        data: result
      });
    });

    this.socket.on('lab-workflow-event', (event: LabWorkflowEvent) => {
      this.workflowEventSubject.next(event);
      this.addWorkflowEvent(event);
    });

    this.socket.on('lab-staff-workload-update', (workload: LabStaffWorkload[]) => {
      this.labStaffWorkloadSubject.next(workload);
    });

    this.socket.on('new-lab-notification', (notification: LabDoctorNotification) => {
      this.newNotificationSubject.next(notification);
      this.addNotification(notification);
    });
  }

  private loadInitialData(): void {
    this.getNotifications().subscribe(notifications => 
      this.notificationsSubject.next(notifications)
    );
    
    this.getRequestStatuses().subscribe(statuses => 
      this.requestStatusSubject.next(statuses)
    );
    
    this.getWorkflowEvents().subscribe(events => 
      this.workflowEventsSubject.next(events)
    );
    
    this.getLabStaffWorkload().subscribe(workload => 
      this.labStaffWorkloadSubject.next(workload)
    );
  }

  // Notification Management
  getNotifications(): Observable<LabDoctorNotification[]> {
    return this.http.get<LabDoctorNotification[]>(`${this.apiUrl}/notifications`, {
      headers: this.getHeaders()
    });
  }

  markNotificationAsRead(notificationId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/${notificationId}/read`, {}, {
      headers: this.getHeaders()
    });
  }

  acknowledgeNotification(notificationId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/${notificationId}/acknowledge`, {}, {
      headers: this.getHeaders()
    });
  }

  // Request Status Tracking
  getRequestStatuses(): Observable<LabRequestStatus[]> {
    return this.http.get<LabRequestStatus[]>(`${this.apiUrl}/request-statuses`, {
      headers: this.getHeaders()
    });
  }

  getRequestStatus(requestId: string): Observable<LabRequestStatus> {
    return this.http.get<LabRequestStatus>(`${this.apiUrl}/request-statuses/${requestId}`, {
      headers: this.getHeaders()
    });
  }

  updateRequestPriority(requestId: string, priority: string, reason?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/requests/${requestId}/priority`, {
      priority,
      reason
    }, {
      headers: this.getHeaders()
    });
  }

  addRequestNotes(requestId: string, notes: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/notes`, {
      notes
    }, {
      headers: this.getHeaders()
    });
  }

  // Lab Staff Assignment and Communication
  getLabStaffWorkload(): Observable<LabStaffWorkload[]> {
    return this.http.get<LabStaffWorkload[]>(`${this.apiUrl}/lab-staff/workload`, {
      headers: this.getHeaders()
    });
  }

  assignRequestToLabStaff(requestId: string, labStaffId: string, notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/assign`, {
      labStaffId,
      notes
    }, {
      headers: this.getHeaders()
    });
  }

  sendMessageToLabStaff(labStaffId: string, requestId: string, message: string, priority: string = 'medium'): Observable<any> {
    return this.http.post(`${this.apiUrl}/messages/to-lab-staff`, {
      labStaffId,
      requestId,
      message,
      priority
    }, {
      headers: this.getHeaders()
    });
  }

  requestLabStaffUpdate(requestId: string, updateType: string, message?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/request-update`, {
      updateType,
      message
    }, {
      headers: this.getHeaders()
    });
  }

  // Workflow Events
  getWorkflowEvents(requestId?: string): Observable<LabWorkflowEvent[]> {
    const url = requestId 
      ? `${this.apiUrl}/workflow-events?requestId=${requestId}`
      : `${this.apiUrl}/workflow-events`;
    
    return this.http.get<LabWorkflowEvent[]>(url, {
      headers: this.getHeaders()
    });
  }

  createWorkflowEvent(event: Partial<LabWorkflowEvent>): Observable<LabWorkflowEvent> {
    return this.http.post<LabWorkflowEvent>(`${this.apiUrl}/workflow-events`, event, {
      headers: this.getHeaders()
    });
  }

  // Doctor-Lab Communication
  sendUrgentRequest(requestId: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/urgent`, {
      message
    }, {
      headers: this.getHeaders()
    });
  }

  requestRush(requestId: string, reason: string, newDeadline?: Date): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/rush`, {
      reason,
      newDeadline
    }, {
      headers: this.getHeaders()
    });
  }

  reportQualityIssue(requestId: string, issueType: string, description: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/quality-issue`, {
      issueType,
      description
    }, {
      headers: this.getHeaders()
    });
  }

  // Analytics and Metrics
  getDoctorLabMetrics(dateFrom?: string, dateTo?: string): Observable<DoctorLabMetrics> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get<DoctorLabMetrics>(`${this.apiUrl}/metrics/doctor?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }

  getLabPerformanceMetrics(labStaffId?: string, dateFrom?: string, dateTo?: string): Observable<any> {
    const params = new URLSearchParams();
    if (labStaffId) params.append('labStaffId', labStaffId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get(`${this.apiUrl}/metrics/lab-performance?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }

  getTurnaroundTimeAnalysis(testType?: string, dateFrom?: string, dateTo?: string): Observable<any> {
    const params = new URLSearchParams();
    if (testType) params.append('testType', testType);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get(`${this.apiUrl}/analytics/turnaround-time?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }

  // Integration Workflows
  
  // Doctor creates lab request -> Notify lab staff
  notifyLabRequestCreated(requestId: string, patientId: string, patientName: string, testTypes: string[], priority: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/workflows/request-created`, {
      requestId,
      patientId,
      patientName,
      testTypes,
      priority
    }, {
      headers: this.getHeaders()
    });
  }

  // Lab staff updates status -> Notify doctor
  notifyDoctorStatusUpdate(requestId: string, status: string, notes?: string, estimatedCompletion?: Date): Observable<any> {
    return this.http.post(`${this.apiUrl}/workflows/status-update`, {
      requestId,
      status,
      notes,
      estimatedCompletion
    }, {
      headers: this.getHeaders()
    });
  }

  // Lab staff uploads results -> Notify doctor
  notifyResultsAvailable(requestId: string, resultSummary: any, criticalFindings?: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/workflows/results-available`, {
      requestId,
      resultSummary,
      criticalFindings
    }, {
      headers: this.getHeaders()
    });
  }

  // AI analysis complete -> Notify both doctor and lab staff
  notifyAiAnalysisComplete(requestId: string, aiResults: any, confidence: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/workflows/ai-analysis-complete`, {
      requestId,
      aiResults,
      confidence
    }, {
      headers: this.getHeaders()
    });
  }

  // Private helper methods
  private createNotification(notification: Partial<LabDoctorNotification>): void {
    const newNotification: LabDoctorNotification = {
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
      acknowledged: false,
      doctorName: '', // Will be filled by backend
      ...notification
    } as LabDoctorNotification;
    
    this.addNotification(newNotification);
  }

  private addNotification(notification: LabDoctorNotification): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...currentNotifications]);
  }

  private updateRequestStatus(status: LabRequestStatus): void {
    const currentStatuses = this.requestStatusSubject.value;
    const index = currentStatuses.findIndex(s => s.requestId === status.requestId);
    
    if (index !== -1) {
      currentStatuses[index] = status;
    } else {
      currentStatuses.push(status);
    }
    
    this.requestStatusSubject.next([...currentStatuses]);
  }

  private addWorkflowEvent(event: LabWorkflowEvent): void {
    const currentEvents = this.workflowEventsSubject.value;
    this.workflowEventsSubject.next([event, ...currentEvents]);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Utility methods
  getUnreadNotificationCount(): number {
    return this.notificationsSubject.value.filter(n => !n.read).length;
  }

  getCriticalNotificationCount(): number {
    return this.notificationsSubject.value.filter(n => n.priority === 'critical' && !n.acknowledged).length;
  }

  getPendingRequestCount(): number {
    return this.requestStatusSubject.value.filter(s => 
      s.status === 'received' || s.status === 'in_progress'
    ).length;
  }

  getOverdueRequestCount(): number {
    const now = new Date();
    return this.requestStatusSubject.value.filter(s => 
      s.estimatedCompletion && new Date(s.estimatedCompletion) < now && 
      s.status !== 'completed' && s.status !== 'cancelled'
    ).length;
  }

  // Cleanup
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}