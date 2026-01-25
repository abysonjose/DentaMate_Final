import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PatientOrthodonticCase {
  id: string;
  patientId: string;
  caseType: 'BRACES' | 'ALIGNERS' | 'RETAINER' | 'APPLIANCE';
  status: 'RECEIVED' | 'IN_MEASUREMENT_REVIEW' | 'IN_FABRICATION' | 'READY' | 'DELIVERED';
  doctorName: string;
  orthotistName?: string;
  startDate: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  progress: number; // 0-100
  currentStage: string;
  nextAppointment?: Date;
  canReschedule: boolean;
}

export interface DeliveryNotification {
  caseId: string;
  patientId: string;
  message: string;
  deliveryDate: Date;
  appointmentRequired: boolean;
  instructions: string[];
  contactInfo: {
    phone: string;
    email: string;
  };
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PatientFeedback {
  caseId: string;
  patientId: string;
  rating: number; // 1-5
  comfort: number; // 1-5
  appearance: number; // 1-5
  functionality: number; // 1-5
  comments?: string;
  issues?: string[];
  recommendToOthers: boolean;
  submissionDate: Date;
}

export interface AppointmentRequest {
  caseId: string;
  patientId: string;
  requestType: 'DELIVERY' | 'FITTING' | 'ADJUSTMENT' | 'FOLLOW_UP';
  preferredDates: Date[];
  preferredTimes: string[];
  notes?: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PatientEducationContent {
  id: string;
  caseType: string;
  title: string;
  content: string;
  mediaUrl?: string;
  category: 'CARE_INSTRUCTIONS' | 'WHAT_TO_EXPECT' | 'MAINTENANCE' | 'TROUBLESHOOTING';
  readTime: number; // in minutes
  isRequired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrthotistPatientIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/orthotist-patient`;
  private notificationsSubject = new BehaviorSubject<DeliveryNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Patient Case Information
  getPatientOrthodonticCases(patientId: string): Observable<PatientOrthodonticCase[]> {
    return this.http.get<PatientOrthodonticCase[]>(`${this.apiUrl}/patients/${patientId}/cases`, {
      headers: this.getHeaders()
    });
  }

  getCaseDetails(caseId: string): Observable<PatientOrthodonticCase> {
    return this.http.get<PatientOrthodonticCase>(`${this.apiUrl}/cases/${caseId}`, {
      headers: this.getHeaders()
    });
  }

  getCaseProgress(caseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cases/${caseId}/progress`, {
      headers: this.getHeaders()
    });
  }

  // Delivery Notifications
  sendDeliveryNotification(notification: DeliveryNotification): Observable<any> {
    return this.http.post(`${this.apiUrl}/delivery-notification`, notification, {
      headers: this.getHeaders()
    });
  }

  scheduleDeliveryReminder(caseId: string, reminderDate: Date): Observable<any> {
    return this.http.post(`${this.apiUrl}/schedule-reminder`, {
      caseId,
      reminderDate
    }, {
      headers: this.getHeaders()
    });
  }

  getDeliveryNotifications(patientId: string): Observable<DeliveryNotification[]> {
    return this.http.get<DeliveryNotification[]>(`${this.apiUrl}/patients/${patientId}/notifications`, {
      headers: this.getHeaders()
    });
  }

  // Patient Communication
  sendPatientUpdate(caseId: string, update: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/patient-update`, update, {
      headers: this.getHeaders()
    });
  }

  getPatientMessages(caseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cases/${caseId}/messages`, {
      headers: this.getHeaders()
    });
  }

  // Appointment Management
  requestAppointment(request: AppointmentRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointment-request`, request, {
      headers: this.getHeaders()
    });
  }

  getAvailableSlots(caseId: string, date: Date): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cases/${caseId}/available-slots`, {
      params: { date: date.toISOString() },
      headers: this.getHeaders()
    });
  }

  confirmDeliveryAppointment(caseId: string, appointmentDetails: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/confirm-appointment`, appointmentDetails, {
      headers: this.getHeaders()
    });
  }

  // Patient Feedback
  submitPatientFeedback(feedback: PatientFeedback): Observable<any> {
    return this.http.post(`${this.apiUrl}/feedback`, feedback, {
      headers: this.getHeaders()
    });
  }

  getFeedbackForCase(caseId: string): Observable<PatientFeedback[]> {
    return this.http.get<PatientFeedback[]>(`${this.apiUrl}/cases/${caseId}/feedback`, {
      headers: this.getHeaders()
    });
  }

  // Patient Education
  getEducationContent(caseType: string): Observable<PatientEducationContent[]> {
    return this.http.get<PatientEducationContent[]>(`${this.apiUrl}/education/${caseType}`, {
      headers: this.getHeaders()
    });
  }

  markContentAsRead(contentId: string, patientId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/education/${contentId}/read`, {
      patientId
    }, {
      headers: this.getHeaders()
    });
  }

  // Case Timeline
  getCaseTimeline(caseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cases/${caseId}/timeline`, {
      headers: this.getHeaders()
    });
  }

  // Patient Portal Integration
  generatePatientPortalLink(caseId: string): Observable<{ link: string; expiresAt: Date }> {
    return this.http.post<{ link: string; expiresAt: Date }>(`${this.apiUrl}/cases/${caseId}/portal-link`, {}, {
      headers: this.getHeaders()
    });
  }

  // SMS/Email Notifications
  sendSMSNotification(patientId: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/notifications/sms`, {
      patientId,
      message
    }, {
      headers: this.getHeaders()
    });
  }

  sendEmailNotification(patientId: string, subject: string, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/notifications/email`, {
      patientId,
      subject,
      content
    }, {
      headers: this.getHeaders()
    });
  }

  // Real-time Updates
  subscribeToPatientUpdates(patientId: string): Observable<any> {
    return new Observable(observer => {
      const ws = new WebSocket(`${environment.wsUrl}/orthotist-patient/${patientId}`);
      
      ws.onmessage = (event) => {
        observer.next(JSON.parse(event.data));
      };
      
      ws.onerror = (error) => {
        observer.error(error);
      };
      
      ws.onclose = () => {
        observer.complete();
      };
      
      return () => ws.close();
    });
  }

  // Analytics
  getPatientSatisfactionMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/satisfaction`, {
      headers: this.getHeaders()
    });
  }

  getDeliveryPerformanceMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/delivery-performance`, {
      headers: this.getHeaders()
    });
  }
}