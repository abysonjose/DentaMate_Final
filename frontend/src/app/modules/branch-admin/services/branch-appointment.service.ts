import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface BranchAppointment {
  id: string;
  tenantId: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  clinicId: string;
  branchId: string;
  departmentId?: string;
  departmentName?: string;
  roomId?: string;
  appointmentDateTime: Date;
  durationMinutes: number;
  appointmentType: 'consultation' | 'follow_up' | 'procedure' | 'emergency' | 'walk_in' | 'routine_checkup' | 'orthodontic' | 'surgery';
  status: 'booked' | 'confirmed' | 'checked_in' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  priority: string;
  reason?: string;
  notes?: string;
  token?: {
    tokenId: string;
    tokenNumber: number;
    tokenStatus: string;
    estimatedWaitTime: number;
    checkedInAt?: Date;
  };
  isRecurring: boolean;
  recurrencePattern?: string;
  recurrenceInterval?: number;
  recurrenceEndDate?: Date;
  parentAppointmentId?: string;
  estimatedCost?: number;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  clinicId: string;
  branchId?: string;
  departmentId?: string;
  roomId?: string;
  appointmentDateTime: Date;
  durationMinutes?: number;
  appointmentType: string;
  priority?: string;
  reason?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurrenceInterval?: number;
  recurrenceEndDate?: Date;
  estimatedCost?: number;
  isWalkIn?: boolean;
}

export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  isAvailable: boolean;
  slotType: string;
  unavailabilityReason?: string;
}

export interface AvailableSlotsResponse {
  date: string;
  doctorId: string;
  doctorName: string;
  departmentId?: string;
  departmentName?: string;
  availableSlots: AvailableSlot[];
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
}

export interface QueueSummary {
  doctorId: string;
  date: string;
  waiting: number;
  inProgress: number;
  completed: number;
  skipped: number;
  cancelled: number;
  total: number;
  currentToken?: number;
  nextToken?: number;
}

export interface AppointmentAnalytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  completionRate: number;
  noShowRate: number;
  averageWaitTime: number;
  peakHours: { hour: number; count: number }[];
  appointmentsByType: { type: string; count: number }[];
  appointmentsByDoctor: { doctorId: string; doctorName: string; count: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class BranchAppointmentService {
  private readonly appointmentApiUrl = `${environment.apiUrl}/appointment-service/api/v1/appointments`;
  private readonly scheduleApiUrl = `${environment.apiUrl}/appointment-service/api/v1/schedules`;
  private readonly tokenApiUrl = `${environment.apiUrl}/appointment-service/api/v1/tokens`;

  constructor(private http: HttpClient) {}

  // Appointment Management
  createAppointment(request: CreateAppointmentRequest): Observable<BranchAppointment> {
    return this.http.post<BranchAppointment>(this.appointmentApiUrl, request);
  }

  getAppointment(appointmentId: string): Observable<BranchAppointment> {
    return this.http.get<BranchAppointment>(`${this.appointmentApiUrl}/${appointmentId}`);
  }

  updateAppointmentStatus(appointmentId: string, status: string): Observable<BranchAppointment> {
    return this.http.put<BranchAppointment>(`${this.appointmentApiUrl}/${appointmentId}/status`, { status });
  }

  rescheduleAppointment(appointmentId: string, newDateTime: Date, reason?: string): Observable<BranchAppointment> {
    return this.http.put<BranchAppointment>(`${this.appointmentApiUrl}/${appointmentId}/reschedule`, {
      newDateTime: newDateTime.toISOString(),
      reason
    });
  }

  cancelAppointment(appointmentId: string, reason?: string): Observable<void> {
    const params = reason ? new HttpParams().set('reason', reason) : new HttpParams();
    return this.http.delete<void>(`${this.appointmentApiUrl}/${appointmentId}`, { params });
  }

  // Get appointments by various filters
  getAppointmentsByPatient(patientId: string, page: number = 0, size: number = 20): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', 'appointmentDateTime')
      .set('sortDir', 'desc');
    return this.http.get(`${this.appointmentApiUrl}/patient/${patientId}`, { params });
  }

  getAppointmentsByDoctor(doctorId: string, page: number = 0, size: number = 20): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', 'appointmentDateTime')
      .set('sortDir', 'asc');
    return this.http.get(`${this.appointmentApiUrl}/doctor/${doctorId}`, { params });
  }

  getAppointmentsByDateRange(startDate: Date, endDate: Date): Observable<BranchAppointment[]> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get<BranchAppointment[]>(`${this.appointmentApiUrl}/date-range`, { params });
  }

  getTodayAppointmentsByDoctor(doctorId: string): Observable<BranchAppointment[]> {
    return this.http.get<BranchAppointment[]>(`${this.appointmentApiUrl}/doctor/${doctorId}/today`);
  }

  createWalkInAppointment(patientId: string, doctorId: string, clinicId: string, appointmentType: string = 'walk_in'): Observable<BranchAppointment> {
    return this.http.post<BranchAppointment>(`${this.appointmentApiUrl}/walk-in`, {
      patientId,
      doctorId,
      clinicId,
      appointmentType
    });
  }

  // Schedule Management
  getAvailableSlots(doctorId: string, date: Date, duration?: number): Observable<AvailableSlotsResponse> {
    let params = new HttpParams().set('date', date.toISOString().split('T')[0]);
    if (duration) {
      params = params.set('duration', duration.toString());
    }
    return this.http.get<AvailableSlotsResponse>(`${this.scheduleApiUrl}/doctor/${doctorId}/slots`, { params });
  }

  getAvailableSlotsByClinic(clinicId: string, date: Date, duration?: number): Observable<AvailableSlotsResponse[]> {
    let params = new HttpParams().set('date', date.toISOString().split('T')[0]);
    if (duration) {
      params = params.set('duration', duration.toString());
    }
    return this.http.get<AvailableSlotsResponse[]>(`${this.scheduleApiUrl}/clinic/${clinicId}/slots`, { params });
  }

  findNextAvailableSlot(doctorId: string, duration: number = 30): Observable<any> {
    const params = new HttpParams().set('duration', duration.toString());
    return this.http.get(`${this.scheduleApiUrl}/doctor/${doctorId}/next-available`, { params });
  }

  createDoctorSchedule(doctorId: string, clinicId: string, date: Date, startTime: string, endTime: string): Observable<any> {
    return this.http.post(`${this.scheduleApiUrl}/doctor/${doctorId}`, {
      clinicId,
      date: date.toISOString().split('T')[0],
      startTime,
      endTime
    });
  }

  blockTimeSlot(doctorId: string, date: Date, startTime: string, endTime: string, reason: string): Observable<any> {
    return this.http.post(`${this.scheduleApiUrl}/doctor/${doctorId}/block`, {
      date: date.toISOString().split('T')[0],
      startTime,
      endTime,
      reason
    });
  }

  addBreak(doctorId: string, date: Date, startTime: string, endTime: string, reason: string = 'Break'): Observable<any> {
    return this.http.post(`${this.scheduleApiUrl}/doctor/${doctorId}/break`, {
      date: date.toISOString().split('T')[0],
      startTime,
      endTime,
      reason
    });
  }

  markDoctorUnavailable(doctorId: string, date: Date, reason: string): Observable<any> {
    return this.http.post(`${this.scheduleApiUrl}/doctor/${doctorId}/unavailable`, {
      date: date.toISOString().split('T')[0],
      reason
    });
  }

  checkDoctorAvailability(doctorId: string, appointmentTime: Date, duration: number = 30): Observable<any> {
    const params = new HttpParams()
      .set('appointmentTime', appointmentTime.toISOString())
      .set('duration', duration.toString());
    return this.http.get(`${this.scheduleApiUrl}/doctor/${doctorId}/availability`, { params });
  }

  getAvailableDoctors(date: Date, clinicId?: string): Observable<any[]> {
    let params = new HttpParams().set('date', date.toISOString().split('T')[0]);
    if (clinicId) {
      params = params.set('clinicId', clinicId);
    }
    return this.http.get<any[]>(`${this.scheduleApiUrl}/available-doctors`, { params });
  }

  // Token/Queue Management
  getCurrentToken(doctorId: string, date?: Date): Observable<any> {
    const queryDate = date || new Date();
    const params = new HttpParams().set('date', queryDate.toISOString().split('T')[0]);
    return this.http.get(`${this.tokenApiUrl}/doctor/${doctorId}/current`, { params });
  }

  getNextToken(doctorId: string, date?: Date): Observable<any> {
    const queryDate = date || new Date();
    const params = new HttpParams().set('date', queryDate.toISOString().split('T')[0]);
    return this.http.get(`${this.tokenApiUrl}/doctor/${doctorId}/next`, { params });
  }

  callNextToken(doctorId: string, date?: Date): Observable<any> {
    const queryDate = date || new Date();
    const params = new HttpParams().set('date', queryDate.toISOString().split('T')[0]);
    return this.http.post(`${this.tokenApiUrl}/doctor/${doctorId}/call-next`, {}, { params });
  }

  updateTokenStatus(tokenId: string, status: string): Observable<any> {
    return this.http.put(`${this.tokenApiUrl}/${tokenId}/status`, { status });
  }

  skipToken(tokenId: string): Observable<any> {
    return this.http.post(`${this.tokenApiUrl}/${tokenId}/skip`, {});
  }

  cancelToken(tokenId: string): Observable<any> {
    return this.http.delete(`${this.tokenApiUrl}/${tokenId}`);
  }

  getWaitingTokens(doctorId: string, date?: Date): Observable<any[]> {
    const queryDate = date || new Date();
    const params = new HttpParams().set('date', queryDate.toISOString().split('T')[0]);
    return this.http.get<any[]>(`${this.tokenApiUrl}/doctor/${doctorId}/waiting`, { params });
  }

  getTokensByDoctor(doctorId: string, date?: Date): Observable<any[]> {
    const queryDate = date || new Date();
    const params = new HttpParams().set('date', queryDate.toISOString().split('T')[0]);
    return this.http.get<any[]>(`${this.tokenApiUrl}/doctor/${doctorId}`, { params });
  }

  getTokensByStatus(doctorId: string, status: string, date?: Date): Observable<any[]> {
    const queryDate = date || new Date();
    const params = new HttpParams().set('date', queryDate.toISOString().split('T')[0]);
    return this.http.get<any[]>(`${this.tokenApiUrl}/doctor/${doctorId}/status/${status}`, { params });
  }

  getQueueSummary(doctorId: string, date?: Date): Observable<QueueSummary> {
    const queryDate = date || new Date();
    const params = new HttpParams().set('date', queryDate.toISOString().split('T')[0]);
    return this.http.get<QueueSummary>(`${this.tokenApiUrl}/doctor/${doctorId}/queue-summary`, { params });
  }

  reorderTokens(doctorId: string, tokenIds: string[], date?: Date): Observable<any> {
    const queryDate = date || new Date();
    return this.http.post(`${this.tokenApiUrl}/doctor/${doctorId}/reorder`, {
      date: queryDate.toISOString().split('T')[0],
      tokenIds
    });
  }

  // Analytics and Reporting
  getAppointmentAnalytics(startDate: Date, endDate: Date, doctorId?: string, departmentId?: string): Observable<AppointmentAnalytics> {
    return this.getAppointmentsByDateRange(startDate, endDate).pipe(
      map(appointments => this.calculateAnalytics(appointments, doctorId, departmentId))
    );
  }

  getAppointmentConflicts(date?: Date): Observable<BranchAppointment[]> {
    const queryDate = date || new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getAppointmentsByDateRange(startOfDay, endOfDay).pipe(
      map(appointments => this.findConflicts(appointments))
    );
  }

  // Utility methods
  private calculateAnalytics(appointments: BranchAppointment[], doctorId?: string, departmentId?: string): AppointmentAnalytics {
    let filteredAppointments = appointments;
    
    if (doctorId) {
      filteredAppointments = filteredAppointments.filter(apt => apt.doctorId === doctorId);
    }
    
    if (departmentId) {
      filteredAppointments = filteredAppointments.filter(apt => apt.departmentId === departmentId);
    }

    const total = filteredAppointments.length;
    const completed = filteredAppointments.filter(apt => apt.status === 'completed').length;
    const cancelled = filteredAppointments.filter(apt => apt.status === 'cancelled').length;
    const noShow = filteredAppointments.filter(apt => apt.status === 'no_show').length;

    // Calculate peak hours
    const hourCounts: { [hour: number]: number } = {};
    filteredAppointments.forEach(apt => {
      const hour = new Date(apt.appointmentDateTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);

    // Calculate appointments by type
    const typeCounts: { [type: string]: number } = {};
    filteredAppointments.forEach(apt => {
      typeCounts[apt.appointmentType] = (typeCounts[apt.appointmentType] || 0) + 1;
    });

    const appointmentsByType = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }));

    // Calculate appointments by doctor
    const doctorCounts: { [doctorId: string]: { name: string; count: number } } = {};
    filteredAppointments.forEach(apt => {
      if (!doctorCounts[apt.doctorId]) {
        doctorCounts[apt.doctorId] = { name: apt.doctorName || apt.doctorId, count: 0 };
      }
      doctorCounts[apt.doctorId].count++;
    });

    const appointmentsByDoctor = Object.entries(doctorCounts)
      .map(([doctorId, data]) => ({ doctorId, doctorName: data.name, count: data.count }));

    return {
      totalAppointments: total,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      noShowAppointments: noShow,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      averageWaitTime: 0, // This would need to be calculated from token data
      peakHours,
      appointmentsByType,
      appointmentsByDoctor
    };
  }

  private findConflicts(appointments: BranchAppointment[]): BranchAppointment[] {
    const conflicts: BranchAppointment[] = [];
    
    for (let i = 0; i < appointments.length; i++) {
      for (let j = i + 1; j < appointments.length; j++) {
        const apt1 = appointments[i];
        const apt2 = appointments[j];
        
        // Check if same doctor and overlapping times
        if (apt1.doctorId === apt2.doctorId) {
          const start1 = new Date(apt1.appointmentDateTime);
          const end1 = new Date(start1.getTime() + apt1.durationMinutes * 60000);
          const start2 = new Date(apt2.appointmentDateTime);
          const end2 = new Date(start2.getTime() + apt2.durationMinutes * 60000);
          
          if (start1 < end2 && start2 < end1) {
            if (!conflicts.find(c => c.id === apt1.id)) conflicts.push(apt1);
            if (!conflicts.find(c => c.id === apt2.id)) conflicts.push(apt2);
          }
        }
      }
    }
    
    return conflicts;
  }

  // Legacy methods for backward compatibility
  getAllAppointments(date?: string): Observable<BranchAppointment[]> {
    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(queryDate);
      endOfDay.setHours(23, 59, 59, 999);
      return this.getAppointmentsByDateRange(startOfDay, endOfDay);
    } else {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      return this.getAppointmentsByDateRange(startOfDay, endOfDay);
    }
  }

  getAppointmentsByDepartment(departmentId: string, date?: string): Observable<BranchAppointment[]> {
    const queryDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getAppointmentsByDateRange(startOfDay, endOfDay).pipe(
      map(appointments => appointments.filter(apt => apt.departmentId === departmentId))
    );
  }

  reassignAppointment(appointmentId: string, newDoctorId: string): Observable<void> {
    // This would need to be implemented as a reschedule operation
    // For now, we'll return an error as this specific operation isn't supported
    throw new Error('Reassignment not supported. Use reschedule instead.');
  }
}