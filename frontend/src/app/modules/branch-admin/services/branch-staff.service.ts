import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface BranchStaff {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'doctor' | 'doctor-assistant' | 'receptionist' | 'cashier' | 'pharmacist' | 'lab-assistant' | 'nurse' | 'head-nurse';
  department: string;
  specialization?: string;
  isActive: boolean;
  joinDate: Date;
  lastLogin?: Date;
  workingHours: {
    [key: string]: { start: string; end: string; isWorking: boolean };
  };
  permissions: string[];
  profilePicture?: string;
  qualifications?: string[];
  experience?: number;
  salary?: number;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  documents: {
    type: string;
    url: string;
    uploadDate: Date;
  }[];
  performance: {
    rating: number;
    lastReview: Date;
    nextReview: Date;
  };
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: 'sick' | 'vacation' | 'personal' | 'emergency' | 'maternity' | 'paternity';
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  reviewComments?: string;
  isEmergency: boolean;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  role: string;
  department: string;
  metrics: {
    punctuality: number;
    productivity: number;
    patientSatisfaction: number;
    teamwork: number;
    overall: number;
  };
  achievements: string[];
  improvements: string[];
  lastReviewDate: Date;
  nextReviewDate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BranchStaffService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin/staff`;

  constructor(private http: HttpClient) {}

  // Staff CRUD Operations
  getAllStaff(): Observable<BranchStaff[]> {
    return this.http.get<BranchStaff[]>(this.apiUrl);
  }

  getStaffById(id: string): Observable<BranchStaff> {
    return this.http.get<BranchStaff>(`${this.apiUrl}/${id}`);
  }

  createStaff(staff: Partial<BranchStaff>): Observable<BranchStaff> {
    return this.http.post<BranchStaff>(this.apiUrl, staff);
  }

  updateStaff(id: string, staff: Partial<BranchStaff>): Observable<BranchStaff> {
    return this.http.put<BranchStaff>(`${this.apiUrl}/${id}`, staff);
  }

  deleteStaff(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Staff Status Management
  activateStaff(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivateStaff(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  // Staff by Role/Department
  getStaffByRole(role: string): Observable<BranchStaff[]> {
    return this.http.get<BranchStaff[]>(`${this.apiUrl}/role/${role}`);
  }

  getStaffByDepartment(department: string): Observable<BranchStaff[]> {
    return this.http.get<BranchStaff[]>(`${this.apiUrl}/department/${encodeURIComponent(department)}`);
  }

  getDoctors(): Observable<BranchStaff[]> {
    return this.http.get<BranchStaff[]>(`${this.apiUrl}/doctors`);
  }

  getReceptionists(): Observable<BranchStaff[]> {
    return this.http.get<BranchStaff[]>(`${this.apiUrl}/receptionists`);
  }

  // Doctor Assignment and Scheduling
  assignDoctorToDepartment(doctorId: string, departmentId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${doctorId}/assign-department`, { departmentId });
  }

  updateDoctorAvailability(doctorId: string, availability: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${doctorId}/availability`, availability);
  }

  getDoctorSchedule(doctorId: string, date?: string): Observable<any> {
    const params = date ? `?date=${date}` : '';
    return this.http.get(`${this.apiUrl}/${doctorId}/schedule${params}`);
  }

  updateDoctorSchedule(doctorId: string, schedule: any): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${doctorId}/schedule`, schedule);
  }

  // Leave Management
  getLeaveRequests(status?: string): Observable<LeaveRequest[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<LeaveRequest[]>(`${this.apiUrl}/leave-requests${params}`);
  }

  getLeaveRequestById(id: string): Observable<LeaveRequest> {
    return this.http.get<LeaveRequest>(`${this.apiUrl}/leave-requests/${id}`);
  }

  approveLeaveRequest(id: string, comments?: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/leave-requests/${id}/approve`, { comments });
  }

  rejectLeaveRequest(id: string, comments: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/leave-requests/${id}/reject`, { comments });
  }

  getStaffLeaveBalance(staffId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${staffId}/leave-balance`);
  }

  // Staff Performance
  getStaffPerformance(staffId?: string): Observable<StaffPerformance[]> {
    const params = staffId ? `?staffId=${staffId}` : '';
    return this.http.get<StaffPerformance[]>(`${this.apiUrl}/performance${params}`);
  }

  updateStaffPerformance(staffId: string, performance: Partial<StaffPerformance>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${staffId}/performance`, performance);
  }

  schedulePerformanceReview(staffId: string, reviewDate: Date): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${staffId}/schedule-review`, { reviewDate });
  }

  // Staff Activity Monitoring
  getStaffActivity(staffId: string, period: string = '7d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/${staffId}/activity?period=${period}`);
  }

  getReceptionistActivity(period: string = '7d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/receptionist-activity?period=${period}`);
  }

  getStaffLoginHistory(staffId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${staffId}/login-history`);
  }

  // Working Hours Management
  updateStaffWorkingHours(staffId: string, workingHours: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${staffId}/working-hours`, { workingHours });
  }

  getStaffAttendance(staffId: string, month: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${staffId}/attendance?month=${month}`);
  }

  markStaffAttendance(staffId: string, date: string, status: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${staffId}/attendance`, { date, status });
  }

  // Staff Permissions
  updateStaffPermissions(staffId: string, permissions: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${staffId}/permissions`, { permissions });
  }

  getAvailablePermissions(role: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/permissions/available?role=${role}`);
  }

  // Bulk Operations
  bulkUpdateStatus(staffIds: string[], status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk/status`, { staffIds, status });
  }

  bulkAssignDepartment(staffIds: string[], departmentId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk/assign-department`, { staffIds, departmentId });
  }

  // Search and Filter
  searchStaff(query: string): Observable<BranchStaff[]> {
    return this.http.get<BranchStaff[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }

  filterStaff(filters: any): Observable<BranchStaff[]> {
    return this.http.post<BranchStaff[]>(`${this.apiUrl}/filter`, filters);
  }

  // Reports and Analytics
  getStaffSummaryReport(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/summary`);
  }

  getDepartmentStaffReport(department: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/department/${encodeURIComponent(department)}`);
  }

  getStaffUtilizationReport(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/utilization?period=${period}`);
  }

  // Export Operations
  exportStaffData(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?format=${format}`, { responseType: 'blob' });
  }

  exportStaffSchedule(format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/schedule?format=${format}`, { responseType: 'blob' });
  }

  exportLeaveRequests(format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/leave-requests?format=${format}`, { responseType: 'blob' });
  }

  // Emergency Contacts
  updateEmergencyContact(staffId: string, contact: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${staffId}/emergency-contact`, contact);
  }

  getEmergencyContacts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/emergency-contacts`);
  }
}