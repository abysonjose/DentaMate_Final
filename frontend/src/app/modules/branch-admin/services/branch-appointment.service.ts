import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface BranchAppointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  type: 'consultation' | 'follow-up' | 'emergency' | 'procedure';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BranchAppointmentService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin/appointments`;

  constructor(private http: HttpClient) {}

  getAllAppointments(date?: string): Observable<BranchAppointment[]> {
    const params = date ? `?date=${date}` : '';
    return this.http.get<BranchAppointment[]>(`${this.apiUrl}${params}`);
  }

  getAppointmentsByDoctor(doctorId: string, date?: string): Observable<BranchAppointment[]> {
    const params = date ? `?date=${date}` : '';
    return this.http.get<BranchAppointment[]>(`${this.apiUrl}/doctor/${doctorId}${params}`);
  }

  getAppointmentsByDepartment(department: string, date?: string): Observable<BranchAppointment[]> {
    const params = date ? `?date=${date}` : '';
    return this.http.get<BranchAppointment[]>(`${this.apiUrl}/department/${encodeURIComponent(department)}${params}`);
  }

  reassignAppointment(appointmentId: string, newDoctorId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${appointmentId}/reassign`, { doctorId: newDoctorId });
  }

  updateAppointmentStatus(appointmentId: string, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${appointmentId}/status`, { status });
  }

  getAppointmentConflicts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conflicts`);
  }

  getAppointmentAnalytics(period: string = '7d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics?period=${period}`);
  }
}