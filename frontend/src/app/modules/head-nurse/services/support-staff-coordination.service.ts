import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SupportStaffIntegrationService, SupportStaffTaskAssignment, PatientAssistanceRequest } from '../../../shared/services/support-staff-integration.service';

export interface SupportStaffMember {
  id: string;
  name: string;
  role: 'HOUSEKEEPING' | 'SECURITY' | 'ATTENDANT';
  status: 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFF_DUTY';
  currentTask?: string;
  location?: string;
  shiftStart: Date;
  shiftEnd: Date;
  contactInfo: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  type: 'CLEANING' | 'ASSISTANCE' | 'SECURITY' | 'MAINTENANCE';
  description: string;
  estimatedDuration: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requiredRole: string[];
  checklist: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SupportStaffCoordinationService {
  
  constructor(
    private http: HttpClient,
    private supportStaffIntegration: SupportStaffIntegrationService
  ) {}

  // Support Staff Management
  getSupportStaffMembers(branchId: string): Observable<SupportStaffMember[]> {
    return this.http.get<SupportStaffMember[]>(`/api/head-nurse/support-staff/branch/${branchId}`);
  }

  getAvailableSupportStaff(branchId: string, role?: string): Observable<SupportStaffMember[]> {
    const params = role ? { role } : {};
    return this.http.get<SupportStaffMember[]>(`/api/head-nurse/support-staff/available/${branchId}`, { params });
  }

  // Task Assignment and Management
  createTaskAssignment(task: {
    staffId: string;
    type: string;
    title: string;
    description: string;
    location: string;
    priority: string;
    dueDate?: Date;
    estimatedDuration?: number;
  }): Observable<SupportStaffTaskAssignment> {
    const taskAssignment: Partial<SupportStaffTaskAssignment> = {
      ...task,
      assignedBy: 'current-head-nurse-id', // This would come from auth service
      assignedByRole: 'HEAD_NURSE',
      assignedAt: new Date(),
      status: 'ASSIGNED',
      branchId: 'current-branch-id', // This would come from tenant service
      tenantId: 'current-tenant-id'
    };
    
    return this.supportStaffIntegration.assignTaskToSupportStaff(taskAssignment);
  }

  getTaskTemplates(): Observable<TaskTemplate[]> {
    return this.http.get<TaskTemplate[]>('/api/head-nurse/task-templates');
  }

  createTaskFromTemplate(templateId: string, staffId: string, customizations?: any): Observable<SupportStaffTaskAssignment> {
    return this.http.post<SupportStaffTaskAssignment>('/api/head-nurse/tasks/from-template', {
      templateId,
      staffId,
      customizations
    });
  }

  // Patient Assistance Coordination
  requestPatientAssistance(request: {
    patientId: string;
    assistanceType: string;
    fromLocation: string;
    toLocation: string;
    priority: string;
    notes?: string;
  }): Observable<PatientAssistanceRequest> {
    const assistanceRequest: Partial<PatientAssistanceRequest> = {
      ...request,
      patientName: 'Patient ***', // Masked for privacy
      requestedBy: 'current-head-nurse-id',
      requestedByRole: 'HEAD_NURSE',
      requestedAt: new Date(),
      status: 'REQUESTED',
      branchId: 'current-branch-id',
      tenantId: 'current-tenant-id'
    };

    return this.supportStaffIntegration.createPatientAssistanceRequest(assistanceRequest);
  }

  assignPatientAssistance(requestId: string, staffId: string): Observable<PatientAssistanceRequest> {
    return this.supportStaffIntegration.assignAssistanceRequest(requestId, staffId);
  }

  // Room Management Coordination
  requestRoomCleaning(roomNumber: string, priority: string, notes?: string): Observable<SupportStaffTaskAssignment> {
    return this.createTaskAssignment({
      staffId: '', // Will be auto-assigned to available housekeeping staff
      type: 'CLEANING',
      title: `Clean Room ${roomNumber}`,
      description: `Room cleaning required${notes ? ': ' + notes : ''}`,
      location: `Room ${roomNumber}`,
      priority: priority,
      estimatedDuration: 30
    });
  }

  markRoomForCleaning(roomNumber: string, reason: string): Observable<any> {
    return this.http.post('/api/head-nurse/rooms/mark-cleaning', {
      roomNumber,
      reason,
      requestedBy: 'current-head-nurse-id',
      requestedAt: new Date()
    });
  }

  // Staff Performance and Monitoring
  getSupportStaffPerformance(branchId: string, period: string = 'WEEKLY'): Observable<any[]> {
    return this.supportStaffIntegration.getSupportStaffPerformanceMetrics(branchId, period);
  }

  getTaskCompletionRates(branchId: string): Observable<any> {
    return this.http.get(`/api/head-nurse/analytics/task-completion/${branchId}`);
  }

  // Communication and Notifications
  sendUrgentNotificationToSupportStaff(staffId: string, message: string): Observable<void> {
    return this.supportStaffIntegration.sendTaskNotification(staffId, message, 'URGENT');
  }

  broadcastMessageToSupportStaff(branchId: string, message: string, roles?: string[]): Observable<void> {
    return this.http.post<void>('/api/head-nurse/communications/broadcast', {
      branchId,
      message,
      roles,
      sentBy: 'current-head-nurse-id',
      sentAt: new Date()
    });
  }

  // Emergency Protocols
  activateEmergencyProtocol(type: 'MEDICAL' | 'FIRE' | 'SECURITY', location: string): Observable<void> {
    return this.http.post<void>('/api/head-nurse/emergency/activate', {
      type,
      location,
      activatedBy: 'current-head-nurse-id',
      activatedAt: new Date()
    });
  }

  requestSecurityAssistance(location: string, urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Observable<SupportStaffTaskAssignment> {
    return this.createTaskAssignment({
      staffId: '', // Will be auto-assigned to available security staff
      type: 'SECURITY',
      title: 'Security Assistance Required',
      description: `Security assistance needed at ${location}`,
      location: location,
      priority: urgency === 'CRITICAL' ? 'URGENT' : urgency,
      estimatedDuration: 15
    });
  }

  // Shift and Schedule Coordination
  getSupportStaffSchedule(branchId: string, date: Date): Observable<any[]> {
    return this.http.get<any[]>(`/api/head-nurse/schedules/support-staff/${branchId}`, {
      params: { date: date.toISOString().split('T')[0] }
    });
  }

  requestStaffCoverage(staffId: string, reason: string, duration: number): Observable<any> {
    return this.http.post('/api/head-nurse/coverage/request', {
      staffId,
      reason,
      duration,
      requestedBy: 'current-head-nurse-id',
      requestedAt: new Date()
    });
  }

  // Quality Assurance
  submitQualityFeedback(taskId: string, rating: number, feedback: string): Observable<void> {
    return this.http.post<void>('/api/head-nurse/quality/feedback', {
      taskId,
      rating,
      feedback,
      submittedBy: 'current-head-nurse-id',
      submittedAt: new Date()
    });
  }

  getQualityMetrics(branchId: string, period: string): Observable<any> {
    return this.http.get(`/api/head-nurse/quality/metrics/${branchId}`, {
      params: { period }
    });
  }
}