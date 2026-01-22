import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PatientProfile {
  id: string;
  patientId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  registrationDate: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  department: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  type: 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY' | 'ROUTINE_CHECKUP';
  branch: string;
  notes?: string;
  createdAt: string;
}

export interface TokenStatus {
  tokenNumber: string;
  queuePosition: number;
  estimatedWaitTime: number;
  status: 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED';
  checkedInAt: string;
  queueId: string;
  branchId: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  visitDate: string;
  doctorName: string;
  department: string;
  diagnosis: string;
  treatmentNotes: string;
  prescriptions: string[];
  attachments: {
    type: 'XRAY' | 'REPORT' | 'IMAGE';
    filename: string;
    url: string;
    uploadedAt: string;
  }[];
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorName: string;
  prescriptionDate: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface Bill {
  id: string;
  patientId: string;
  billDate: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  paymentMethod?: string;
  paidAt?: string;
}

export interface Notification {
  id: string;
  patientId: string;
  type: 'APPOINTMENT_REMINDER' | 'QUEUE_UPDATE' | 'PAYMENT_CONFIRMATION' | 'FOLLOW_UP_REMINDER' | 'GENERAL';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  scheduledFor?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly apiUrl = environment.apiUrl;
  private readonly appointmentServiceUrl = `${environment.apiUrl}/appointments`;
  private readonly tokenQueueServiceUrl = `${environment.apiUrl}/queue`;
  private currentTokenStatus = new BehaviorSubject<TokenStatus | null>(null);

  constructor(private http: HttpClient) {}

  // Profile Management
  getProfile(): Observable<PatientProfile> {
    return this.http.get<PatientProfile>(`${this.apiUrl}/patient/profile`);
  }

  updateProfile(profile: Partial<PatientProfile>): Observable<PatientProfile> {
    return this.http.put<PatientProfile>(`${this.apiUrl}/patient/profile`, profile);
  }

  // Appointment Management - Enhanced integration with appointment-scheduling-service
  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.appointmentServiceUrl}/patient`);
  }

  getUpcomingAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.appointmentServiceUrl}/patient/upcoming`);
  }

  bookAppointment(appointmentData: any): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.appointmentServiceUrl}`, appointmentData);
  }

  rescheduleAppointment(appointmentId: string, newDateTime: string): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.appointmentServiceUrl}/${appointmentId}/reschedule`, {
      newDateTime
    });
  }

  cancelAppointment(appointmentId: string, reason?: string): Observable<void> {
    return this.http.delete<void>(`${this.appointmentServiceUrl}/${appointmentId}`, {
      body: { reason }
    });
  }

  getAvailableSlots(doctorId: string, date: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.appointmentServiceUrl}/available-slots`, {
      params: { doctorId, date }
    });
  }

  getAppointmentDetails(appointmentId: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.appointmentServiceUrl}/${appointmentId}`);
  }

  confirmAppointment(appointmentId: string): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.appointmentServiceUrl}/${appointmentId}/confirm`, {});
  }

  // Token & Queue Management - Enhanced integration with token-queue-realtime-service
  getCurrentTokenStatus(): Observable<TokenStatus | null> {
    return this.currentTokenStatus.asObservable();
  }

  checkIn(appointmentId: string): Observable<TokenStatus> {
    return this.http.post<TokenStatus>(`${this.tokenQueueServiceUrl}/tokens/checkin`, { appointmentId });
  }

  generateWalkInToken(tokenData: any): Observable<TokenStatus> {
    return this.http.post<TokenStatus>(`${this.tokenQueueServiceUrl}/tokens/generate`, tokenData);
  }

  getQueueStatus(tokenId: string): Observable<TokenStatus> {
    return this.http.get<TokenStatus>(`${this.tokenQueueServiceUrl}/tokens/${tokenId}/status`);
  }

  getPatientTokens(patientId: string, branchId?: string): Observable<TokenStatus[]> {
    const params = branchId ? { branchId } : {};
    return this.http.get<TokenStatus[]>(`${this.tokenQueueServiceUrl}/tokens/patient/${patientId}`, { params });
  }

  getQueueInfo(branchId: string, doctorId?: string): Observable<any> {
    const params = doctorId ? { doctorId } : {};
    return this.http.get(`${this.tokenQueueServiceUrl}/queue/${branchId}/info`, { params });
  }

  skipToken(tokenId: string, reason: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.tokenQueueServiceUrl}/tokens/${tokenId}/skip`, { reason });
  }

  updateTokenStatus(tokenId: string, status: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.tokenQueueServiceUrl}/tokens/${tokenId}/status`, { status });
  }

  // Real-time queue updates
  subscribeToQueueUpdates(tokenId: string): Observable<TokenStatus> {
    // This would be implemented with WebSocket/Socket.IO
    // For now, return polling-based updates
    return this.http.get<TokenStatus>(`${this.tokenQueueServiceUrl}/tokens/${tokenId}/status`);
  }

  // Medical Records
  getMedicalRecords(): Observable<MedicalRecord[]> {
    return this.http.get<MedicalRecord[]>(`${this.apiUrl}/patient/medical-records`);
  }

  downloadReport(recordId: string, attachmentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/patient/medical-records/${recordId}/attachments/${attachmentId}`, {
      responseType: 'blob'
    });
  }

  // Prescriptions
  getPrescriptions(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.apiUrl}/patient/prescriptions`);
  }

  downloadPrescription(prescriptionId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/patient/prescriptions/${prescriptionId}/download`, {
      responseType: 'blob'
    });
  }

  // Billing & Payments
  getBills(): Observable<Bill[]> {
    return this.http.get<Bill[]>(`${this.apiUrl}/patient/bills`);
  }

  getPendingBills(): Observable<Bill[]> {
    return this.http.get<Bill[]>(`${this.apiUrl}/patient/bills/pending`);
  }

  makePayment(billId: string, paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/patient/bills/${billId}/pay`, paymentData);
  }

  downloadInvoice(billId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/patient/bills/${billId}/invoice`, {
      responseType: 'blob'
    });
  }

  // Notifications
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/patient/notifications`);
  }

  markNotificationAsRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/patient/notifications/${notificationId}/read`, {});
  }

  getUnreadNotificationCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/patient/notifications/unread-count`);
  }

  // Follow-ups
  getFollowUps(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/patient/follow-ups`);
  }

  // Dashboard Summary
  getDashboardSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/patient/dashboard-summary`);
  }

  // Support
  submitSupportRequest(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/patient/support-requests`, request);
  }

  getClinicInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/patient/clinic-info`);
  }
}