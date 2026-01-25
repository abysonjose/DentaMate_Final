import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { SupportStaffIntegrationService, PatientAssistanceRequest } from '../../../shared/services/support-staff-integration.service';

export interface PatientSupportRequest {
  id: string;
  patientId: string;
  requestType: 'WHEELCHAIR' | 'ESCORT' | 'GUIDANCE' | 'EMERGENCY' | 'INFORMATION';
  description: string;
  fromLocation: string;
  toLocation?: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'REQUESTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  requestedAt: Date;
  assignedStaff?: {
    id: string;
    name: string;
    role: string;
    contactInfo: string;
  };
  estimatedArrivalTime?: Date;
  completedAt?: Date;
  feedback?: {
    rating: number;
    comments: string;
  };
}

export interface PatientLocationInfo {
  patientId: string;
  currentLocation: string;
  nextAppointment?: {
    location: string;
    time: Date;
    doctor: string;
  };
  queueStatus?: {
    tokenNumber: string;
    estimatedWaitTime: number;
    position: number;
  };
}

export interface SupportStaffAvailability {
  role: string;
  available: boolean;
  estimatedResponseTime: number;
  currentLoad: number;
}

@Injectable({
  providedIn: 'root'
})
export class PatientSupportIntegrationService {
  private supportRequestsSubject = new BehaviorSubject<PatientSupportRequest[]>([]);
  public supportRequests$ = this.supportRequestsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private supportStaffIntegration: SupportStaffIntegrationService
  ) {}

  // Patient Support Requests
  requestSupport(request: {
    requestType: string;
    description: string;
    fromLocation: string;
    toLocation?: string;
    urgency: string;
  }): Observable<PatientSupportRequest> {
    const patientId = this.getCurrentPatientId(); // Get from auth service
    
    const supportRequest: Partial<PatientAssistanceRequest> = {
      patientId: patientId,
      patientName: 'Patient ***', // Masked for privacy
      assistanceType: request.requestType as any,
      fromLocation: request.fromLocation,
      toLocation: request.toLocation || '',
      priority: request.urgency as any,
      notes: request.description,
      requestedBy: patientId,
      requestedByRole: 'PATIENT' as any,
      requestedAt: new Date(),
      status: 'REQUESTED',
      branchId: this.getCurrentBranchId(),
      tenantId: this.getCurrentTenantId()
    };

    return this.supportStaffIntegration.createPatientAssistanceRequest(supportRequest) as any;
  }

  getMyActiveRequests(): Observable<PatientSupportRequest[]> {
    const patientId = this.getCurrentPatientId();
    return this.http.get<PatientSupportRequest[]>(`/api/patient/support-requests/${patientId}/active`);
  }

  getMyRequestHistory(): Observable<PatientSupportRequest[]> {
    const patientId = this.getCurrentPatientId();
    return this.http.get<PatientSupportRequest[]>(`/api/patient/support-requests/${patientId}/history`);
  }

  cancelSupportRequest(requestId: string, reason?: string): Observable<void> {
    return this.http.put<void>(`/api/patient/support-requests/${requestId}/cancel`, { reason });
  }

  // Real-time Updates
  subscribeToRequestUpdates(): void {
    const patientId = this.getCurrentPatientId();
    // WebSocket or Server-Sent Events implementation
    // This would connect to real-time updates for the patient's support requests
  }

  // Location and Navigation
  getMyCurrentLocation(): Observable<PatientLocationInfo> {
    const patientId = this.getCurrentPatientId();
    return this.http.get<PatientLocationInfo>(`/api/patient/location/${patientId}`);
  }

  requestDirections(destination: string): Observable<{
    directions: string[];
    estimatedWalkTime: number;
    accessibilityNotes?: string[];
  }> {
    const patientId = this.getCurrentPatientId();
    return this.http.post<any>('/api/patient/directions', {
      patientId,
      destination
    });
  }

  // Support Staff Availability
  checkSupportStaffAvailability(): Observable<SupportStaffAvailability[]> {
    const branchId = this.getCurrentBranchId();
    return this.http.get<SupportStaffAvailability[]>(`/api/patient/support-availability/${branchId}`);
  }

  getEstimatedResponseTime(requestType: string, urgency: string): Observable<{ estimatedTime: number }> {
    const branchId = this.getCurrentBranchId();
    return this.http.get<{ estimatedTime: number }>('/api/patient/estimated-response-time', {
      params: { branchId, requestType, urgency }
    });
  }

  // Feedback and Rating
  submitFeedback(requestId: string, feedback: {
    rating: number;
    comments: string;
    staffProfessionalism: number;
    responseTime: number;
    helpfulness: number;
  }): Observable<void> {
    return this.http.post<void>(`/api/patient/support-requests/${requestId}/feedback`, feedback);
  }

  // Emergency Support
  requestEmergencyAssistance(emergency: {
    type: 'MEDICAL' | 'MOBILITY' | 'ANXIETY' | 'OTHER';
    location: string;
    description: string;
  }): Observable<PatientSupportRequest> {
    return this.requestSupport({
      requestType: 'EMERGENCY',
      description: `${emergency.type}: ${emergency.description}`,
      fromLocation: emergency.location,
      urgency: 'URGENT'
    });
  }

  // Accessibility Support
  requestAccessibilityAssistance(assistance: {
    type: 'WHEELCHAIR' | 'VISUAL_IMPAIRMENT' | 'HEARING_IMPAIRMENT' | 'MOBILITY';
    specificNeeds: string;
    duration?: number;
  }): Observable<PatientSupportRequest> {
    return this.requestSupport({
      requestType: assistance.type === 'WHEELCHAIR' ? 'WHEELCHAIR' : 'ESCORT',
      description: `Accessibility assistance: ${assistance.specificNeeds}`,
      fromLocation: 'Current Location',
      urgency: 'MEDIUM'
    });
  }

  // Information and Guidance
  requestInformation(query: {
    topic: 'DIRECTIONS' | 'SERVICES' | 'PROCEDURES' | 'BILLING' | 'GENERAL';
    question: string;
  }): Observable<PatientSupportRequest> {
    return this.requestSupport({
      requestType: 'GUIDANCE',
      description: `Information request: ${query.question}`,
      fromLocation: 'Current Location',
      urgency: 'LOW'
    });
  }

  // Queue and Appointment Support
  requestQueueAssistance(): Observable<PatientSupportRequest> {
    return this.requestSupport({
      requestType: 'GUIDANCE',
      description: 'Need assistance with queue/token system',
      fromLocation: 'Reception/Waiting Area',
      urgency: 'LOW'
    });
  }

  requestAppointmentGuidance(): Observable<PatientSupportRequest> {
    return this.requestSupport({
      requestType: 'ESCORT',
      description: 'Need guidance to appointment location',
      fromLocation: 'Current Location',
      toLocation: 'Appointment Room',
      urgency: 'MEDIUM'
    });
  }

  // Communication with Support Staff
  sendMessageToAssignedStaff(requestId: string, message: string): Observable<void> {
    return this.http.post<void>(`/api/patient/support-requests/${requestId}/message`, { message });
  }

  getMessagesForRequest(requestId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/patient/support-requests/${requestId}/messages`);
  }

  // Preferences and Settings
  updateSupportPreferences(preferences: {
    preferredCommunicationMethod: 'SMS' | 'APP_NOTIFICATION' | 'VOICE_CALL';
    accessibilityNeeds: string[];
    languagePreference: string;
    emergencyContact: string;
  }): Observable<void> {
    const patientId = this.getCurrentPatientId();
    return this.http.put<void>(`/api/patient/support-preferences/${patientId}`, preferences);
  }

  getSupportPreferences(): Observable<any> {
    const patientId = this.getCurrentPatientId();
    return this.http.get(`/api/patient/support-preferences/${patientId}`);
  }

  // Support History and Analytics
  getSupportUsageStatistics(): Observable<{
    totalRequests: number;
    averageResponseTime: number;
    mostUsedServices: string[];
    satisfactionRating: number;
  }> {
    const patientId = this.getCurrentPatientId();
    return this.http.get<any>(`/api/patient/support-statistics/${patientId}`);
  }

  // Helper methods
  private getCurrentPatientId(): string {
    // This would typically come from the authentication service
    return localStorage.getItem('patientId') || 'current-patient-id';
  }

  private getCurrentBranchId(): string {
    // This would typically come from the tenant service
    return localStorage.getItem('branchId') || 'current-branch-id';
  }

  private getCurrentTenantId(): string {
    // This would typically come from the tenant service
    return localStorage.getItem('tenantId') || 'current-tenant-id';
  }

  // Notification Management
  markNotificationAsRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`/api/patient/notifications/${notificationId}/read`, {});
  }

  getUnreadNotificationsCount(): Observable<{ count: number }> {
    const patientId = this.getCurrentPatientId();
    return this.http.get<{ count: number }>(`/api/patient/notifications/${patientId}/unread-count`);
  }
}