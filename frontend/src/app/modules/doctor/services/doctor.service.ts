import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

  constructor(private http: HttpClient) {
    this.loadDoctorProfile();
    this.loadNotifications();
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
}