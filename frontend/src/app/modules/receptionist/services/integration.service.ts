import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { io, Socket } from 'socket.io-client';

export interface CrossModuleEvent {
  type: 'appointment_created' | 'appointment_updated' | 'patient_checked_in' | 'token_generated' | 'queue_updated' | 'doctor_status_changed';
  source: 'receptionist' | 'doctor' | 'patient' | 'branch-admin' | 'head-nurse';
  target: string[];
  data: any;
  timestamp: Date;
  branchId: string;
}

export interface DoctorStatus {
  doctorId: string;
  doctorName: string;
  status: 'available' | 'busy' | 'break' | 'emergency' | 'offline';
  currentPatient?: string;
  nextAvailable?: Date;
  queueLength: number;
  averageConsultationTime: number;
  lastUpdated: Date;
}

export interface PatientStatus {
  patientId: string;
  patientName: string;
  status: 'registered' | 'checked_in' | 'in_consultation' | 'completed' | 'no_show';
  currentLocation?: string;
  appointmentId?: string;
  tokenNumber?: string;
  estimatedTime?: Date;
  lastUpdated: Date;
}

export interface BranchMetrics {
  branchId: string;
  totalPatients: number;
  activeAppointments: number;
  waitingPatients: number;
  availableDoctors: number;
  averageWaitTime: number;
  queueEfficiency: number;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {
  private readonly apiUrl = `${environment.apiUrl}/integration`;
  private readonly wsUrl = `${environment.wsUrl}`;
  
  private socket: Socket;
  private eventsSubject = new Subject<CrossModuleEvent>();
  public events$ = this.eventsSubject.asObservable();
  
  private doctorStatusSubject = new BehaviorSubject<DoctorStatus[]>([]);
  public doctorStatus$ = this.doctorStatusSubject.asObservable();
  
  private patientStatusSubject = new BehaviorSubject<PatientStatus[]>([]);
  public patientStatus$ = this.patientStatusSubject.asObservable();
  
  private branchMetricsSubject = new BehaviorSubject<BranchMetrics | null>(null);
  public branchMetrics$ = this.branchMetricsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeWebSocketConnection();
  }

  // WebSocket Connection Management
  private initializeWebSocketConnection(): void {
    this.socket = io(this.wsUrl, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('authToken'),
        role: 'receptionist',
        branchId: localStorage.getItem('currentBranchId')
      }
    });

    this.socket.on('connect', () => {
      console.log('Integration WebSocket connected');
      this.joinBranchRoom();
    });

    this.socket.on('cross_module_event', (event: CrossModuleEvent) => {
      this.handleCrossModuleEvent(event);
    });

    this.socket.on('doctor_status_update', (status: DoctorStatus) => {
      this.updateDoctorStatus(status);
    });

    this.socket.on('patient_status_update', (status: PatientStatus) => {
      this.updatePatientStatus(status);
    });

    this.socket.on('branch_metrics_update', (metrics: BranchMetrics) => {
      this.branchMetricsSubject.next(metrics);
    });

    this.socket.on('disconnect', () => {
      console.log('Integration WebSocket disconnected');
    });
  }

  private joinBranchRoom(): void {
    const branchId = localStorage.getItem('currentBranchId');
    if (branchId) {
      this.socket.emit('join_branch', { branchId });
    }
  }

  private handleCrossModuleEvent(event: CrossModuleEvent): void {
    this.eventsSubject.next(event);
    
    // Handle specific event types
    switch (event.type) {
      case 'appointment_created':
        this.handleAppointmentCreated(event.data);
        break;
      case 'appointment_updated':
        this.handleAppointmentUpdated(event.data);
        break;
      case 'patient_checked_in':
        this.handlePatientCheckedIn(event.data);
        break;
      case 'token_generated':
        this.handleTokenGenerated(event.data);
        break;
      case 'queue_updated':
        this.handleQueueUpdated(event.data);
        break;
      case 'doctor_status_changed':
        this.handleDoctorStatusChanged(event.data);
        break;
    }
  }

  // Appointment Service Integration
  integrateWithAppointmentService(): Observable<any> {
    return this.http.get(`${this.apiUrl}/appointment-service/status`);
  }

  syncAppointmentData(): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointment-service/sync`, {
      branchId: localStorage.getItem('currentBranchId')
    });
  }

  notifyAppointmentCreated(appointmentData: any): void {
    const event: CrossModuleEvent = {
      type: 'appointment_created',
      source: 'receptionist',
      target: ['doctor', 'patient', 'branch-admin', 'head-nurse'],
      data: appointmentData,
      timestamp: new Date(),
      branchId: localStorage.getItem('currentBranchId') || ''
    };
    
    this.socket.emit('broadcast_event', event);
  }

  notifyAppointmentUpdated(appointmentData: any): void {
    const event: CrossModuleEvent = {
      type: 'appointment_updated',
      source: 'receptionist',
      target: ['doctor', 'patient', 'branch-admin', 'head-nurse'],
      data: appointmentData,
      timestamp: new Date(),
      branchId: localStorage.getItem('currentBranchId') || ''
    };
    
    this.socket.emit('broadcast_event', event);
  }

  // Token Queue Realtime Integration
  integrateWithTokenQueueService(): Observable<any> {
    return this.http.get(`${this.apiUrl}/token-queue-service/status`);
  }

  syncQueueData(): Observable<any> {
    return this.http.post(`${this.apiUrl}/token-queue-service/sync`, {
      branchId: localStorage.getItem('currentBranchId')
    });
  }

  notifyTokenGenerated(tokenData: any): void {
    const event: CrossModuleEvent = {
      type: 'token_generated',
      source: 'receptionist',
      target: ['doctor', 'patient', 'branch-admin', 'head-nurse'],
      data: tokenData,
      timestamp: new Date(),
      branchId: localStorage.getItem('currentBranchId') || ''
    };
    
    this.socket.emit('broadcast_event', event);
  }

  notifyQueueUpdated(queueData: any): void {
    const event: CrossModuleEvent = {
      type: 'queue_updated',
      source: 'receptionist',
      target: ['doctor', 'patient', 'branch-admin', 'head-nurse'],
      data: queueData,
      timestamp: new Date(),
      branchId: localStorage.getItem('currentBranchId') || ''
    };
    
    this.socket.emit('broadcast_event', event);
  }

  // Doctor Module Integration
  getDoctorStatuses(): Observable<DoctorStatus[]> {
    return this.http.get<DoctorStatus[]>(`${this.apiUrl}/doctor-status`, {
      params: new HttpParams().set('branchId', localStorage.getItem('currentBranchId') || '')
    });
  }

  updateDoctorAvailability(doctorId: string, available: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/doctor-status/${doctorId}`, {
      available,
      updatedBy: 'receptionist'
    });
  }

  requestDoctorSchedule(doctorId: string, date: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/doctor-schedule/${doctorId}`, {
      params: new HttpParams().set('date', date.toISOString().split('T')[0])
    });
  }

  notifyDoctorOfPatientArrival(doctorId: string, patientData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/notify-doctor`, {
      doctorId,
      type: 'patient_arrival',
      data: patientData
    });
  }

  // Patient Module Integration
  getPatientStatuses(): Observable<PatientStatus[]> {
    return this.http.get<PatientStatus[]>(`${this.apiUrl}/patient-status`, {
      params: new HttpParams().set('branchId', localStorage.getItem('currentBranchId') || '')
    });
  }

  updatePatientStatus(patientId: string, status: string, location?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/patient-status/${patientId}`, {
      status,
      location,
      updatedBy: 'receptionist'
    });
  }

  notifyPatientOfUpdate(patientId: string, message: string, type: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/notify-patient`, {
      patientId,
      message,
      type,
      source: 'receptionist'
    });
  }

  getPatientPreferences(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/patient-preferences/${patientId}`);
  }

  // Branch Admin Integration
  reportToBranchAdmin(reportType: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/branch-admin/report`, {
      type: reportType,
      data,
      reportedBy: 'receptionist',
      timestamp: new Date()
    });
  }

  requestBranchAdminApproval(requestType: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/branch-admin/approval-request`, {
      type: requestType,
      data,
      requestedBy: 'receptionist',
      timestamp: new Date()
    });
  }

  getBranchPolicies(): Observable<any> {
    return this.http.get(`${this.apiUrl}/branch-policies`, {
      params: new HttpParams().set('branchId', localStorage.getItem('currentBranchId') || '')
    });
  }

  // Head Nurse Integration
  requestNurseAssistance(patientId: string, assistanceType: string, priority: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/nurse-assistance-request`, {
      patientId,
      assistanceType,
      priority,
      requestedBy: 'receptionist',
      timestamp: new Date()
    });
  }

  getNurseAvailability(): Observable<any> {
    return this.http.get(`${this.apiUrl}/nurse-availability`, {
      params: new HttpParams().set('branchId', localStorage.getItem('currentBranchId') || '')
    });
  }

  reportToHeadNurse(reportType: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/head-nurse/report`, {
      type: reportType,
      data,
      reportedBy: 'receptionist',
      timestamp: new Date()
    });
  }

  // Real-time Data Synchronization
  syncAllData(): Observable<any> {
    return combineLatest([
      this.syncAppointmentData(),
      this.syncQueueData(),
      this.getDoctorStatuses(),
      this.getPatientStatuses()
    ]).pipe(
      map(([appointments, queues, doctors, patients]) => ({
        appointments,
        queues,
        doctors,
        patients,
        syncedAt: new Date()
      }))
    );
  }

  // Event Handlers
  private handleAppointmentCreated(data: any): void {
    // Update local appointment data
    console.log('Appointment created:', data);
  }

  private handleAppointmentUpdated(data: any): void {
    // Update local appointment data
    console.log('Appointment updated:', data);
  }

  private handlePatientCheckedIn(data: any): void {
    // Update patient status
    this.updatePatientStatusLocally(data.patientId, 'checked_in');
  }

  private handleTokenGenerated(data: any): void {
    // Update queue display
    console.log('Token generated:', data);
  }

  private handleQueueUpdated(data: any): void {
    // Update queue status
    console.log('Queue updated:', data);
  }

  private handleDoctorStatusChanged(data: any): void {
    // Update doctor status
    this.updateDoctorStatus(data);
  }

  // Local State Management
  private updateDoctorStatus(status: DoctorStatus): void {
    const currentStatuses = this.doctorStatusSubject.value;
    const index = currentStatuses.findIndex(s => s.doctorId === status.doctorId);
    
    if (index !== -1) {
      currentStatuses[index] = status;
    } else {
      currentStatuses.push(status);
    }
    
    this.doctorStatusSubject.next([...currentStatuses]);
  }

  private updatePatientStatus(status: PatientStatus): void {
    const currentStatuses = this.patientStatusSubject.value;
    const index = currentStatuses.findIndex(s => s.patientId === status.patientId);
    
    if (index !== -1) {
      currentStatuses[index] = status;
    } else {
      currentStatuses.push(status);
    }
    
    this.patientStatusSubject.next([...currentStatuses]);
  }

  private updatePatientStatusLocally(patientId: string, status: string): void {
    const currentStatuses = this.patientStatusSubject.value;
    const patientStatus = currentStatuses.find(s => s.patientId === patientId);
    
    if (patientStatus) {
      patientStatus.status = status as any;
      patientStatus.lastUpdated = new Date();
      this.patientStatusSubject.next([...currentStatuses]);
    }
  }

  // Emergency Integration
  triggerEmergencyAlert(alertData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/emergency-alert`, {
      ...alertData,
      triggeredBy: 'receptionist',
      branchId: localStorage.getItem('currentBranchId'),
      timestamp: new Date()
    });
  }

  // Analytics Integration
  sendAnalyticsEvent(eventType: string, data: any): void {
    this.http.post(`${this.apiUrl}/analytics/event`, {
      eventType,
      data,
      source: 'receptionist',
      branchId: localStorage.getItem('currentBranchId'),
      timestamp: new Date()
    }).subscribe();
  }

  // Cleanup
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Utility Methods
  getBranchId(): string {
    return localStorage.getItem('currentBranchId') || '';
  }

  getUserId(): string {
    return localStorage.getItem('currentUserId') || '';
  }

  getUserRole(): string {
    return 'receptionist';
  }

  // Health Check
  checkServiceHealth(): Observable<{
    appointmentService: boolean;
    tokenQueueService: boolean;
    doctorModule: boolean;
    patientModule: boolean;
    branchAdminModule: boolean;
    headNurseModule: boolean;
  }> {
    return this.http.get<{
      appointmentService: boolean;
      tokenQueueService: boolean;
      doctorModule: boolean;
      patientModule: boolean;
      branchAdminModule: boolean;
      headNurseModule: boolean;
    }>(`${this.apiUrl}/health-check`);
  }
}