import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClinicalIntegrationService, PatientHandoff, ClinicalMessage, TaskAssignment, ClinicalAlert } from '../../../shared/services/clinical-integration.service';

export interface DoctorProfile {
  id: string;
  name: string;
  specialization: string;
  licenseNumber: string;
  branches: string[];
  workingHours: {
    [key: string]: { start: string; end: string; };
  };
  preferences: {
    consultationDuration: number;
    breakDuration: number;
    maxPatientsPerDay: number;
  };
}

export interface DashboardStats {
  todayAppointments: number;
  completedConsultations: number;
  walkIns: number;
  currentQueueLength: number;
  nextPatient: string;
  delayedQueue: boolean;
  emergencyInsertions: number;
  upcomingFollowUps: number;
}

export interface Notification {
  id: string;
  type: 'queue' | 'appointment' | 'lab' | 'collaboration' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = `${environment.apiUrl}/doctor`;
  private doctorProfile$ = new BehaviorSubject<DoctorProfile | null>(null);
  private notifications$ = new BehaviorSubject<Notification[]>([]);

  constructor(private http: HttpClient, private clinicalIntegration: ClinicalIntegrationService) {
    this.loadDoctorProfile();
    this.loadNotifications();
    this.subscribeToIntegrationEvents();
  }

  // Profile Management
  getDoctorProfile(): Observable<DoctorProfile | null> {
    return this.doctorProfile$.asObservable();
  }

  private loadDoctorProfile(): void {
    this.http.get<DoctorProfile>(`${this.apiUrl}/profile`)
      .subscribe({
        next: (profile) => this.doctorProfile$.next(profile),
        error: (error) => console.error('Error loading doctor profile:', error)
      });
  }

  updateDoctorProfile(profile: Partial<DoctorProfile>): Observable<DoctorProfile> {
    return this.http.put<DoctorProfile>(`${this.apiUrl}/profile`, profile);
  }

  // Dashboard Statistics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  // Notifications
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  private loadNotifications(): void {
    this.http.get<Notification[]>(`${this.apiUrl}/notifications`)
      .subscribe({
        next: (notifications) => this.notifications$.next(notifications),
        error: (error) => console.error('Error loading notifications:', error)
      });
  }

  private subscribeToIntegrationEvents(): void {
    // Subscribe to clinical integration events
    this.clinicalIntegration.newHandoff$.subscribe(handoff => {
      if (handoff.toRole === 'doctor') {
        // Handle incoming patient handoffs from nurses
        this.handleIncomingHandoff(handoff);
      }
    });

    this.clinicalIntegration.newMessage$.subscribe(message => {
      if (message.recipientRole === 'doctor') {
        // Handle incoming messages from nurses/head nurses
        this.handleIncomingMessage(message);
      }
    });

    this.clinicalIntegration.newAlert$.subscribe(alert => {
      if (alert.targetRoles.includes('doctor')) {
        // Handle clinical alerts
        this.handleClinicalAlert(alert);
      }
    });
  }

  private handleIncomingHandoff(handoff: PatientHandoff): void {
    // Convert handoff to notification
    const notification: Notification = {
      id: `handoff-${handoff.id}`,
      type: 'queue',
      title: 'Patient Ready for Consultation',
      message: `${handoff.patientName} (Token: ${handoff.tokenNumber}) is ready for consultation. ${handoff.notes}`,
      timestamp: new Date(handoff.timestamp),
      read: false,
      priority: handoff.priority === 'urgent' ? 'urgent' : 'medium',
      actionUrl: `/doctor/queue`
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([notification, ...currentNotifications]);
  }

  private handleIncomingMessage(message: ClinicalMessage): void {
    // Convert message to notification
    const notification: Notification = {
      id: `message-${message.id}`,
      type: 'collaboration',
      title: `Message from ${message.senderName}`,
      message: message.message,
      timestamp: new Date(message.timestamp),
      read: false,
      priority: message.messageType === 'urgent' ? 'urgent' : 'medium',
      actionUrl: `/doctor/messages`
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([notification, ...currentNotifications]);
  }

  private handleClinicalAlert(alert: ClinicalAlert): void {
    // Convert alert to notification
    const notification: Notification = {
      id: `alert-${alert.id}`,
      type: alert.alertType === 'emergency' ? 'system' : 'queue',
      title: alert.title,
      message: alert.message,
      timestamp: new Date(alert.timestamp),
      read: false,
      priority: alert.priority === 'emergency' ? 'urgent' : 'high',
      actionUrl: `/doctor/alerts`
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([notification, ...currentNotifications]);
  }

  markNotificationAsRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }

  markAllNotificationsAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/notifications/read-all`, {});
  }

  getUnreadNotificationCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/notifications/unread-count`);
  }

  // Real-time updates
  subscribeToNotifications(): Observable<Notification> {
    // WebSocket implementation for real-time notifications
    // This would typically use Socket.IO or WebSocket
    return new Observable(observer => {
      // WebSocket connection logic here
      // For now, returning empty observable
    });
  }

  // Working Hours Management
  updateWorkingHours(hours: DoctorProfile['workingHours']): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/working-hours`, { workingHours: hours });
  }

  // Break Management
  takeBreak(duration: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/break/start`, { duration });
  }

  endBreak(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/break/end`, {});
  }

  getBreakStatus(): Observable<{ onBreak: boolean; endTime?: Date }> {
    return this.http.get<{ onBreak: boolean; endTime?: Date }>(`${this.apiUrl}/break/status`);
  }

  // Emergency Handling
  declareEmergency(reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/emergency/declare`, { reason });
  }

  clearEmergency(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/emergency/clear`, {});
  }

  // Performance Analytics
  getDailyPerformance(date: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/daily/${date}`);
  }

  getWeeklyPerformance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/weekly`);
  }

  getMonthlyPerformance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/monthly`);
  }

  // Collaboration
  requestSecondOpinion(patientId: string, consultingDoctorId: string, notes: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/collaboration/second-opinion`, {
      patientId,
      consultingDoctorId,
      notes
    });
  }

  shareCase(patientId: string, doctorIds: string[], notes: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/collaboration/share-case`, {
      patientId,
      doctorIds,
      notes
    });
  }

  // Voice Commands (Future Implementation)
  enableVoiceCommands(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/voice/enable`, {});
  }

  disableVoiceCommands(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/voice/disable`, {});
  }

  // Integration Methods for Clinical Workflow

  // Request nurse assistance
  requestNurseAssistance(patientId: string, patientName: string, nurseId: string, assistanceType: string, notes?: string): Observable<any> {
    return this.clinicalIntegration.requestNurseAssistance(
      patientId,
      patientName,
      nurseId,
      assistanceType,
      notes
    );
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

  // Send message to head nurse
  sendMessageToHeadNurse(headNurseId: string, subject: string, message: string, patientId?: string, messageType: 'info' | 'request' | 'urgent' = 'info'): Observable<any> {
    return this.clinicalIntegration.sendClinicalMessage({
      recipientId: headNurseId,
      recipientRole: 'head-nurse',
      subject,
      message,
      messageType,
      patientId
    });
  }

  // Handoff patient to nurse for post-procedure care
  handoffPatientToNurse(patientId: string, patientName: string, nurseId: string, notes: string): Observable<any> {
    return this.clinicalIntegration.createPatientHandoff({
      patientId,
      patientName,
      toStaffId: nurseId,
      toRole: 'nurse',
      handoffType: 'post-procedure',
      notes,
      priority: 'normal'
    });
  }

  // Request head nurse intervention
  requestHeadNurseIntervention(patientId: string, patientName: string, reason: string, priority: 'normal' | 'urgent' = 'normal'): Observable<any> {
    return this.clinicalIntegration.createTaskAssignment({
      title: 'Doctor Intervention Request',
      description: reason,
      assignedToRole: 'head-nurse',
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

  // Acknowledge handoff from nurse
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