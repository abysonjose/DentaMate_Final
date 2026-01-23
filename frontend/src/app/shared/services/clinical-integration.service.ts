import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';

// Shared interfaces for integration
export interface ClinicalStaff {
  id: string;
  name: string;
  role: 'doctor' | 'head-nurse' | 'nurse';
  status: 'available' | 'busy' | 'break' | 'offline';
  currentLocation?: string;
  currentPatient?: string;
  shiftStart?: string;
  shiftEnd?: string;
}

export interface PatientHandoff {
  id: string;
  patientId: string;
  patientName: string;
  tokenNumber: string;
  fromRole: string;
  fromStaffId: string;
  fromStaffName: string;
  toRole: string;
  toStaffId: string;
  toStaffName: string;
  handoffType: 'preparation-complete' | 'consultation-ready' | 'assistance-needed' | 'post-procedure';
  notes: string;
  timestamp: string;
  status: 'pending' | 'acknowledged' | 'completed';
  priority: 'normal' | 'urgent' | 'emergency';
}

export interface ClinicalMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  subject: string;
  message: string;
  messageType: 'info' | 'request' | 'urgent' | 'emergency';
  patientId?: string;
  patientName?: string;
  timestamp: string;
  read: boolean;
  acknowledged: boolean;
  attachments?: string[];
}

export interface TaskAssignment {
  id: string;
  title: string;
  description: string;
  assignedBy: string;
  assignedByName: string;
  assignedByRole: string;
  assignedTo: string;
  assignedToName: string;
  assignedToRole: string;
  patientId?: string;
  patientName?: string;
  taskType: 'preparation' | 'assistance' | 'documentation' | 'follow-up' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  dueTime?: string;
  estimatedDuration?: number;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface ClinicalAlert {
  id: string;
  alertType: 'patient-ready' | 'assistance-needed' | 'emergency' | 'equipment-issue' | 'delay';
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  roomId?: string;
  triggeredBy: string;
  triggeredByName: string;
  triggeredByRole: string;
  targetRoles: string[];
  targetStaffIds?: string[];
  priority: 'info' | 'warning' | 'urgent' | 'emergency';
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string[];
  resolvedAt?: string;
  resolvedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClinicalIntegrationService {
  private apiUrl = `${environment.apiUrl}/clinical-integration`;
  private socket: Socket;
  
  // Real-time data streams
  private staffStatusSubject = new BehaviorSubject<ClinicalStaff[]>([]);
  private handoffsSubject = new BehaviorSubject<PatientHandoff[]>([]);
  private messagesSubject = new BehaviorSubject<ClinicalMessage[]>([]);
  private tasksSubject = new BehaviorSubject<TaskAssignment[]>([]);
  private alertsSubject = new BehaviorSubject<ClinicalAlert[]>([]);
  
  // Event streams
  private newHandoffSubject = new Subject<PatientHandoff>();
  private newMessageSubject = new Subject<ClinicalMessage>();
  private newTaskSubject = new Subject<TaskAssignment>();
  private newAlertSubject = new Subject<ClinicalAlert>();
  
  // Public observables
  public staffStatus$ = this.staffStatusSubject.asObservable();
  public handoffs$ = this.handoffsSubject.asObservable();
  public messages$ = this.messagesSubject.asObservable();
  public tasks$ = this.tasksSubject.asObservable();
  public alerts$ = this.alertsSubject.asObservable();
  
  // Event observables
  public newHandoff$ = this.newHandoffSubject.asObservable();
  public newMessage$ = this.newMessageSubject.asObservable();
  public newTask$ = this.newTaskSubject.asObservable();
  public newAlert$ = this.newAlertSubject.asObservable();

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
    this.socket = io(`${environment.wsUrl}/clinical`, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Listen for real-time updates
    this.socket.on('staff-status-update', (staff: ClinicalStaff[]) => {
      this.staffStatusSubject.next(staff);
    });

    this.socket.on('new-handoff', (handoff: PatientHandoff) => {
      this.newHandoffSubject.next(handoff);
      const currentHandoffs = this.handoffsSubject.value;
      this.handoffsSubject.next([handoff, ...currentHandoffs]);
    });

    this.socket.on('new-message', (message: ClinicalMessage) => {
      this.newMessageSubject.next(message);
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([message, ...currentMessages]);
    });

    this.socket.on('new-task', (task: TaskAssignment) => {
      this.newTaskSubject.next(task);
      const currentTasks = this.tasksSubject.value;
      this.tasksSubject.next([task, ...currentTasks]);
    });

    this.socket.on('new-alert', (alert: ClinicalAlert) => {
      this.newAlertSubject.next(alert);
      const currentAlerts = this.alertsSubject.value;
      this.alertsSubject.next([alert, ...currentAlerts]);
    });

    this.socket.on('handoff-updated', (updatedHandoff: PatientHandoff) => {
      const currentHandoffs = this.handoffsSubject.value;
      const index = currentHandoffs.findIndex(h => h.id === updatedHandoff.id);
      if (index !== -1) {
        currentHandoffs[index] = updatedHandoff;
        this.handoffsSubject.next([...currentHandoffs]);
      }
    });

    this.socket.on('task-updated', (updatedTask: TaskAssignment) => {
      const currentTasks = this.tasksSubject.value;
      const index = currentTasks.findIndex(t => t.id === updatedTask.id);
      if (index !== -1) {
        currentTasks[index] = updatedTask;
        this.tasksSubject.next([...currentTasks]);
      }
    });
  }

  private loadInitialData(): void {
    this.getClinicalStaff().subscribe(staff => this.staffStatusSubject.next(staff));
    this.getPatientHandoffs().subscribe(handoffs => this.handoffsSubject.next(handoffs));
    this.getClinicalMessages().subscribe(messages => this.messagesSubject.next(messages));
    this.getTaskAssignments().subscribe(tasks => this.tasksSubject.next(tasks));
    this.getClinicalAlerts().subscribe(alerts => this.alertsSubject.next(alerts));
  }

  // Staff Management
  getClinicalStaff(): Observable<ClinicalStaff[]> {
    return this.http.get<ClinicalStaff[]>(`${this.apiUrl}/staff`, {
      headers: this.getHeaders()
    });
  }

  updateStaffStatus(status: string, location?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/staff/status`, {
      status,
      location
    }, {
      headers: this.getHeaders()
    });
  }

  // Patient Handoffs
  getPatientHandoffs(): Observable<PatientHandoff[]> {
    return this.http.get<PatientHandoff[]>(`${this.apiUrl}/handoffs`, {
      headers: this.getHeaders()
    });
  }

  createPatientHandoff(handoff: Partial<PatientHandoff>): Observable<PatientHandoff> {
    return this.http.post<PatientHandoff>(`${this.apiUrl}/handoffs`, handoff, {
      headers: this.getHeaders()
    });
  }

  acknowledgeHandoff(handoffId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/handoffs/${handoffId}/acknowledge`, {}, {
      headers: this.getHeaders()
    });
  }

  completeHandoff(handoffId: string, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/handoffs/${handoffId}/complete`, {
      notes
    }, {
      headers: this.getHeaders()
    });
  }

  // Clinical Messaging
  getClinicalMessages(): Observable<ClinicalMessage[]> {
    return this.http.get<ClinicalMessage[]>(`${this.apiUrl}/messages`, {
      headers: this.getHeaders()
    });
  }

  sendClinicalMessage(message: Partial<ClinicalMessage>): Observable<ClinicalMessage> {
    return this.http.post<ClinicalMessage>(`${this.apiUrl}/messages`, message, {
      headers: this.getHeaders()
    });
  }

  markMessageAsRead(messageId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/messages/${messageId}/read`, {}, {
      headers: this.getHeaders()
    });
  }

  acknowledgeMessage(messageId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/messages/${messageId}/acknowledge`, {}, {
      headers: this.getHeaders()
    });
  }

  // Task Management
  getTaskAssignments(): Observable<TaskAssignment[]> {
    return this.http.get<TaskAssignment[]>(`${this.apiUrl}/tasks`, {
      headers: this.getHeaders()
    });
  }

  createTaskAssignment(task: Partial<TaskAssignment>): Observable<TaskAssignment> {
    return this.http.post<TaskAssignment>(`${this.apiUrl}/tasks`, task, {
      headers: this.getHeaders()
    });
  }

  updateTaskStatus(taskId: string, status: string, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/tasks/${taskId}/status`, {
      status,
      notes
    }, {
      headers: this.getHeaders()
    });
  }

  assignTask(taskId: string, assignedTo: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/tasks/${taskId}/assign`, {
      assignedTo
    }, {
      headers: this.getHeaders()
    });
  }

  // Clinical Alerts
  getClinicalAlerts(): Observable<ClinicalAlert[]> {
    return this.http.get<ClinicalAlert[]>(`${this.apiUrl}/alerts`, {
      headers: this.getHeaders()
    });
  }

  createClinicalAlert(alert: Partial<ClinicalAlert>): Observable<ClinicalAlert> {
    return this.http.post<ClinicalAlert>(`${this.apiUrl}/alerts`, alert, {
      headers: this.getHeaders()
    });
  }

  acknowledgeAlert(alertId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/alerts/${alertId}/acknowledge`, {}, {
      headers: this.getHeaders()
    });
  }

  resolveAlert(alertId: string, resolution?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/alerts/${alertId}/resolve`, {
      resolution
    }, {
      headers: this.getHeaders()
    });
  }

  // Quick Actions for Common Workflows
  
  // Nurse -> Doctor: Patient Ready
  notifyPatientReady(patientId: string, patientName: string, doctorId: string, notes?: string): Observable<PatientHandoff> {
    return this.createPatientHandoff({
      patientId,
      patientName,
      toStaffId: doctorId,
      toRole: 'doctor',
      handoffType: 'consultation-ready',
      notes: notes || 'Patient preparation completed and ready for consultation',
      priority: 'normal'
    });
  }

  // Doctor -> Nurse: Request Assistance
  requestNurseAssistance(patientId: string, patientName: string, nurseId: string, assistanceType: string, notes?: string): Observable<TaskAssignment> {
    return this.createTaskAssignment({
      title: `Assistance Required - ${assistanceType}`,
      description: notes || `Doctor requests ${assistanceType} for patient ${patientName}`,
      assignedTo: nurseId,
      assignedToRole: 'nurse',
      patientId,
      patientName,
      taskType: 'assistance',
      priority: 'high'
    });
  }

  // Head Nurse -> Nurse: Task Assignment
  assignNurseTask(nurseId: string, nurseName: string, taskTitle: string, taskDescription: string, patientId?: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): Observable<TaskAssignment> {
    return this.createTaskAssignment({
      title: taskTitle,
      description: taskDescription,
      assignedTo: nurseId,
      assignedToName: nurseName,
      assignedToRole: 'nurse',
      patientId,
      taskType: 'preparation',
      priority
    });
  }

  // Emergency Alert
  triggerEmergencyAlert(patientId: string, patientName: string, roomId: string, description: string): Observable<ClinicalAlert> {
    return this.createClinicalAlert({
      alertType: 'emergency',
      title: 'Emergency Assistance Required',
      message: description,
      patientId,
      patientName,
      roomId,
      targetRoles: ['doctor', 'head-nurse', 'nurse'],
      priority: 'emergency'
    });
  }

  // Equipment Issue Alert
  reportEquipmentIssue(roomId: string, equipmentName: string, issueDescription: string): Observable<ClinicalAlert> {
    return this.createClinicalAlert({
      alertType: 'equipment-issue',
      title: `Equipment Issue - ${equipmentName}`,
      message: issueDescription,
      roomId,
      targetRoles: ['head-nurse'],
      priority: 'urgent'
    });
  }

  // Utility Methods
  getUnreadMessageCount(): number {
    return this.messagesSubject.value.filter(m => !m.read).length;
  }

  getPendingTaskCount(): number {
    return this.tasksSubject.value.filter(t => t.status === 'pending').length;
  }

  getActiveAlertCount(): number {
    return this.alertsSubject.value.filter(a => !a.acknowledged).length;
  }

  getPendingHandoffCount(): number {
    return this.handoffsSubject.value.filter(h => h.status === 'pending').length;
  }

  // Cleanup
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}