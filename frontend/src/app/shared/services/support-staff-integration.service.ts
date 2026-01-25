import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SupportStaffTaskAssignment {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: 'HOUSEKEEPING' | 'SECURITY' | 'ATTENDANT';
  taskType: 'CLEANING' | 'ASSISTANCE' | 'SECURITY' | 'MAINTENANCE';
  title: string;
  description: string;
  location: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedBy: string;
  assignedByRole: 'HEAD_NURSE' | 'BRANCH_ADMIN';
  assignedAt: Date;
  dueDate?: Date;
  estimatedDuration?: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  branchId: string;
  tenantId: string;
}

export interface PatientAssistanceRequest {
  id: string;
  patientId: string;
  patientName: string; // Masked for privacy
  assistanceType: 'WHEELCHAIR' | 'ESCORT' | 'GUIDANCE' | 'EMERGENCY';
  fromLocation: string;
  toLocation: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requestedBy: string;
  requestedByRole: 'RECEPTIONIST' | 'NURSE' | 'DOCTOR';
  requestedAt: Date;
  assignedStaffId?: string;
  status: 'REQUESTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  notes?: string;
  branchId: string;
  tenantId: string;
}

export interface RoomStatusUpdate {
  id: string;
  roomNumber: string;
  roomType: 'CONSULTATION' | 'TREATMENT' | 'WAITING' | 'UTILITY';
  previousStatus: string;
  newStatus: 'OCCUPIED' | 'CLEANING_REQUIRED' | 'READY' | 'OUT_OF_ORDER';
  updatedBy: string;
  updatedByRole: string;
  updatedAt: Date;
  cleaningChecklist?: any[];
  estimatedCleaningTime?: number;
  branchId: string;
  tenantId: string;
}

export interface SupportStaffPerformanceMetrics {
  staffId: string;
  staffName: string;
  role: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  tasksAssigned: number;
  tasksCompleted: number;
  averageCompletionTime: number;
  qualityScore: number;
  attendanceRate: number;
  branchId: string;
  tenantId: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupportStaffIntegrationService {
  private apiUrl = `${environment.apiUrl}/support-staff-integration`;
  private taskAssignmentsSubject = new BehaviorSubject<SupportStaffTaskAssignment[]>([]);
  private assistanceRequestsSubject = new BehaviorSubject<PatientAssistanceRequest[]>([]);

  public taskAssignments$ = this.taskAssignmentsSubject.asObservable();
  public assistanceRequests$ = this.assistanceRequestsSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Task Assignment Management (Head Nurse / Branch Admin)
  assignTaskToSupportStaff(task: Partial<SupportStaffTaskAssignment>): Observable<SupportStaffTaskAssignment> {
    return this.http.post<SupportStaffTaskAssignment>(`${this.apiUrl}/tasks/assign`, task, { headers: this.getHeaders() });
  }

  getTaskAssignmentsByBranch(branchId: string): Observable<SupportStaffTaskAssignment[]> {
    return this.http.get<SupportStaffTaskAssignment[]>(`${this.apiUrl}/tasks/branch/${branchId}`, { headers: this.getHeaders() });
  }

  getTaskAssignmentsByStaff(staffId: string): Observable<SupportStaffTaskAssignment[]> {
    return this.http.get<SupportStaffTaskAssignment[]>(`${this.apiUrl}/tasks/staff/${staffId}`, { headers: this.getHeaders() });
  }

  updateTaskAssignment(taskId: string, updates: Partial<SupportStaffTaskAssignment>): Observable<SupportStaffTaskAssignment> {
    return this.http.put<SupportStaffTaskAssignment>(`${this.apiUrl}/tasks/${taskId}`, updates, { headers: this.getHeaders() });
  }

  cancelTaskAssignment(taskId: string, reason: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tasks/${taskId}`, { 
      headers: this.getHeaders(),
      body: { reason }
    });
  }

  // Patient Assistance Requests
  createPatientAssistanceRequest(request: Partial<PatientAssistanceRequest>): Observable<PatientAssistanceRequest> {
    return this.http.post<PatientAssistanceRequest>(`${this.apiUrl}/assistance/request`, request, { headers: this.getHeaders() });
  }

  getPatientAssistanceRequests(branchId: string): Observable<PatientAssistanceRequest[]> {
    return this.http.get<PatientAssistanceRequest[]>(`${this.apiUrl}/assistance/branch/${branchId}`, { headers: this.getHeaders() });
  }

  assignAssistanceRequest(requestId: string, staffId: string): Observable<PatientAssistanceRequest> {
    return this.http.put<PatientAssistanceRequest>(`${this.apiUrl}/assistance/${requestId}/assign`, 
      { staffId }, 
      { headers: this.getHeaders() }
    );
  }

  updateAssistanceRequestStatus(requestId: string, status: string, notes?: string): Observable<PatientAssistanceRequest> {
    return this.http.put<PatientAssistanceRequest>(`${this.apiUrl}/assistance/${requestId}/status`, 
      { status, notes }, 
      { headers: this.getHeaders() }
    );
  }

  // Room Status Management
  updateRoomStatus(update: Partial<RoomStatusUpdate>): Observable<RoomStatusUpdate> {
    return this.http.post<RoomStatusUpdate>(`${this.apiUrl}/rooms/status-update`, update, { headers: this.getHeaders() });
  }

  getRoomStatusHistory(roomId: string): Observable<RoomStatusUpdate[]> {
    return this.http.get<RoomStatusUpdate[]>(`${this.apiUrl}/rooms/${roomId}/history`, { headers: this.getHeaders() });
  }

  getRoomStatusByBranch(branchId: string): Observable<RoomStatusUpdate[]> {
    return this.http.get<RoomStatusUpdate[]>(`${this.apiUrl}/rooms/branch/${branchId}/status`, { headers: this.getHeaders() });
  }

  // Performance Metrics and Reporting
  getSupportStaffPerformanceMetrics(branchId: string, period: string): Observable<SupportStaffPerformanceMetrics[]> {
    return this.http.get<SupportStaffPerformanceMetrics[]>(`${this.apiUrl}/metrics/branch/${branchId}`, {
      headers: this.getHeaders(),
      params: { period }
    });
  }

  getStaffPerformanceMetrics(staffId: string, period: string): Observable<SupportStaffPerformanceMetrics> {
    return this.http.get<SupportStaffPerformanceMetrics>(`${this.apiUrl}/metrics/staff/${staffId}`, {
      headers: this.getHeaders(),
      params: { period }
    });
  }

  // Real-time Updates
  subscribeToTaskUpdates(branchId: string): void {
    // WebSocket or Server-Sent Events implementation
    // This would connect to real-time updates for task assignments
  }

  subscribeToAssistanceRequests(branchId: string): void {
    // WebSocket or Server-Sent Events implementation
    // This would connect to real-time updates for assistance requests
  }

  // Notification Management
  sendTaskNotification(staffId: string, message: string, type: 'INFO' | 'WARNING' | 'URGENT'): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/notifications/send`, {
      staffId,
      message,
      type
    }, { headers: this.getHeaders() });
  }

  // Integration with Patient Module
  getPatientLocationForAssistance(patientId: string): Observable<{ location: string; destination?: string }> {
    return this.http.get<{ location: string; destination?: string }>(`${this.apiUrl}/patients/${patientId}/location`, { headers: this.getHeaders() });
  }

  notifyPatientOfAssistanceStatus(patientId: string, status: string, estimatedTime?: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/patients/${patientId}/assistance-notification`, {
      status,
      estimatedTime
    }, { headers: this.getHeaders() });
  }

  // Integration with Head Nurse Module
  getHeadNurseTaskRequests(branchId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/head-nurse/task-requests/branch/${branchId}`, { headers: this.getHeaders() });
  }

  submitTaskRequestToHeadNurse(request: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/head-nurse/task-requests`, request, { headers: this.getHeaders() });
  }

  // Integration with Branch Admin Module
  getBranchAdminSupportStaffOverview(branchId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/branch-admin/overview/${branchId}`, { headers: this.getHeaders() });
  }

  submitIncidentReportToBranchAdmin(incident: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/branch-admin/incidents`, incident, { headers: this.getHeaders() });
  }

  // Integration with Central Admin Module
  getCentralAdminSupportStaffAnalytics(tenantId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/central-admin/analytics/${tenantId}`, { headers: this.getHeaders() });
  }

  getSupportStaffUtilizationReport(tenantId: string, period: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/central-admin/utilization/${tenantId}`, {
      headers: this.getHeaders(),
      params: { period }
    });
  }
}