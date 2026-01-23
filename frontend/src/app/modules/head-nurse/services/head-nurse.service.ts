import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ClinicalIntegrationService, PatientHandoff, ClinicalMessage, TaskAssignment, ClinicalAlert } from '../../../shared/services/clinical-integration.service';

export interface NursingStaff {
  id: string;
  name: string;
  role: 'nurse' | 'dental_assistant';
  status: 'on_duty' | 'off_duty' | 'break' | 'assigned';
  currentAssignment?: string;
  shiftStart: string;
  shiftEnd: string;
  workload: number;
  skills: string[];
}

export interface PatientFlowStatus {
  id: string;
  patientName: string;
  tokenNumber: string;
  status: 'waiting' | 'in_preparation' | 'in_consultation' | 'completed';
  doctorAssigned?: string;
  nurseAssigned?: string;
  roomNumber?: string;
  estimatedTime?: string;
  priority: 'normal' | 'urgent' | 'emergency';
}

export interface TreatmentAssistance {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  nurseId: string;
  nurseName: string;
  roomNumber: string;
  assistanceType: string;
  notes: string;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'clinical_consumables' | 'dental_supplies' | 'hygiene_sterilization' | 'room_equipment';
  currentStock: number;
  minimumStock: number;
  status: 'ok' | 'low' | 'critical';
  expiryDate?: Date;
  location: string;
}

export interface ComplianceChecklist {
  id: string;
  category: 'ppe_usage' | 'sterilization' | 'waste_disposal' | 'room_preparation';
  items: ComplianceItem[];
  completedBy?: string;
  completedAt?: Date;
  status: 'pending' | 'completed' | 'overdue';
}

export interface ComplianceItem {
  id: string;
  description: string;
  completed: boolean;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HeadNurseService {
  private apiUrl = `${environment.apiUrl}/head-nurse`;
  
  // Real-time data subjects
  private nursingStaffSubject = new BehaviorSubject<NursingStaff[]>([]);
  private patientFlowSubject = new BehaviorSubject<PatientFlowStatus[]>([]);
  
  public nursingStaff$ = this.nursingStaffSubject.asObservable();
  public patientFlow$ = this.patientFlowSubject.asObservable();

  constructor(private http: HttpClient, private clinicalIntegration: ClinicalIntegrationService) {
    this.initializeRealTimeUpdates();
    this.subscribeToIntegrationEvents();
  }

  // Dashboard Overview
  getDashboardOverview(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/overview`);
  }

  // Nursing Staff Management
  getNursingStaff(): Observable<NursingStaff[]> {
    return this.http.get<NursingStaff[]>(`${this.apiUrl}/nursing-staff`);
  }

  assignNurseToDoctor(nurseId: string, doctorId: string, roomNumber: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/nursing-staff/assign`, {
      nurseId,
      doctorId,
      roomNumber
    });
  }

  updateNurseStatus(nurseId: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/nursing-staff/${nurseId}/status`, { status });
  }

  // Patient Flow Monitoring
  getPatientFlow(): Observable<PatientFlowStatus[]> {
    return this.http.get<PatientFlowStatus[]>(`${this.apiUrl}/patient-flow`);
  }

  updatePatientPreparationStatus(patientId: string, status: string, notes?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/patient-flow/${patientId}/preparation`, {
      status,
      notes
    });
  }

  // Treatment Assistance
  getTreatmentAssistanceRecords(): Observable<TreatmentAssistance[]> {
    return this.http.get<TreatmentAssistance[]>(`${this.apiUrl}/treatment-assistance`);
  }

  createTreatmentAssistanceRecord(record: Partial<TreatmentAssistance>): Observable<TreatmentAssistance> {
    return this.http.post<TreatmentAssistance>(`${this.apiUrl}/treatment-assistance`, record);
  }

  updateTreatmentAssistanceRecord(id: string, updates: Partial<TreatmentAssistance>): Observable<TreatmentAssistance> {
    return this.http.patch<TreatmentAssistance>(`${this.apiUrl}/treatment-assistance/${id}`, updates);
  }

  // Inventory Management
  getInventoryItems(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/inventory`);
  }

  createInventoryRequest(itemId: string, quantity: number, urgency: string, notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/inventory/request`, {
      itemId,
      quantity,
      urgency,
      notes
    });
  }

  // Compliance Tracking
  getComplianceChecklists(): Observable<ComplianceChecklist[]> {
    return this.http.get<ComplianceChecklist[]>(`${this.apiUrl}/compliance/checklists`);
  }

  updateComplianceChecklist(checklistId: string, checklist: ComplianceChecklist): Observable<ComplianceChecklist> {
    return this.http.patch<ComplianceChecklist>(`${this.apiUrl}/compliance/checklists/${checklistId}`, checklist);
  }

  // Communication
  sendMessage(recipientId: string, message: string, priority: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/communication/send`, {
      recipientId,
      message,
      priority
    });
  }

  getMessages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/communication/messages`);
  }

  // Reports
  getNursingWorkloadReport(startDate: Date, endDate: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/nursing-workload`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  }

  getPatientTurnaroundReport(startDate: Date, endDate: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/patient-turnaround`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  }

  // Real-time updates simulation
  private initializeRealTimeUpdates(): void {
    // In a real application, this would connect to WebSocket or Server-Sent Events
    setInterval(() => {
      this.refreshNursingStaff();
      this.refreshPatientFlow();
    }, 30000); // Refresh every 30 seconds
  }

  private subscribeToIntegrationEvents(): void {
    // Subscribe to clinical integration events
    this.clinicalIntegration.newTask$.subscribe(task => {
      if (task.assignedToRole === 'head-nurse') {
        // Handle incoming tasks from doctors or nurses
        this.handleIncomingTask(task);
      }
    });

    this.clinicalIntegration.newMessage$.subscribe(message => {
      if (message.recipientRole === 'head-nurse') {
        // Handle incoming messages
        this.handleIncomingMessage(message);
      }
    });

    this.clinicalIntegration.newAlert$.subscribe(alert => {
      if (alert.targetRoles.includes('head-nurse')) {
        // Handle clinical alerts
        this.handleClinicalAlert(alert);
      }
    });
  }

  private handleIncomingTask(task: TaskAssignment): void {
    // Handle task assignment from doctors or system
    console.log('New task assigned to head nurse:', task);
    // Could trigger notifications, update UI, etc.
  }

  private handleIncomingMessage(message: ClinicalMessage): void {
    // Handle incoming messages from doctors or nurses
    console.log('New message for head nurse:', message);
    // Could trigger notifications, update UI, etc.
  }

  private handleClinicalAlert(alert: ClinicalAlert): void {
    // Handle clinical alerts
    console.log('New clinical alert for head nurse:', alert);
    // Could trigger notifications, update UI, etc.
  }

  private refreshNursingStaff(): void {
    this.getNursingStaff().subscribe(staff => {
      this.nursingStaffSubject.next(staff);
    });
  }

  private refreshPatientFlow(): void {
    this.getPatientFlow().subscribe(flow => {
      this.patientFlowSubject.next(flow);
    });
  }

  // Integration Methods for Clinical Workflow

  // Assign nurse to doctor with notification
  assignNurseWithNotification(nurseId: string, nurseName: string, doctorId: string, doctorName: string, roomNumber: string, notes?: string): Observable<any> {
    // First assign through regular API
    return this.assignNurseToDoctor(nurseId, doctorId, roomNumber).pipe(
      // Then create task assignment for the nurse
      switchMap(() => this.clinicalIntegration.assignNurseTask(
        nurseId,
        nurseName,
        `Assignment to Dr. ${doctorName}`,
        `You have been assigned to assist Dr. ${doctorName} in room ${roomNumber}. ${notes || ''}`,
        undefined,
        'medium'
      ))
    );
  }

  // Send message to doctor
  sendMessageToDoctor(doctorId: string, subject: string, message: string, patientId?: string, messageType: 'info' | 'request' | 'urgent' = 'info'): Observable<any> {
    return this.clinicalIntegration.sendClinicalMessage({
      recipientId: doctorId,
      recipientRole: 'doctor',
      subject,
      message,
      messageType,
      patientId
    });
  }

  // Send message to nurse
  sendMessageToNurse(nurseId: string, subject: string, message: string, patientId?: string, messageType: 'info' | 'request' | 'urgent' = 'info'): Observable<any> {
    return this.clinicalIntegration.sendClinicalMessage({
      recipientId: nurseId,
      recipientRole: 'nurse',
      subject,
      message,
      messageType,
      patientId
    });
  }

  // Assign task to nurse
  assignTaskToNurse(nurseId: string, nurseName: string, taskTitle: string, taskDescription: string, patientId?: string, patientName?: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): Observable<any> {
    return this.clinicalIntegration.assignNurseTask(
      nurseId,
      nurseName,
      taskTitle,
      taskDescription,
      patientId,
      priority
    );
  }

  // Assign task to doctor
  assignTaskToDoctor(doctorId: string, doctorName: string, taskTitle: string, taskDescription: string, patientId?: string, patientName?: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): Observable<any> {
    return this.clinicalIntegration.createTaskAssignment({
      title: taskTitle,
      description: taskDescription,
      assignedTo: doctorId,
      assignedToName: doctorName,
      assignedToRole: 'doctor',
      patientId,
      patientName,
      taskType: 'assistance',
      priority
    });
  }

  // Handle patient flow handoff
  handoffPatientForPreparation(patientId: string, patientName: string, nurseId: string, nurseName: string, notes: string): Observable<any> {
    return this.clinicalIntegration.createPatientHandoff({
      patientId,
      patientName,
      toStaffId: nurseId,
      toStaffName: nurseName,
      toRole: 'nurse',
      handoffType: 'preparation-complete',
      notes,
      priority: 'normal'
    });
  }

  // Escalate issue to doctor
  escalateToDoctor(doctorId: string, doctorName: string, patientId: string, patientName: string, issue: string, priority: 'normal' | 'urgent' = 'normal'): Observable<any> {
    return this.clinicalIntegration.createTaskAssignment({
      title: 'Head Nurse Escalation',
      description: issue,
      assignedTo: doctorId,
      assignedToName: doctorName,
      assignedToRole: 'doctor',
      patientId,
      patientName,
      taskType: 'assistance',
      priority: priority === 'urgent' ? 'urgent' : 'high'
    });
  }

  // Trigger emergency alert
  triggerEmergencyAlert(patientId: string, patientName: string, roomId: string, description: string): Observable<any> {
    return this.clinicalIntegration.triggerEmergencyAlert(patientId, patientName, roomId, description);
  }

  // Report equipment issue
  reportEquipmentIssue(roomId: string, equipmentName: string, issueDescription: string): Observable<any> {
    return this.clinicalIntegration.reportEquipmentIssue(roomId, equipmentName, issueDescription);
  }

  // Acknowledge handoff
  acknowledgeHandoff(handoffId: string): Observable<any> {
    return this.clinicalIntegration.acknowledgeHandoff(handoffId);
  }

  // Complete handoff
  completeHandoff(handoffId: string, notes?: string): Observable<any> {
    return this.clinicalIntegration.completeHandoff(handoffId, notes);
  }

  // Update status for other staff
  updateMyStatus(status: 'available' | 'busy' | 'break', location?: string): Observable<any> {
    return this.clinicalIntegration.updateStaffStatus(status, location);
  }

  // Broadcast message to all nurses
  broadcastToNurses(subject: string, message: string, messageType: 'info' | 'request' | 'urgent' = 'info'): Observable<any[]> {
    // Get all nurses and send message to each
    return this.getNursingStaff().pipe(
      switchMap(staff => {
        const nurses = staff.filter(s => s.role === 'nurse');
        const messagePromises = nurses.map(nurse => 
          this.clinicalIntegration.sendClinicalMessage({
            recipientId: nurse.id,
            recipientRole: 'nurse',
            subject,
            message,
            messageType
          }).toPromise()
        );
        return Promise.all(messagePromises);
      })
    );
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