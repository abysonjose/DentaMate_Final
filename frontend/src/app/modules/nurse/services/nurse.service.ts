import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClinicalIntegrationService, PatientHandoff, ClinicalMessage, TaskAssignment, ClinicalAlert } from '../../../shared/services/clinical-integration.service';

export interface ShiftDetails {
  id: string;
  nurseId: string;
  date: string;
  startTime: string;
  endTime: string;
  assignedDoctors: Doctor[];
  assignedRooms: TreatmentRoom[];
  status: 'scheduled' | 'active' | 'completed';
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  roomId: string;
  status: 'available' | 'busy' | 'break';
}

export interface TreatmentRoom {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  appointmentId: string;
  doctorId: string;
  roomId: string;
  tokenNumber: string;
  status: 'waiting' | 'preparing' | 'ready' | 'in-consultation' | 'completed';
  preparationStatus: PreparationStatus;
  arrivalTime: string;
  estimatedTime: string;
}

export interface PreparationStatus {
  chairSetup: boolean;
  instrumentTray: boolean;
  ppeReadiness: boolean;
  patientReady: boolean;
  notes: string;
}

export interface QueueStatus {
  doctorId: string;
  currentToken: string;
  nextPatient: Patient | null;
  waitingCount: number;
  estimatedWaitTime: number;
}

export interface NursingNote {
  id: string;
  patientId: string;
  appointmentId: string;
  nurseId: string;
  timestamp: string;
  type: 'vital-signs' | 'observation' | 'care-instruction' | 'discomfort';
  content: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };
}

export interface AssistanceActivity {
  id: string;
  patientId: string;
  appointmentId: string;
  nurseId: string;
  timestamp: string;
  type: 'chairside-support' | 'instrument-handling' | 'post-procedure';
  description: string;
  duration: number;
}

export interface SupplyItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  usedQuantity: number;
  status: 'available' | 'low-stock' | 'out-of-stock' | 'damaged';
}

export interface SterilizationTask {
  id: string;
  instrumentSet: string;
  roomId: string;
  status: 'pending' | 'in-progress' | 'completed';
  timestamp: string;
  nurseId: string;
  notes: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedBy: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  dueTime: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NurseService {
  private apiUrl = `${environment.apiUrl}/nurse`;
  private currentShiftSubject = new BehaviorSubject<ShiftDetails | null>(null);
  private patientsSubject = new BehaviorSubject<Patient[]>([]);
  private queueStatusSubject = new BehaviorSubject<QueueStatus[]>([]);
  private tasksSubject = new BehaviorSubject<Task[]>([]);

  public currentShift$ = this.currentShiftSubject.asObservable();
  public patients$ = this.patientsSubject.asObservable();
  public queueStatus$ = this.queueStatusSubject.asObservable();
  public tasks$ = this.tasksSubject.asObservable();

  constructor(private http: HttpClient, private clinicalIntegration: ClinicalIntegrationService) {
    this.initializeWebSocket();
    this.subscribeToIntegrationEvents();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private initializeWebSocket(): void {
    // WebSocket implementation for real-time updates
    // This would connect to the token-queue-realtime-service
  }

  private subscribeToIntegrationEvents(): void {
    // Subscribe to clinical integration events
    this.clinicalIntegration.newTask$.subscribe(task => {
      if (task.assignedToRole === 'nurse') {
        const currentTasks = this.tasksSubject.value;
        this.tasksSubject.next([task, ...currentTasks]);
      }
    });

    this.clinicalIntegration.newHandoff$.subscribe(handoff => {
      if (handoff.toRole === 'nurse') {
        // Handle incoming patient handoffs
        this.handleIncomingHandoff(handoff);
      }
    });

    this.clinicalIntegration.newAlert$.subscribe(alert => {
      if (alert.targetRoles.includes('nurse')) {
        // Handle clinical alerts
        this.handleClinicalAlert(alert);
      }
    });
  }

  private handleIncomingHandoff(handoff: PatientHandoff): void {
    // Update patient status based on handoff
    const currentPatients = this.patientsSubject.value;
    const patientIndex = currentPatients.findIndex(p => p.id === handoff.patientId);
    
    if (patientIndex !== -1) {
      const updatedPatient = { ...currentPatients[patientIndex] };
      
      switch (handoff.handoffType) {
        case 'preparation-complete':
          updatedPatient.status = 'ready';
          break;
        case 'consultation-ready':
          updatedPatient.status = 'waiting';
          break;
        case 'assistance-needed':
          updatedPatient.status = 'in-consultation';
          break;
      }
      
      currentPatients[patientIndex] = updatedPatient;
      this.patientsSubject.next([...currentPatients]);
    }
  }

  private handleClinicalAlert(alert: ClinicalAlert): void {
    // Handle different types of clinical alerts
    console.log('Received clinical alert:', alert);
    // Could trigger notifications, update UI, etc.
  }

  // Shift Management
  getCurrentShift(): Observable<ShiftDetails> {
    return this.http.get<ShiftDetails>(`${this.apiUrl}/shift/current`, {
      headers: this.getHeaders()
    });
  }

  // Patient Management
  getAssignedPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.apiUrl}/patients/assigned`, {
      headers: this.getHeaders()
    });
  }

  updatePatientPreparation(patientId: string, preparation: PreparationStatus): Observable<any> {
    return this.http.put(`${this.apiUrl}/patients/${patientId}/preparation`, preparation, {
      headers: this.getHeaders()
    });
  }

  markPatientReady(patientId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients/${patientId}/ready`, {}, {
      headers: this.getHeaders()
    });
  }

  // Queue Awareness
  getQueueStatus(): Observable<QueueStatus[]> {
    return this.http.get<QueueStatus[]>(`${this.apiUrl}/queue/status`, {
      headers: this.getHeaders()
    });
  }

  // Nursing Notes
  createNursingNote(note: Partial<NursingNote>): Observable<NursingNote> {
    return this.http.post<NursingNote>(`${this.apiUrl}/notes`, note, {
      headers: this.getHeaders()
    });
  }

  getNursingNotes(patientId: string): Observable<NursingNote[]> {
    return this.http.get<NursingNote[]>(`${this.apiUrl}/notes/patient/${patientId}`, {
      headers: this.getHeaders()
    });
  }

  // Assistance Activities
  logAssistanceActivity(activity: Partial<AssistanceActivity>): Observable<AssistanceActivity> {
    return this.http.post<AssistanceActivity>(`${this.apiUrl}/assistance`, activity, {
      headers: this.getHeaders()
    });
  }

  getAssistanceHistory(patientId: string): Observable<AssistanceActivity[]> {
    return this.http.get<AssistanceActivity[]>(`${this.apiUrl}/assistance/patient/${patientId}`, {
      headers: this.getHeaders()
    });
  }

  // Medical Records (Read-only)
  getPatientMedicalRecord(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/medical-records/${patientId}`, {
      headers: this.getHeaders()
    });
  }

  // Supply Management
  getAssignedSupplies(): Observable<SupplyItem[]> {
    return this.http.get<SupplyItem[]>(`${this.apiUrl}/supplies/assigned`, {
      headers: this.getHeaders()
    });
  }

  reportSupplyUsage(supplyId: string, quantity: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/supplies/${supplyId}/usage`, { quantity }, {
      headers: this.getHeaders()
    });
  }

  reportSupplyIssue(supplyId: string, issue: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/supplies/${supplyId}/issue`, { issue }, {
      headers: this.getHeaders()
    });
  }

  // Sterilization
  getSterilizationTasks(): Observable<SterilizationTask[]> {
    return this.http.get<SterilizationTask[]>(`${this.apiUrl}/sterilization/tasks`, {
      headers: this.getHeaders()
    });
  }

  confirmSterilization(taskId: string, notes: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sterilization/${taskId}/confirm`, { notes }, {
      headers: this.getHeaders()
    });
  }

  // Task Management
  getAssignedTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/tasks/assigned`, {
      headers: this.getHeaders()
    });
  }

  updateTaskStatus(taskId: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/tasks/${taskId}/status`, { status }, {
      headers: this.getHeaders()
    });
  }

  // Communication
  sendMessage(recipientId: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/communication/send`, {
      recipientId,
      message
    }, {
      headers: this.getHeaders()
    });
  }

  getMessages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/communication/messages`, {
      headers: this.getHeaders()
    });
  }

  // Notifications
  getNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notifications`, {
      headers: this.getHeaders()
    });
  }

  markNotificationRead(notificationId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/${notificationId}/read`, {}, {
      headers: this.getHeaders()
    });
  }

  // Integration Methods for Clinical Workflow

  // Notify doctor that patient is ready
  notifyDoctorPatientReady(patientId: string, doctorId: string, notes?: string): Observable<any> {
    const patient = this.patientsSubject.value.find(p => p.id === patientId);
    if (patient) {
      return this.clinicalIntegration.notifyPatientReady(
        patientId,
        patient.name,
        doctorId,
        notes
      );
    }
    throw new Error('Patient not found');
  }

  // Request assistance from head nurse
  requestHeadNurseAssistance(patientId: string, assistanceType: string, notes: string): Observable<any> {
    const patient = this.patientsSubject.value.find(p => p.id === patientId);
    if (patient) {
      return this.clinicalIntegration.createTaskAssignment({
        title: `Assistance Required - ${assistanceType}`,
        description: notes,
        assignedToRole: 'head-nurse',
        patientId,
        patientName: patient.name,
        taskType: 'assistance',
        priority: 'high'
      });
    }
    throw new Error('Patient not found');
  }

  // Send message to doctor
  sendMessageToDoctor(doctorId: string, subject: string, message: string, patientId?: string, messageType: 'info' | 'request' | 'urgent' = 'info'): Observable<any> {
    const patient = patientId ? this.patientsSubject.value.find(p => p.id === patientId) : undefined;
    
    return this.clinicalIntegration.sendClinicalMessage({
      recipientId: doctorId,
      recipientRole: 'doctor',
      subject,
      message,
      messageType,
      patientId,
      patientName: patient?.name
    });
  }

  // Send message to head nurse
  sendMessageToHeadNurse(headNurseId: string, subject: string, message: string, patientId?: string, messageType: 'info' | 'request' | 'urgent' = 'info'): Observable<any> {
    const patient = patientId ? this.patientsSubject.value.find(p => p.id === patientId) : undefined;
    
    return this.clinicalIntegration.sendClinicalMessage({
      recipientId: headNurseId,
      recipientRole: 'head-nurse',
      subject,
      message,
      messageType,
      patientId,
      patientName: patient?.name
    });
  }

  // Report equipment issue
  reportEquipmentIssue(roomId: string, equipmentName: string, issueDescription: string): Observable<any> {
    return this.clinicalIntegration.reportEquipmentIssue(roomId, equipmentName, issueDescription);
  }

  // Trigger emergency alert
  triggerEmergencyAlert(patientId: string, roomId: string, description: string): Observable<any> {
    const patient = this.patientsSubject.value.find(p => p.id === patientId);
    if (patient) {
      return this.clinicalIntegration.triggerEmergencyAlert(
        patientId,
        patient.name,
        roomId,
        description
      );
    }
    throw new Error('Patient not found');
  }

  // Acknowledge handoff from doctor or head nurse
  acknowledgeHandoff(handoffId: string): Observable<any> {
    return this.clinicalIntegration.acknowledgeHandoff(handoffId);
  }

  // Complete handoff
  completeHandoff(handoffId: string, notes?: string): Observable<any> {
    return this.clinicalIntegration.completeHandoff(handoffId, notes);
  }

  // Update own status for other staff to see
  updateMyStatus(status: 'available' | 'busy' | 'break', location?: string): Observable<any> {
    return this.clinicalIntegration.updateStaffStatus(status, location);
  }

  // Get clinical integration data
  getClinicalMessages(): Observable<ClinicalMessage[]> {
    return this.clinicalIntegration.messages$;
  }

  getTaskAssignments(): Observable<TaskAssignment[]> {
    return this.clinicalIntegration.tasks$;
  }

  getClinicalAlerts(): Observable<ClinicalAlert[]> {
    return this.clinicalIntegration.alerts$;
  }

  getPatientHandoffs(): Observable<PatientHandoff[]> {
    return this.clinicalIntegration.handoffs$;
  }

  // Get integration counts for dashboard
  getUnreadMessageCount(): number {
    return this.clinicalIntegration.getUnreadMessageCount();
  }

  getPendingTaskCount(): number {
    return this.clinicalIntegration.getPendingTaskCount();
  }

  getActiveAlertCount(): number {
    return this.clinicalIntegration.getActiveAlertCount();
  }

  getPendingHandoffCount(): number {
    return this.clinicalIntegration.getPendingHandoffCount();
  }
}