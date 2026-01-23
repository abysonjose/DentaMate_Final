import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  branchId: string;
  departmentId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  duration: number;
  type: 'consultation' | 'follow-up' | 'emergency' | 'procedure';
  status: 'scheduled' | 'confirmed' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  symptoms?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  startTime: string;
  duration: number;
  type: string;
  priority?: string;
  notes?: string;
  symptoms?: string;
}

export interface AppointmentSlot {
  doctorId: string;
  doctorName: string;
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
  duration: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  available: boolean;
  workingHours: {
    start: string;
    end: string;
    days: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly apiUrl = `${environment.apiUrl}/appointments`;
  
  private todayAppointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  public todayAppointments$ = this.todayAppointmentsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Appointment Creation
  createAppointment(request: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}`, request);
  }

  // Quick Appointment Booking
  quickBookAppointment(patientId: string, doctorId: string, preferredDate?: Date): Observable<{
    appointment: Appointment;
    availableSlots: AppointmentSlot[];
  }> {
    return this.http.post<{
      appointment: Appointment;
      availableSlots: AppointmentSlot[];
    }>(`${this.apiUrl}/quick-book`, {
      patientId,
      doctorId,
      preferredDate: preferredDate?.toISOString()
    });
  }

  // Get Available Slots
  getAvailableSlots(doctorId: string, date: Date, duration: number = 30): Observable<AppointmentSlot[]> {
    const params = new HttpParams()
      .set('doctorId', doctorId)
      .set('date', date.toISOString().split('T')[0])
      .set('duration', duration.toString());
    
    return this.http.get<AppointmentSlot[]>(`${this.apiUrl}/available-slots`, { params });
  }

  // Get Available Doctors
  getAvailableDoctors(date?: Date, specialization?: string): Observable<Doctor[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date.toISOString().split('T')[0]);
    }
    if (specialization) {
      params = params.set('specialization', specialization);
    }
    return this.http.get<Doctor[]>(`${this.apiUrl}/available-doctors`, { params });
  }

  // Appointment Retrieval
  getAppointmentById(appointmentId: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/${appointmentId}`);
  }

  getTodayAppointments(): Observable<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    const params = new HttpParams().set('date', today);
    return this.http.get<Appointment[]>(`${this.apiUrl}/by-date`, { params });
  }

  getPatientTodayAppointments(patientId: string): Observable<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    const params = new HttpParams()
      .set('patientId', patientId)
      .set('date', today);
    return this.http.get<Appointment[]>(`${this.apiUrl}/patient-appointments`, { params });
  }

  getPatientAppointments(patientId: string, startDate?: Date, endDate?: Date): Observable<Appointment[]> {
    let params = new HttpParams().set('patientId', patientId);
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<Appointment[]>(`${this.apiUrl}/patient/${patientId}`, { params });
  }

  getDoctorAppointments(doctorId: string, date?: Date): Observable<Appointment[]> {
    let params = new HttpParams().set('doctorId', doctorId);
    if (date) {
      params = params.set('date', date.toISOString().split('T')[0]);
    }
    return this.http.get<Appointment[]>(`${this.apiUrl}/doctor/${doctorId}`, { params });
  }

  // Appointment Modification
  updateAppointment(appointmentId: string, updates: Partial<Appointment>): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/${appointmentId}`, updates);
  }

  rescheduleAppointment(appointmentId: string, newDate: Date, newTime: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${appointmentId}/reschedule`, {
      newDate: newDate.toISOString(),
      newTime
    });
  }

  cancelAppointment(appointmentId: string, reason: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/${appointmentId}/cancel`, {
      reason
    });
  }

  // Appointment Status Management
  confirmAppointment(appointmentId: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${appointmentId}/confirm`, {});
  }

  markAsNoShow(appointmentId: string, notes?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${appointmentId}/no-show`, { notes });
  }

  markAsCompleted(appointmentId: string, notes?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${appointmentId}/complete`, { notes });
  }

  // Walk-in Appointments
  createWalkInAppointment(patientId: string, doctorId: string, priority: string = 'normal'): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/walk-in`, {
      patientId,
      doctorId,
      priority,
      type: 'consultation'
    });
  }

  // Appointment Search and Filtering
  searchAppointments(criteria: {
    patientName?: string;
    doctorName?: string;
    date?: Date;
    status?: string;
    type?: string;
  }): Observable<Appointment[]> {
    let params = new HttpParams();
    Object.keys(criteria).forEach(key => {
      const value = criteria[key as keyof typeof criteria];
      if (value) {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<Appointment[]>(`${this.apiUrl}/search`, { params });
  }

  // Appointment Statistics
  getAppointmentStats(date?: Date): Observable<{
    total: number;
    scheduled: number;
    confirmed: number;
    checkedIn: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    noShow: number;
    walkIns: number;
  }> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date.toISOString().split('T')[0]);
    }
    return this.http.get<{
      total: number;
      scheduled: number;
      confirmed: number;
      checkedIn: number;
      inProgress: number;
      completed: number;
      cancelled: number;
      noShow: number;
      walkIns: number;
    }>(`${this.apiUrl}/stats`, { params });
  }

  // Appointment Validation
  validateAppointmentSlot(doctorId: string, date: Date, startTime: string, duration: number): Observable<{
    available: boolean;
    conflicts: Appointment[];
    suggestions: AppointmentSlot[];
  }> {
    return this.http.post<{
      available: boolean;
      conflicts: Appointment[];
      suggestions: AppointmentSlot[];
    }>(`${this.apiUrl}/validate-slot`, {
      doctorId,
      date: date.toISOString(),
      startTime,
      duration
    });
  }

  // Bulk Operations
  bulkUpdateAppointments(appointmentIds: string[], updates: Partial<Appointment>): Observable<{
    updated: number;
    failed: number;
    errors: string[];
  }> {
    return this.http.put<{
      updated: number;
      failed: number;
      errors: string[];
    }>(`${this.apiUrl}/bulk-update`, {
      appointmentIds,
      updates
    });
  }

  bulkCancelAppointments(appointmentIds: string[], reason: string): Observable<{
    cancelled: number;
    failed: number;
    errors: string[];
  }> {
    return this.http.patch<{
      cancelled: number;
      failed: number;
      errors: string[];
    }>(`${this.apiUrl}/bulk-cancel`, {
      appointmentIds,
      reason
    });
  }

  // Appointment Reminders
  sendAppointmentReminder(appointmentId: string, method: 'sms' | 'email' | 'whatsapp'): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/${appointmentId}/remind`, { method });
  }

  // Appointment History
  getAppointmentHistory(patientId: string, limit: number = 10): Observable<Appointment[]> {
    const params = new HttpParams()
      .set('patientId', patientId)
      .set('limit', limit.toString());
    return this.http.get<Appointment[]>(`${this.apiUrl}/history`, { params });
  }

  // Emergency Appointments
  createEmergencyAppointment(patientId: string, symptoms: string, severity: 'low' | 'medium' | 'high' | 'critical'): Observable<{
    appointment: Appointment;
    estimatedWaitTime: number;
    assignedDoctor: Doctor;
  }> {
    return this.http.post<{
      appointment: Appointment;
      estimatedWaitTime: number;
      assignedDoctor: Doctor;
    }>(`${this.apiUrl}/emergency`, {
      patientId,
      symptoms,
      severity
    });
  }

  // Appointment Conflicts
  checkAppointmentConflicts(doctorId: string, date: Date, startTime: string, duration: number, excludeAppointmentId?: string): Observable<{
    hasConflicts: boolean;
    conflicts: Appointment[];
  }> {
    let params = new HttpParams()
      .set('doctorId', doctorId)
      .set('date', date.toISOString())
      .set('startTime', startTime)
      .set('duration', duration.toString());
    
    if (excludeAppointmentId) {
      params = params.set('excludeAppointmentId', excludeAppointmentId);
    }

    return this.http.get<{
      hasConflicts: boolean;
      conflicts: Appointment[];
    }>(`${this.apiUrl}/check-conflicts`, { params });
  }

  // Real-time Updates
  subscribeToAppointmentUpdates(): Observable<Appointment> {
    // WebSocket implementation for real-time appointment updates
    return new Observable(observer => {
      // WebSocket connection logic here
    });
  }

  // Utility Methods
  updateTodayAppointments(appointments: Appointment[]): void {
    this.todayAppointmentsSubject.next(appointments);
  }

  addAppointment(appointment: Appointment): void {
    const current = this.todayAppointmentsSubject.value;
    this.todayAppointmentsSubject.next([...current, appointment]);
  }

  updateAppointmentInList(updatedAppointment: Appointment): void {
    const current = this.todayAppointmentsSubject.value;
    const index = current.findIndex(apt => apt.id === updatedAppointment.id);
    if (index !== -1) {
      current[index] = updatedAppointment;
      this.todayAppointmentsSubject.next([...current]);
    }
  }

  removeAppointmentFromList(appointmentId: string): void {
    const current = this.todayAppointmentsSubject.value;
    const filtered = current.filter(apt => apt.id !== appointmentId);
    this.todayAppointmentsSubject.next(filtered);
  }
}