import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface AppointmentBooking {
  patientId: string;
  doctorId: string;
  appointmentDateTime: string;
  appointmentType: string;
  reason: string;
  notes?: string;
  priority?: string;
}

export interface PatientRegistration {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReceptionistService {
  private readonly APPOINTMENT_API = `${environment.apiUrl}/appointments`;
  private readonly PATIENT_API = `${environment.apiUrl}/patients`;
  private readonly QUEUE_API = `${environment.apiUrl}/queue`;

  constructor(private http: HttpClient) {}

  // Dashboard data
  getTodayAppointments(): Observable<ApiResponse> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<ApiResponse>(`${this.APPOINTMENT_API}/date/${today}`);
  }

  getWaitingPatients(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.QUEUE_API}/waiting`);
  }

  getRecentRegistrations(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.PATIENT_API}/recent`);
  }

  getQueueStatus(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.QUEUE_API}/status`);
  }

  // Appointment management
  bookAppointment(appointmentData: AppointmentBooking): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.APPOINTMENT_API}`, appointmentData);
  }

  getAvailableSlots(doctorId: string, date: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.APPOINTMENT_API}/slots/${doctorId}/${date}`);
  }

  getAppointmentDetails(appointmentId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.APPOINTMENT_API}/${appointmentId}`);
  }

  updateAppointmentStatus(appointmentId: string, status: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.APPOINTMENT_API}/${appointmentId}/status`, { status });
  }

  rescheduleAppointment(appointmentId: string, newDateTime: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.APPOINTMENT_API}/${appointmentId}/reschedule`, { 
      newDateTime 
    });
  }

  cancelAppointment(appointmentId: string, reason: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.APPOINTMENT_API}/${appointmentId}/cancel`, { 
      reason 
    });
  }

  // Patient management
  registerPatient(patientData: PatientRegistration): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.PATIENT_API}/register`, patientData);
  }

  searchPatients(query: string): Observable<ApiResponse> {
    const params = new HttpParams().set('q', query);
    return this.http.get<ApiResponse>(`${this.PATIENT_API}/search`, { params });
  }

  getPatientDetails(patientId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.PATIENT_API}/${patientId}`);
  }

  updatePatientInfo(patientId: string, patientData: Partial<PatientRegistration>): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.PATIENT_API}/${patientId}`, patientData);
  }

  // Queue management
  checkInPatient(appointmentId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.QUEUE_API}/checkin`, { appointmentId });
  }

  generateToken(patientId: string, appointmentId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.QUEUE_API}/token`, { 
      patientId, 
      appointmentId 
    });
  }

  getTokenStatus(tokenId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.QUEUE_API}/token/${tokenId}`);
  }

  // Doctor and staff information
  getDoctors(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${environment.apiUrl}/staff/doctors`);
  }

  getDoctorSchedule(doctorId: string, date: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${environment.apiUrl}/staff/doctors/${doctorId}/schedule/${date}`);
  }

  // Reports and analytics
  getAppointmentStats(startDate: string, endDate: string): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<ApiResponse>(`${this.APPOINTMENT_API}/stats`, { params });
  }

  getPatientRegistrationStats(startDate: string, endDate: string): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<ApiResponse>(`${this.PATIENT_API}/registration-stats`, { params });
  }

  // Communication
  sendAppointmentReminder(appointmentId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.APPOINTMENT_API}/${appointmentId}/reminder`, {});
  }

  sendAppointmentConfirmation(appointmentId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.APPOINTMENT_API}/${appointmentId}/confirmation`, {});
  }
}