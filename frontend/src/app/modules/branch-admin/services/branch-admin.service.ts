import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface BranchProfile {
  id: string;
  name: string;
  code: string;
  clinicId: string;
  clinicName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone: string;
  email: string;
  workingHours: {
    [key: string]: { open: string; close: string; isOpen: boolean };
  };
  departments: string[];
  totalRooms: number;
  activeRooms: number;
  branchAdminId: string;
  branchAdminName: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
}

export interface DashboardStats {
  todayAppointments: number;
  activeDoctors: number;
  queueLength: number;
  completedConsultations: number;
  totalStaff: number;
  activeStaff: number;
  todayRevenue: number;
  pendingBills: number;
  lowStockItems: number;
  criticalAlerts: number;
}

export interface BranchAlert {
  id: string;
  type: 'doctor_absence' | 'queue_overload' | 'appointment_delay' | 'system_issue' | 'inventory_low' | 'billing_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionRequired: boolean;
  relatedEntity?: {
    type: 'doctor' | 'appointment' | 'queue' | 'inventory' | 'billing';
    id: string;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BranchAdminService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin`;
  private alertsSubject = new BehaviorSubject<BranchAlert[]>([]);
  private currentBranchSubject = new BehaviorSubject<BranchProfile | null>(null);
  
  public alerts$ = this.alertsSubject.asObservable();
  public currentBranch$ = this.currentBranchSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadBranchProfile();
    this.loadBranchAlerts();
  }

  // Branch Profile Management
  getBranchProfile(): Observable<BranchProfile> {
    return this.http.get<BranchProfile>(`${this.apiUrl}/profile`);
  }

  updateBranchProfile(profile: Partial<BranchProfile>): Observable<BranchProfile> {
    return this.http.put<BranchProfile>(`${this.apiUrl}/profile`, profile);
  }

  // Dashboard Statistics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  getTodayOverview(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/today-overview`);
  }

  // Branch Alerts Management
  getBranchAlerts(): Observable<BranchAlert[]> {
    return this.http.get<BranchAlert[]>(`${this.apiUrl}/alerts`);
  }

  markAlertAsRead(alertId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/alerts/${alertId}/read`, {});
  }

  dismissAlert(alertId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/alerts/${alertId}`);
  }

  createAlert(alert: Partial<BranchAlert>): Observable<BranchAlert> {
    return this.http.post<BranchAlert>(`${this.apiUrl}/alerts`, alert);
  }

  // Working Hours Management
  updateWorkingHours(workingHours: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/working-hours`, { workingHours });
  }

  getHolidayCalendar(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/holidays`);
  }

  updateHolidayCalendar(holidays: any[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/holidays`, { holidays });
  }

  // Department Management
  getDepartments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/departments`);
  }

  updateDepartmentTimings(departmentId: string, timings: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/departments/${departmentId}/timings`, timings);
  }

  // Room Management
  getRooms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rooms`);
  }

  updateRoomStatus(roomId: string, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/rooms/${roomId}/status`, { status });
  }

  // Performance Analytics
  getBranchPerformance(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/performance?period=${period}`);
  }

  getStaffPerformance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/staff-performance`);
  }

  getDoctorUtilization(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/doctor-utilization`);
  }

  // Incident Reporting
  reportIncident(incident: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/incidents`, incident);
  }

  getIncidents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/incidents`);
  }

  updateIncidentStatus(incidentId: string, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/incidents/${incidentId}/status`, { status });
  }

  // Communication with Central Admin
  sendMessageToCentralAdmin(message: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/central-admin/message`, message);
  }

  getCentralAdminMessages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/central-admin/messages`);
  }

  // Branch Configuration (Read-Only)
  getBranchConfiguration(): Observable<any> {
    return this.http.get(`${this.apiUrl}/configuration`);
  }

  getEnabledFeatures(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/features`);
  }

  // Real-time Updates
  subscribeToRealTimeUpdates(): Observable<any> {
    // This would typically use WebSocket or Server-Sent Events
    return this.http.get(`${this.apiUrl}/realtime/subscribe`);
  }

  private loadBranchProfile(): void {
    // Mock data for now - replace with real API call
    const mockProfile: BranchProfile = {
      id: 'branch-001',
      name: 'Downtown Dental - Main Branch',
      code: 'DDC-MAIN',
      clinicId: 'clinic-001',
      clinicName: 'Downtown Dental Clinic',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      phone: '+1-555-0123',
      email: 'main@downtown-dental.com',
      workingHours: {
        monday: { open: '08:00', close: '18:00', isOpen: true },
        tuesday: { open: '08:00', close: '18:00', isOpen: true },
        wednesday: { open: '08:00', close: '18:00', isOpen: true },
        thursday: { open: '08:00', close: '18:00', isOpen: true },
        friday: { open: '08:00', close: '17:00', isOpen: true },
        saturday: { open: '09:00', close: '15:00', isOpen: true },
        sunday: { open: '00:00', close: '00:00', isOpen: false }
      },
      departments: ['General Dentistry', 'Orthodontics', 'Oral Surgery', 'Pediatric Dentistry'],
      totalRooms: 8,
      activeRooms: 6,
      branchAdminId: 'admin-001',
      branchAdminName: 'John Smith',
      timezone: 'America/New_York',
      isActive: true,
      createdAt: new Date('2024-01-15')
    };
    
    this.currentBranchSubject.next(mockProfile);
  }

  private loadBranchAlerts(): void {
    // Mock alerts for now - replace with real API call
    const mockAlerts: BranchAlert[] = [
      {
        id: '1',
        type: 'doctor_absence',
        severity: 'high',
        title: 'Doctor Absence Alert',
        message: 'Dr. Sarah Johnson is absent today. 8 appointments need reassignment.',
        timestamp: new Date(),
        isRead: false,
        actionRequired: true,
        relatedEntity: {
          type: 'doctor',
          id: 'doc-001',
          name: 'Dr. Sarah Johnson'
        }
      },
      {
        id: '2',
        type: 'queue_overload',
        severity: 'medium',
        title: 'Queue Overload',
        message: 'General Dentistry queue has 15+ patients waiting. Consider opening additional room.',
        timestamp: new Date(Date.now() - 1800000),
        isRead: false,
        actionRequired: true,
        relatedEntity: {
          type: 'queue',
          id: 'queue-general',
          name: 'General Dentistry Queue'
        }
      },
      {
        id: '3',
        type: 'inventory_low',
        severity: 'medium',
        title: 'Low Stock Alert',
        message: '5 items are running low in stock. Reorder required.',
        timestamp: new Date(Date.now() - 3600000),
        isRead: true,
        actionRequired: true,
        relatedEntity: {
          type: 'inventory',
          id: 'inv-001',
          name: 'Dental Supplies'
        }
      }
    ];
    
    this.alertsSubject.next(mockAlerts);
  }

  getCurrentBranch(): BranchProfile | null {
    return this.currentBranchSubject.value;
  }

  getUnreadAlertsCount(): number {
    return this.alertsSubject.value.filter(alert => !alert.isRead).length;
  }

  getCriticalAlertsCount(): number {
    return this.alertsSubject.value.filter(alert => alert.severity === 'critical').length;
  }
}