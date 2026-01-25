import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { SupportStaffIntegrationService } from '../../../shared/services/support-staff-integration.service';
import { SupportStaffIntegrationService } from '../../../shared/services/support-staff-integration.service';

export interface Task {
  id: string;
  type: 'CLEANING' | 'ASSISTANCE' | 'SECURITY' | 'MAINTENANCE';
  title: string;
  description: string;
  location: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedAt: Date;
  completedAt?: Date;
  notes?: string;
  estimatedDuration?: number;
}

export interface Room {
  id: string;
  number: string;
  type: 'CONSULTATION' | 'TREATMENT' | 'WAITING' | 'UTILITY';
  status: 'OCCUPIED' | 'CLEANING_REQUIRED' | 'READY' | 'OUT_OF_ORDER';
  lastCleaned?: Date;
  cleaningChecklist?: CleaningItem[];
}

export interface CleaningItem {
  id: string;
  item: string;
  completed: boolean;
  timestamp?: Date;
}

export interface PatientAssistanceRequest {
  id: string;
  type: 'WHEELCHAIR' | 'ESCORT' | 'GUIDANCE' | 'EMERGENCY';
  patientId: string;
  patientName: string; // Masked for privacy
  location: string;
  destination?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'REQUESTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  requestedAt: Date;
  notes?: string;
}

export interface SecurityIncident {
  id: string;
  type: 'CROWD_CONTROL' | 'EMERGENCY' | 'DISTURBANCE' | 'SAFETY_HAZARD';
  location: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'REPORTED' | 'INVESTIGATING' | 'RESOLVED';
  reportedAt: Date;
  reportedBy: string;
  resolvedAt?: Date;
}

export interface ShiftInfo {
  staffId: string;
  staffName: string;
  role: 'HOUSEKEEPING' | 'SECURITY' | 'ATTENDANT';
  shiftStart: Date;
  shiftEnd: Date;
  clockedIn?: Date;
  clockedOut?: Date;
  breakStatus: 'AVAILABLE' | 'ON_BREAK';
}

export interface OperationalAlert {
  id: string;
  type: 'PEAK_HOURS' | 'CONGESTION' | 'URGENT_CLEANING' | 'SAFETY_ALERT';
  message: string;
  priority: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: Date;
  acknowledged: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SupportStaffService {
  private apiUrl = `${environment.apiUrl}/support-staff`;
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private alertsSubject = new BehaviorSubject<OperationalAlert[]>([]);

  public tasks$ = this.tasksSubject.asObservable();
  public alerts$ = this.alertsSubject.asObservable();

  constructor(private http: HttpClient, private integrationService: SupportStaffIntegrationService) {
    this.loadInitialData();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private loadInitialData(): void {
    // Load mock data for development
    this.loadMockTasks();
    this.loadMockAlerts();
  }

  // Task Management
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/tasks`, { headers: this.getHeaders() });
  }

  updateTaskStatus(taskId: string, status: string, notes?: string): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/tasks/${taskId}/status`, 
      { status, notes }, 
      { headers: this.getHeaders() }
    );
  }

  completeTask(taskId: string, notes?: string): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/tasks/${taskId}/complete`, 
      { notes }, 
      { headers: this.getHeaders() }
    );
  }

  // Room Management
  getRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/rooms`, { headers: this.getHeaders() });
  }

  updateRoomStatus(roomId: string, status: string): Observable<Room> {
    return this.http.put<Room>(`${this.apiUrl}/rooms/${roomId}/status`, 
      { status }, 
      { headers: this.getHeaders() }
    );
  }

  completeRoomCleaning(roomId: string, checklist: CleaningItem[]): Observable<Room> {
    return this.http.put<Room>(`${this.apiUrl}/rooms/${roomId}/cleaning-complete`, 
      { checklist }, 
      { headers: this.getHeaders() }
    );
  }

  // Patient Assistance
  getAssistanceRequests(): Observable<PatientAssistanceRequest[]> {
    return this.http.get<PatientAssistanceRequest[]>(`${this.apiUrl}/assistance`, { headers: this.getHeaders() });
  }

  acceptAssistanceRequest(requestId: string): Observable<PatientAssistanceRequest> {
    return this.http.put<PatientAssistanceRequest>(`${this.apiUrl}/assistance/${requestId}/accept`, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  completeAssistanceRequest(requestId: string, notes?: string): Observable<PatientAssistanceRequest> {
    return this.http.put<PatientAssistanceRequest>(`${this.apiUrl}/assistance/${requestId}/complete`, 
      { notes }, 
      { headers: this.getHeaders() }
    );
  }

  // Security & Safety
  getSecurityIncidents(): Observable<SecurityIncident[]> {
    return this.http.get<SecurityIncident[]>(`${this.apiUrl}/security/incidents`, { headers: this.getHeaders() });
  }

  reportIncident(incident: Partial<SecurityIncident>): Observable<SecurityIncident> {
    return this.http.post<SecurityIncident>(`${this.apiUrl}/security/incidents`, 
      incident, 
      { headers: this.getHeaders() }
    );
  }

  // Shift Management
  getShiftInfo(): Observable<ShiftInfo> {
    return this.http.get<ShiftInfo>(`${this.apiUrl}/shift`, { headers: this.getHeaders() });
  }

  clockIn(): Observable<ShiftInfo> {
    return this.http.post<ShiftInfo>(`${this.apiUrl}/shift/clock-in`, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  clockOut(): Observable<ShiftInfo> {
    return this.http.post<ShiftInfo>(`${this.apiUrl}/shift/clock-out`, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  // Activity Log
  getActivityLog(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/activity-log`, { headers: this.getHeaders() });
  }

  // Alerts & Communication
  getAlerts(): Observable<OperationalAlert[]> {
    return this.http.get<OperationalAlert[]>(`${this.apiUrl}/alerts`, { headers: this.getHeaders() });
  }

  acknowledgeAlert(alertId: string): Observable<OperationalAlert> {
    return this.http.put<OperationalAlert>(`${this.apiUrl}/alerts/${alertId}/acknowledge`, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  // Mock data for development
  private loadMockTasks(): void {
    const mockTasks: Task[] = [
      {
        id: '1',
        type: 'CLEANING',
        title: 'Clean Room 101',
        description: 'Deep cleaning required after procedure',
        location: 'Room 101',
        priority: 'HIGH',
        status: 'ASSIGNED',
        assignedAt: new Date(),
        estimatedDuration: 30
      },
      {
        id: '2',
        type: 'ASSISTANCE',
        title: 'Wheelchair Assistance',
        description: 'Patient needs wheelchair support to parking',
        location: 'Reception',
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        assignedAt: new Date(),
        estimatedDuration: 15
      }
    ];
    this.tasksSubject.next(mockTasks);
  }

  private loadMockAlerts(): void {
    const mockAlerts: OperationalAlert[] = [
      {
        id: '1',
        type: 'PEAK_HOURS',
        message: 'Peak hours detected - increased patient flow expected',
        priority: 'INFO',
        timestamp: new Date(),
        acknowledged: false
      },
      {
        id: '2',
        type: 'URGENT_CLEANING',
        message: 'Room 203 requires immediate cleaning',
        priority: 'CRITICAL',
        timestamp: new Date(),
        acknowledged: false
      }
    ];
    this.alertsSubject.next(mockAlerts);
  }
}
  // Integration with other modules
  notifyTaskCompletion(taskId: string, completionData: any): Observable<void> {
    return this.integrationService.updateTaskAssignment(taskId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      notes: completionData.notes
    }).pipe(
      map(() => void 0)
    );
  }

  requestAssistanceFromHeadNurse(request: {
    type: string;
    description: string;
    urgency: string;
  }): Observable<any> {
    return this.integrationService.submitTaskRequestToHeadNurse({
      type: request.type,
      description: request.description,
      urgency: request.urgency,
      requestedBy: this.getCurrentStaffId(),
      requestedAt: new Date()
    });
  }

  reportIncidentToBranchAdmin(incident: {
    type: string;
    location: string;
    description: string;
    severity: string;
  }): Observable<any> {
    return this.integrationService.submitIncidentReportToBranchAdmin({
      ...incident,
      reportedBy: this.getCurrentStaffId(),
      reportedAt: new Date()
    });
  }

  updatePatientAssistanceStatus(requestId: string, status: string, notes?: string): Observable<any> {
    return this.integrationService.updateAssistanceRequestStatus(requestId, status, notes);
  }

  private getCurrentStaffId(): string {
    return localStorage.getItem('staffId') || 'current-staff-id';
  }
}