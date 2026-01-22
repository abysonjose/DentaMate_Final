import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  appointmentDate: Date;
  appointmentTime: string;
  duration: number;
  type: 'consultation' | 'follow-up' | 'emergency' | 'routine-checkup' | 'procedure';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled';
  tokenNumber?: string;
  notes?: string;
  symptoms?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  branchId: string;
  roomNumber?: string;
  estimatedDuration: number;
  actualDuration?: number;
  consultationNotes?: string;
  followUpRequired?: boolean;
  followUpDate?: Date;
  prescriptionId?: string;
  labRequestIds?: string[];
}

export interface TodaySchedule {
  id: string;
  patientName: string;
  time: string;
  type: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'no-show';
  tokenNumber?: string;
  patientId: string;
  priority: string;
  estimatedDuration: number;
}

export interface AppointmentUpdate {
  appointmentId: string;
  status?: string;
  notes?: string;
  actualDuration?: number;
  followUpRequired?: boolean;
  followUpDate?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorAppointmentService {
  private apiUrl = `${environment.apiUrl}/appointment-service/api/v1`;
  private todaySchedule$ = new BehaviorSubject<TodaySchedule[]>([]);
  private currentAppointment$ = new BehaviorSubject<Appointment | null>(null);

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId');
    const userId = localStorage.getItem('userId');
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'X-User-ID': userId || '',
      'Content-Type': 'application/json'
    });
  }

  // Today's Schedule
  getTodaySchedule(): Observable<TodaySchedule[]> {
    const doctorId = localStorage.getItem('doctorId');
    const today = new Date().toISOString().split('T')[0];
    
    return this.http.get<any>(`${this.apiUrl}/appointments/doctor/${doctorId}/today`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapAppointmentsToSchedule(response.data || response)),
      catchError(error => {
        console.error('Error fetching today schedule:', error);
        return [];
      })
    );
  }

  private mapAppointmentsToSchedule(appointments: any[]): TodaySchedule[] {
    return appointments.map(apt => ({
      id: apt.id,
      patientName: apt.patientName || `Patient ${apt.patientId}`,
      time: new Date(apt.appointmentDateTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      type: apt.appointmentType || 'consultation',
      status: this.mapAppointmentStatus(apt.status),
      tokenNumber: apt.token?.tokenNumber?.toString(),
      patientId: apt.patientId,
      priority: apt.priority || 'medium',
      estimatedDuration: apt.durationMinutes || 30
    }));
  }

  private mapAppointmentStatus(status: string): 'scheduled' | 'in-progress' | 'completed' | 'no-show' {
    switch (status?.toUpperCase()) {
      case 'BOOKED':
      case 'CONFIRMED':
      case 'CHECKED_IN':
        return 'scheduled';
      case 'IN_CONSULTATION':
        return 'in-progress';
      case 'COMPLETED':
        return 'completed';
      case 'NO_SHOW':
        return 'no-show';
      default:
        return 'scheduled';
    }
  }

  refreshTodaySchedule(): void {
    this.getTodaySchedule().subscribe({
      next: (schedule) => this.todaySchedule$.next(schedule),
      error: (error) => console.error('Error refreshing schedule:', error)
    });
  }

  // Appointment Management
  getAppointmentDetails(appointmentId: string): Observable<Appointment> {
    return this.http.get<any>(`${this.apiUrl}/appointments/${appointmentId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToAppointment(response.data || response))
    );
  }

  startConsultation(appointmentId: string): Observable<Appointment> {
    return this.http.put<any>(`${this.apiUrl}/appointments/${appointmentId}/status`, {
      status: 'IN_CONSULTATION'
    }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToAppointment(response.data || response))
    );
  }

  completeConsultation(appointmentId: string, data: {
    consultationNotes: string;
    diagnosis: string;
    followUpRequired: boolean;
    followUpDate?: Date;
    prescriptionRequired: boolean;
    labTestsRequired: boolean;
  }): Observable<Appointment> {
    return this.http.put<any>(`${this.apiUrl}/appointments/${appointmentId}/status`, {
      status: 'COMPLETED',
      notes: data.consultationNotes,
      diagnosis: data.diagnosis,
      followUpRequired: data.followUpRequired,
      followUpDate: data.followUpDate,
      prescriptionRequired: data.prescriptionRequired,
      labTestsRequired: data.labTestsRequired
    }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToAppointment(response.data || response))
    );
  }

  markNoShow(appointmentId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/appointments/${appointmentId}/status`, {
      status: 'NO_SHOW'
    }, {
      headers: this.getHeaders()
    });
  }

  cancelAppointment(appointmentId: string, reason: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/appointments/${appointmentId}?reason=${encodeURIComponent(reason)}`, {
      headers: this.getHeaders()
    });
  }

  private mapToAppointment(data: any): Appointment {
    return {
      id: data.id,
      patientId: data.patientId,
      patientName: data.patientName || `Patient ${data.patientId}`,
      patientPhone: data.patientPhone || '',
      appointmentDate: new Date(data.appointmentDateTime),
      appointmentTime: new Date(data.appointmentDateTime).toLocaleTimeString(),
      duration: data.durationMinutes || 30,
      type: data.appointmentType as any || 'consultation',
      status: this.mapAppointmentStatus(data.status) as any,
      tokenNumber: data.token?.tokenNumber?.toString(),
      notes: data.notes,
      symptoms: data.symptoms,
      priority: data.priority as any || 'medium',
      branchId: data.branchId,
      roomNumber: data.roomId,
      estimatedDuration: data.durationMinutes || 30,
      actualDuration: data.actualDuration,
      consultationNotes: data.consultationNotes,
      followUpRequired: data.followUpRequired || false,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      prescriptionId: data.prescriptionId,
      labRequestIds: data.labRequestIds || []
    };
  }

  // Consultation Management
  getCurrentConsultation(): Observable<Appointment | null> {
    return this.currentAppointment$.asObservable();
  }

  setCurrentConsultation(appointment: Appointment): void {
    this.currentAppointment$.next(appointment);
  }

  clearCurrentConsultation(): void {
    this.currentAppointment$.next(null);
  }

  updateConsultationNotes(appointmentId: string, notes: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${appointmentId}/notes`, {
      consultationNotes: notes,
      lastUpdated: new Date().toISOString()
    });
  }

  // Patient History for Appointments
  getPatientAppointmentHistory(patientId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/patient/${patientId}/history`);
  }

  getPatientLastVisit(patientId: string): Observable<Appointment | null> {
    return this.http.get<Appointment | null>(`${this.apiUrl}/patient/${patientId}/last-visit`);
  }

  // Scheduling Assistance
  getAvailableSlots(date: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/available-slots/${date}`);
  }

  suggestRescheduleSlots(appointmentId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${appointmentId}/reschedule-suggestions`);
  }

  // Emergency Appointments
  insertEmergencyAppointment(patientId: string, reason: string): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/emergency`, {
      patientId,
      reason,
      priority: 'urgent',
      type: 'emergency',
      insertTime: new Date().toISOString()
    });
  }

  // Follow-up Management
  scheduleFollowUp(appointmentId: string, followUpData: {
    date: Date;
    type: string;
    notes: string;
    duration: number;
  }): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/${appointmentId}/follow-up`, followUpData);
  }

  getUpcomingFollowUps(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/follow-ups/upcoming`);
  }

  getDueFollowUps(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/follow-ups/due`);
  }

  // Real-time Updates
  getAppointmentUpdates(): Observable<AppointmentUpdate> {
    // WebSocket implementation for real-time appointment updates
    return new Observable(observer => {
      // WebSocket connection logic here
      // This would listen for appointment status changes, new appointments, etc.
    });
  }

  // Statistics and Analytics
  getTodayStats(): Observable<{
    total: number;
    completed: number;
    inProgress: number;
    scheduled: number;
    noShows: number;
    cancelled: number;
  }> {
    return this.http.get(`${this.apiUrl}/stats/today`);
  }

  getWeeklyStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/weekly`);
  }

  getMonthlyStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/monthly`);
  }

  // Time Management
  getAverageConsultationTime(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/stats/average-consultation-time`);
  }

  getConsultationTimeByType(): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(`${this.apiUrl}/stats/consultation-time-by-type`);
  }

  // Search and Filter
  searchAppointments(query: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    type?: string;
  }): Observable<Appointment[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<Appointment[]>(`${this.apiUrl}/search?${params.toString()}`);
  }

  // Bulk Operations
  bulkUpdateAppointments(appointmentIds: string[], updates: Partial<Appointment>): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk-update`, {
      appointmentIds,
      updates
    });
  }

  // Integration with Queue System
  linkAppointmentToToken(appointmentId: string, tokenId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${appointmentId}/link-token`, { tokenId });
  }

  getAppointmentByToken(tokenId: string): Observable<Appointment | null> {
    return this.http.get<Appointment | null>(`${this.apiUrl}/by-token/${tokenId}`);
  }
}