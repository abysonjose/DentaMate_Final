import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface CentralAppointment {
  id: string;
  tenantId: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  clinicId: string;
  clinicName?: string;
  branchId: string;
  branchName?: string;
  departmentId?: string;
  departmentName?: string;
  appointmentDateTime: Date;
  durationMinutes: number;
  appointmentType: string;
  status: string;
  priority: string;
  reason?: string;
  notes?: string;
  token?: {
    tokenId: string;
    tokenNumber: number;
    tokenStatus: string;
    estimatedWaitTime: number;
  };
  estimatedCost?: number;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface GlobalAppointmentAnalytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  completionRate: number;
  noShowRate: number;
  averageWaitTime: number;
  totalRevenue: number;
  averageAppointmentValue: number;
  
  // Breakdown by clinic
  clinicBreakdown: {
    clinicId: string;
    clinicName: string;
    totalAppointments: number;
    completionRate: number;
    revenue: number;
  }[];
  
  // Breakdown by appointment type
  typeBreakdown: {
    type: string;
    count: number;
    percentage: number;
    averageRevenue: number;
  }[];
  
  // Time-based analytics
  hourlyDistribution: { hour: number; count: number }[];
  dailyTrends: { date: string; count: number; revenue: number }[];
  
  // Performance metrics
  doctorPerformance: {
    doctorId: string;
    doctorName: string;
    clinicName: string;
    totalAppointments: number;
    completionRate: number;
    averageWaitTime: number;
    patientSatisfaction?: number;
  }[];
  
  // Capacity utilization
  capacityUtilization: {
    clinicId: string;
    clinicName: string;
    totalSlots: number;
    bookedSlots: number;
    utilizationRate: number;
  }[];
}

export interface SystemWideMetrics {
  activeAppointments: number;
  waitingPatients: number;
  inConsultation: number;
  completedToday: number;
  averageWaitTime: number;
  systemLoad: number;
  
  // Real-time queue status
  queueStatus: {
    clinicId: string;
    clinicName: string;
    totalWaiting: number;
    averageWaitTime: number;
    doctorsActive: number;
  }[];
  
  // Alerts and notifications
  alerts: {
    type: 'overdue' | 'conflict' | 'capacity' | 'system';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    clinicId?: string;
    appointmentId?: string;
    timestamp: Date;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class CentralAppointmentService {
  private readonly appointmentApiUrl = `${environment.apiUrl}/appointments`;
  private readonly scheduleApiUrl = `${environment.apiUrl}/appointments/schedules`;
  private readonly tokenApiUrl = `${environment.apiUrl}/queue/tokens`;
  private readonly tenantApiUrl = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) {}

  // Global Appointment Management
  getAllAppointments(page: number = 0, size: number = 50, filters?: any): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', 'appointmentDateTime')
      .set('sortDir', 'desc');

    if (filters) {
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.clinicId) params = params.set('clinicId', filters.clinicId);
      if (filters.doctorId) params = params.set('doctorId', filters.doctorId);
    }

    return this.http.get(`${this.appointmentApiUrl}`, { params });
  }

  getAppointmentsByDateRange(startDate: Date, endDate: Date): Observable<CentralAppointment[]> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get<CentralAppointment[]>(`${this.appointmentApiUrl}/date-range`, { params });
  }

  getAppointmentsByClinic(clinicId: string, startDate?: Date, endDate?: Date): Observable<CentralAppointment[]> {
    const today = new Date();
    const start = startDate || new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = endDate || new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return this.getAppointmentsByDateRange(start, end).pipe(
      map(appointments => appointments.filter(apt => apt.clinicId === clinicId))
    );
  }

  // Global Analytics
  getGlobalAnalytics(startDate: Date, endDate: Date): Observable<GlobalAppointmentAnalytics> {
    return this.getAppointmentsByDateRange(startDate, endDate).pipe(
      map(appointments => this.calculateGlobalAnalytics(appointments))
    );
  }

  getSystemWideMetrics(): Observable<SystemWideMetrics> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return this.getAppointmentsByDateRange(startOfDay, endOfDay).pipe(
      map(appointments => this.calculateSystemMetrics(appointments))
    );
  }

  // Clinic Performance Monitoring
  getClinicPerformance(clinicId: string, period: 'day' | 'week' | 'month' = 'week'): Observable<any> {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    return this.getAppointmentsByClinic(clinicId, startDate, endDate).pipe(
      map(appointments => this.calculateClinicPerformance(appointments))
    );
  }

  // Doctor Performance Monitoring
  getDoctorPerformance(doctorId?: string, clinicId?: string, period: 'week' | 'month' = 'week'): Observable<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (period === 'week' ? 7 : 30));

    return this.getAppointmentsByDateRange(startDate, endDate).pipe(
      map(appointments => {
        let filtered = appointments;
        if (doctorId) filtered = filtered.filter(apt => apt.doctorId === doctorId);
        if (clinicId) filtered = filtered.filter(apt => apt.clinicId === clinicId);
        return this.calculateDoctorPerformance(filtered);
      })
    );
  }

  // Capacity Management
  getCapacityUtilization(clinicId?: string, date?: Date): Observable<any> {
    const queryDate = date || new Date();
    
    if (clinicId) {
      return this.http.get(`${this.scheduleApiUrl}/clinic/${clinicId}/slots`, {
        params: new HttpParams().set('date', queryDate.toISOString().split('T')[0])
      }).pipe(
        map((slotsData: any) => this.calculateCapacityUtilization(slotsData))
      );
    } else {
      // Get capacity for all clinics - this would need to be implemented
      // For now, return mock data
      return new Observable(observer => {
        observer.next(this.getMockCapacityData());
        observer.complete();
      });
    }
  }

  getCapacityMetrics(date: Date, clinicId?: string): Observable<any> {
    // Mock implementation for capacity metrics
    return new Observable(observer => {
      const mockData = {
        totalCapacity: 200,
        totalUtilization: 140,
        averageUtilizationRate: 70,
        underutilizedClinics: 1,
        overutilizedClinics: 0,
        clinics: [
          {
            clinicId: 'clinic1',
            clinicName: 'Main Clinic',
            totalCapacity: 120,
            currentUtilization: 95,
            utilizationPercentage: 79,
            availableSlots: 25,
            bookedSlots: 95,
            doctors: this.generateMockDoctorCapacity('clinic1', 6),
            peakHours: this.generateMockPeakHours(),
            recommendations: [
              'Consider adding evening slots',
              'Dr. Smith has high utilization - consider additional support',
              'Peak hours: 10-12 AM and 2-4 PM'
            ]
          }
        ]
      };
      observer.next(mockData);
      observer.complete();
    });
  }

  getAppointmentAnalytics(period: string, clinicId?: string): Observable<any> {
    // Mock implementation for appointment analytics
    return new Observable(observer => {
      const mockData = {
        systemMetrics: {
          totalAppointments: 2450,
          completedAppointments: 2156,
          cancelledAppointments: 196,
          noShowAppointments: 98,
          completionRate: 88,
          cancellationRate: 8,
          noShowRate: 4,
          averageWaitTime: 25,
          averageConsultationTime: 35,
          patientSatisfactionScore: 4.2
        },
        clinicPerformances: [
          {
            clinicId: 'clinic1',
            clinicName: 'Main Clinic',
            metrics: {
              totalAppointments: 1200,
              completedAppointments: 1080,
              cancelledAppointments: 84,
              noShowAppointments: 36,
              completionRate: 90,
              cancellationRate: 7,
              noShowRate: 3,
              averageWaitTime: 22,
              averageConsultationTime: 38,
              patientSatisfactionScore: 4.5
            },
            trends: this.generateMockTrendData(),
            topDoctors: this.generateMockDoctorPerformanceData('clinic1', 5)
          }
        ]
      };
      observer.next(mockData);
      observer.complete();
    });
  }

  // Queue Monitoring
  getGlobalQueueStatus(): Observable<any> {
    // This would aggregate queue data from all clinics
    // For now, return mock data structure
    return new Observable(observer => {
      observer.next(this.getMockQueueStatus());
      observer.complete();
    });
  }

  getQueueStatusByClinic(clinicId: string, date?: Date): Observable<any> {
    const queryDate = date || new Date();
    
    // Get all doctors for the clinic and their queue status
    return this.http.get(`${this.scheduleApiUrl}/available-doctors`, {
      params: new HttpParams()
        .set('date', queryDate.toISOString().split('T')[0])
        .set('clinicId', clinicId)
    }).pipe(
      map((doctors: any[]) => {
        // For each doctor, get their queue summary
        const queuePromises = doctors.map(doctor => 
          this.http.get(`${this.tokenApiUrl}/doctor/${doctor.doctorId}/queue-summary`, {
            params: new HttpParams().set('date', queryDate.toISOString().split('T')[0])
          }).toPromise()
        );
        
        return Promise.all(queuePromises);
      })
    );
  }

  // System Alerts and Monitoring
  getSystemAlerts(): Observable<any[]> {
    // This would check for various system issues
    return this.getSystemWideMetrics().pipe(
      map(metrics => metrics.alerts)
    );
  }

  getAppointmentConflicts(clinicId?: string, date?: Date): Observable<CentralAppointment[]> {
    const queryDate = date || new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getAppointmentsByDateRange(startOfDay, endOfDay).pipe(
      map(appointments => {
        let filtered = appointments;
        if (clinicId) filtered = filtered.filter(apt => apt.clinicId === clinicId);
        return this.findConflicts(filtered);
      })
    );
  }

  // Revenue and Financial Analytics
  getRevenueAnalytics(startDate: Date, endDate: Date, clinicId?: string): Observable<any> {
    return this.getAppointmentsByDateRange(startDate, endDate).pipe(
      map(appointments => {
        let filtered = appointments;
        if (clinicId) filtered = filtered.filter(apt => apt.clinicId === clinicId);
        return this.calculateRevenueAnalytics(filtered);
      })
    );
  }

  // Appointment Trends and Forecasting
  getAppointmentTrends(period: 'week' | 'month' | 'quarter' = 'month', clinicId?: string): Observable<any> {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
    }

    return this.getAppointmentsByDateRange(startDate, endDate).pipe(
      map(appointments => {
        let filtered = appointments;
        if (clinicId) filtered = filtered.filter(apt => apt.clinicId === clinicId);
        return this.calculateTrends(filtered, period);
      })
    );
  }

  // Private calculation methods
  private calculateGlobalAnalytics(appointments: CentralAppointment[]): GlobalAppointmentAnalytics {
    const total = appointments.length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
    const noShow = appointments.filter(apt => apt.status === 'no_show').length;
    
    const totalRevenue = appointments
      .filter(apt => apt.status === 'completed' && apt.estimatedCost)
      .reduce((sum, apt) => sum + (apt.estimatedCost || 0), 0);

    // Clinic breakdown
    const clinicGroups = this.groupBy(appointments, 'clinicId');
    const clinicBreakdown = Object.entries(clinicGroups).map(([clinicId, apts]) => ({
      clinicId,
      clinicName: apts[0]?.clinicName || clinicId,
      totalAppointments: apts.length,
      completionRate: apts.length > 0 ? (apts.filter(apt => apt.status === 'completed').length / apts.length) * 100 : 0,
      revenue: apts.filter(apt => apt.status === 'completed').reduce((sum, apt) => sum + (apt.estimatedCost || 0), 0)
    }));

    // Type breakdown
    const typeGroups = this.groupBy(appointments, 'appointmentType');
    const typeBreakdown = Object.entries(typeGroups).map(([type, apts]) => ({
      type,
      count: apts.length,
      percentage: total > 0 ? (apts.length / total) * 100 : 0,
      averageRevenue: apts.length > 0 ? apts.reduce((sum, apt) => sum + (apt.estimatedCost || 0), 0) / apts.length : 0
    }));

    // Hourly distribution
    const hourCounts: { [hour: number]: number } = {};
    appointments.forEach(apt => {
      const hour = new Date(apt.appointmentDateTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const hourlyDistribution = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => a.hour - b.hour);

    // Daily trends
    const dailyGroups = this.groupBy(appointments, apt => new Date(apt.appointmentDateTime).toDateString());
    const dailyTrends = Object.entries(dailyGroups).map(([date, apts]) => ({
      date,
      count: apts.length,
      revenue: apts.filter(apt => apt.status === 'completed').reduce((sum, apt) => sum + (apt.estimatedCost || 0), 0)
    }));

    // Doctor performance
    const doctorGroups = this.groupBy(appointments, 'doctorId');
    const doctorPerformance = Object.entries(doctorGroups).map(([doctorId, apts]) => ({
      doctorId,
      doctorName: apts[0]?.doctorName || doctorId,
      clinicName: apts[0]?.clinicName || '',
      totalAppointments: apts.length,
      completionRate: apts.length > 0 ? (apts.filter(apt => apt.status === 'completed').length / apts.length) * 100 : 0,
      averageWaitTime: 0, // Would need token data
      patientSatisfaction: undefined
    }));

    return {
      totalAppointments: total,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      noShowAppointments: noShow,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      averageWaitTime: 0, // Would need token data
      totalRevenue,
      averageAppointmentValue: completed > 0 ? totalRevenue / completed : 0,
      clinicBreakdown,
      typeBreakdown,
      hourlyDistribution,
      dailyTrends,
      doctorPerformance,
      capacityUtilization: [] // Would need schedule data
    };
  }

  private calculateSystemMetrics(appointments: CentralAppointment[]): SystemWideMetrics {
    const activeAppointments = appointments.filter(apt => 
      ['booked', 'confirmed', 'checked_in', 'in_consultation'].includes(apt.status)
    ).length;
    
    const waitingPatients = appointments.filter(apt => 
      apt.status === 'checked_in' || (apt.token && apt.token.tokenStatus === 'waiting')
    ).length;
    
    const inConsultation = appointments.filter(apt => 
      apt.status === 'in_consultation' || (apt.token && apt.token.tokenStatus === 'in_progress')
    ).length;
    
    const completedToday = appointments.filter(apt => apt.status === 'completed').length;

    return {
      activeAppointments,
      waitingPatients,
      inConsultation,
      completedToday,
      averageWaitTime: 0, // Would calculate from token data
      systemLoad: Math.min(100, (activeAppointments / Math.max(1, appointments.length)) * 100),
      queueStatus: [], // Would aggregate from clinic data
      alerts: this.generateSystemAlerts(appointments)
    };
  }

  private calculateClinicPerformance(appointments: CentralAppointment[]): any {
    const total = appointments.length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const revenue = appointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + (apt.estimatedCost || 0), 0);

    return {
      totalAppointments: total,
      completedAppointments: completed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      totalRevenue: revenue,
      averageAppointmentValue: completed > 0 ? revenue / completed : 0,
      noShowRate: total > 0 ? (appointments.filter(apt => apt.status === 'no_show').length / total) * 100 : 0
    };
  }

  private calculateDoctorPerformance(appointments: CentralAppointment[]): any {
    const doctorGroups = this.groupBy(appointments, 'doctorId');
    
    return Object.entries(doctorGroups).map(([doctorId, apts]) => ({
      doctorId,
      doctorName: apts[0]?.doctorName || doctorId,
      totalAppointments: apts.length,
      completedAppointments: apts.filter(apt => apt.status === 'completed').length,
      completionRate: apts.length > 0 ? (apts.filter(apt => apt.status === 'completed').length / apts.length) * 100 : 0,
      noShowRate: apts.length > 0 ? (apts.filter(apt => apt.status === 'no_show').length / apts.length) * 100 : 0,
      averageWaitTime: 0 // Would calculate from token data
    }));
  }

  private calculateCapacityUtilization(slotsData: any): any {
    // Mock implementation - would calculate from actual slots data
    return {
      totalSlots: 100,
      bookedSlots: 75,
      utilizationRate: 75,
      availableSlots: 25
    };
  }

  private calculateRevenueAnalytics(appointments: CentralAppointment[]): any {
    const completedAppointments = appointments.filter(apt => apt.status === 'completed');
    const totalRevenue = completedAppointments.reduce((sum, apt) => sum + (apt.estimatedCost || 0), 0);
    
    return {
      totalRevenue,
      totalAppointments: completedAppointments.length,
      averageAppointmentValue: completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0,
      revenueByType: this.groupRevenueByType(completedAppointments),
      dailyRevenue: this.calculateDailyRevenue(completedAppointments)
    };
  }

  private calculateTrends(appointments: CentralAppointment[], period: string): any {
    const dailyGroups = this.groupBy(appointments, apt => new Date(apt.appointmentDateTime).toDateString());
    
    return {
      period,
      totalAppointments: appointments.length,
      dailyAverage: appointments.length / Object.keys(dailyGroups).length,
      trend: 'stable', // Would calculate actual trend
      dailyBreakdown: Object.entries(dailyGroups).map(([date, apts]) => ({
        date,
        count: apts.length,
        completed: apts.filter(apt => apt.status === 'completed').length
      }))
    };
  }

  private generateSystemAlerts(appointments: CentralAppointment[]): any[] {
    const alerts = [];
    
    // Check for overdue appointments
    const now = new Date();
    const overdueAppointments = appointments.filter(apt => 
      new Date(apt.appointmentDateTime) < now && 
      ['booked', 'confirmed'].includes(apt.status)
    );
    
    if (overdueAppointments.length > 0) {
      alerts.push({
        type: 'overdue',
        message: `${overdueAppointments.length} overdue appointments need attention`,
        severity: 'high',
        timestamp: now
      });
    }

    // Check for conflicts
    const conflicts = this.findConflicts(appointments);
    if (conflicts.length > 0) {
      alerts.push({
        type: 'conflict',
        message: `${conflicts.length} appointment conflicts detected`,
        severity: 'medium',
        timestamp: now
      });
    }

    return alerts;
  }

  private findConflicts(appointments: CentralAppointment[]): CentralAppointment[] {
    const conflicts: CentralAppointment[] = [];
    
    for (let i = 0; i < appointments.length; i++) {
      for (let j = i + 1; j < appointments.length; j++) {
        const apt1 = appointments[i];
        const apt2 = appointments[j];
        
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

  private groupBy<T>(array: T[], keyFn: string | ((item: T) => string)): { [key: string]: T[] } {
    return array.reduce((groups, item) => {
      const key = typeof keyFn === 'string' ? (item as any)[keyFn] : keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as { [key: string]: T[] });
  }

  private groupRevenueByType(appointments: CentralAppointment[]): any[] {
    const typeGroups = this.groupBy(appointments, 'appointmentType');
    return Object.entries(typeGroups).map(([type, apts]) => ({
      type,
      revenue: apts.reduce((sum, apt) => sum + (apt.estimatedCost || 0), 0),
      count: apts.length
    }));
  }

  private calculateDailyRevenue(appointments: CentralAppointment[]): any[] {
    const dailyGroups = this.groupBy(appointments, apt => new Date(apt.appointmentDateTime).toDateString());
    return Object.entries(dailyGroups).map(([date, apts]) => ({
      date,
      revenue: apts.reduce((sum, apt) => sum + (apt.estimatedCost || 0), 0),
      count: apts.length
    }));
  }

  private getMockCapacityData(): any {
    return [
      { clinicId: 'clinic1', clinicName: 'Main Clinic', totalSlots: 100, bookedSlots: 85, utilizationRate: 85 },
      { clinicId: 'clinic2', clinicName: 'Branch Clinic', totalSlots: 80, bookedSlots: 60, utilizationRate: 75 }
    ];
  }

  private getMockQueueStatus(): any {
    return [
      { clinicId: 'clinic1', clinicName: 'Main Clinic', totalWaiting: 12, averageWaitTime: 25, doctorsActive: 5 },
      { clinicId: 'clinic2', clinicName: 'Branch Clinic', totalWaiting: 8, averageWaitTime: 15, doctorsActive: 3 }
    ];
  }

  private generateMockDoctorCapacity(clinicId: string, count: number): any[] {
    const specialties = ['General Dentistry', 'Orthodontics', 'Oral Surgery', 'Pediatric Dentistry'];
    const doctors: any[] = [];

    for (let i = 1; i <= count; i++) {
      const totalSlots = Math.floor(Math.random() * 16) + 8;
      const bookedSlots = Math.floor(Math.random() * totalSlots);
      
      doctors.push({
        doctorId: `${clinicId}-doc${i}`,
        doctorName: `Dr. Doctor ${i}`,
        specialty: specialties[Math.floor(Math.random() * specialties.length)],
        totalSlots,
        bookedSlots,
        availableSlots: totalSlots - bookedSlots,
        utilizationRate: Math.round((bookedSlots / totalSlots) * 100),
        averageConsultationTime: Math.floor(Math.random() * 20) + 25,
        nextAvailableSlot: Math.random() > 0.3 ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        workingHours: '9:00 AM - 5:00 PM'
      });
    }

    return doctors;
  }

  private generateMockPeakHours(): any[] {
    const hours: any[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      hours.push({
        hour,
        utilization: Math.floor(Math.random() * 100),
        appointments: Math.floor(Math.random() * 15)
      });
    }
    return hours;
  }

  private generateMockTrendData(): any[] {
    const trends: any[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const appointments = Math.floor(Math.random() * 50) + 30;
      const completed = Math.floor(appointments * (0.85 + Math.random() * 0.1));
      const cancelled = Math.floor((appointments - completed) * 0.7);
      const noShow = appointments - completed - cancelled;
      
      trends.push({
        date: date.toISOString().split('T')[0],
        appointments,
        completed,
        cancelled,
        noShow
      });
    }
    
    return trends;
  }

  private generateMockDoctorPerformanceData(clinicId: string, count: number): any[] {
    const specialties = ['General Dentistry', 'Orthodontics', 'Oral Surgery', 'Pediatric Dentistry'];
    const doctors: any[] = [];

    for (let i = 1; i <= count; i++) {
      const totalAppointments = Math.floor(Math.random() * 200) + 100;
      const completionRate = Math.floor(Math.random() * 20) + 80;
      
      doctors.push({
        doctorId: `${clinicId}-doc${i}`,
        doctorName: `Dr. Doctor ${i}`,
        specialty: specialties[Math.floor(Math.random() * specialties.length)],
        totalAppointments,
        completionRate,
        averageConsultationTime: Math.floor(Math.random() * 20) + 25,
        patientRating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
        revenue: Math.floor(Math.random() * 50000) + 25000
      });
    }

    return doctors.sort((a, b) => b.revenue - a.revenue);
  }
}