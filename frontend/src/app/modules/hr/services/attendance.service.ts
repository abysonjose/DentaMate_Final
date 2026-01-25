import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  attendanceMode: 'rfid' | 'qr' | 'manual' | 'biometric';
  workingHours?: number;
  overtimeHours?: number;
  notes?: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceFilter {
  employeeId?: string;
  department?: string;
  branch?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceSummary {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  attendanceRate: number;
  totalWorkingHours: number;
  averageWorkingHours: number;
  overtimeHours: number;
}

export interface DailyAttendanceStats {
  date: Date;
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  lateEmployees: number;
  onLeaveEmployees: number;
  attendanceRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/hr/attendance`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'Content-Type': 'application/json'
    });
  }

  // Attendance Records
  getAttendanceRecords(filter: AttendanceFilter = {}): Observable<{ records: AttendanceRecord[], total: number }> {
    const params: any = {};
    
    if (filter.employeeId) params.employeeId = filter.employeeId;
    if (filter.department) params.department = filter.department;
    if (filter.branch) params.branch = filter.branch;
    if (filter.startDate) params.startDate = filter.startDate.toISOString();
    if (filter.endDate) params.endDate = filter.endDate.toISOString();
    if (filter.status) params.status = filter.status;
    if (filter.page) params.page = filter.page.toString();
    if (filter.limit) params.limit = filter.limit.toString();

    return this.http.get<{ records: AttendanceRecord[], total: number }>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    });
  }

  getAttendanceRecord(id: string): Observable<AttendanceRecord> {
    return this.http.get<AttendanceRecord>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createAttendanceRecord(record: Partial<AttendanceRecord>): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(this.apiUrl, record, {
      headers: this.getHeaders()
    });
  }

  updateAttendanceRecord(id: string, record: Partial<AttendanceRecord>): Observable<AttendanceRecord> {
    return this.http.put<AttendanceRecord>(`${this.apiUrl}/${id}`, record, {
      headers: this.getHeaders()
    });
  }

  deleteAttendanceRecord(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Manual Check-in/Check-out
  manualCheckIn(employeeId: string, checkInTime: Date, notes?: string): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.apiUrl}/manual-checkin`, {
      employeeId,
      checkInTime,
      notes
    }, {
      headers: this.getHeaders()
    });
  }

  manualCheckOut(employeeId: string, checkOutTime: Date, notes?: string): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.apiUrl}/manual-checkout`, {
      employeeId,
      checkOutTime,
      notes
    }, {
      headers: this.getHeaders()
    });
  }

  // Attendance Summary and Reports
  getAttendanceSummary(employeeId: string, startDate: Date, endDate: Date): Observable<AttendanceSummary> {
    return this.http.get<AttendanceSummary>(`${this.apiUrl}/summary/${employeeId}`, {
      headers: this.getHeaders(),
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  }

  getDailyAttendanceStats(date: Date): Observable<DailyAttendanceStats> {
    return this.http.get<DailyAttendanceStats>(`${this.apiUrl}/daily-stats`, {
      headers: this.getHeaders(),
      params: {
        date: date.toISOString()
      }
    });
  }

  getAttendanceTrends(startDate: Date, endDate: Date): Observable<DailyAttendanceStats[]> {
    return this.http.get<DailyAttendanceStats[]>(`${this.apiUrl}/trends`, {
      headers: this.getHeaders(),
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  }

  // Irregular Attendance
  getIrregularAttendance(filter: AttendanceFilter = {}): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.apiUrl}/irregular`, {
      headers: this.getHeaders(),
      params: filter as any
    });
  }

  flagIrregularAttendance(recordId: string, reason: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${recordId}/flag`, { reason }, {
      headers: this.getHeaders()
    });
  }

  // Bulk Operations
  bulkUpdateAttendance(records: { id: string, updates: Partial<AttendanceRecord> }[]): Observable<any> {
    return this.http.patch(`${this.apiUrl}/bulk-update`, { records }, {
      headers: this.getHeaders()
    });
  }

  bulkApproveAttendance(recordIds: string[]): Observable<any> {
    return this.http.patch(`${this.apiUrl}/bulk-approve`, { recordIds }, {
      headers: this.getHeaders()
    });
  }

  // Reports
  generateAttendanceReport(filter: AttendanceFilter, format: 'pdf' | 'csv' | 'excel'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/generate`, {
      headers: this.getHeaders(),
      params: { ...filter as any, format },
      responseType: 'blob'
    });
  }

  // Employee Attendance History
  getEmployeeAttendanceHistory(employeeId: string, startDate: Date, endDate: Date): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.apiUrl}/employee/${employeeId}/history`, {
      headers: this.getHeaders(),
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  }

  // Attendance Statistics
  getAttendanceStatistics(filter: AttendanceFilter = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`, {
      headers: this.getHeaders(),
      params: filter as any
    });
  }
}