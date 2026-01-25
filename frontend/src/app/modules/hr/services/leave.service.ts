import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'sick' | 'casual' | 'emergency' | 'annual' | 'maternity' | 'paternity' | 'unpaid';
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedDate: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  reviewComments?: string;
  attachments?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  employeeId: string;
  employeeName: string;
  leaveType: string;
  totalAllowed: number;
  used: number;
  remaining: number;
  carryForward: number;
  year: number;
}

export interface LeavePolicy {
  id: string;
  leaveType: string;
  annualAllowance: number;
  maxConsecutiveDays: number;
  minAdvanceNotice: number; // days
  carryForwardAllowed: boolean;
  maxCarryForward: number;
  requiresApproval: boolean;
  requiresDocumentation: boolean;
  applicableRoles: string[];
  isActive: boolean;
}

export interface LeaveFilter {
  employeeId?: string;
  department?: string;
  branch?: string;
  leaveType?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private apiUrl = `${environment.apiUrl}/hr/leave`;

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

  // Leave Requests
  getLeaveRequests(filter: LeaveFilter = {}): Observable<{ requests: LeaveRequest[], total: number }> {
    const params: any = {};
    
    if (filter.employeeId) params.employeeId = filter.employeeId;
    if (filter.department) params.department = filter.department;
    if (filter.branch) params.branch = filter.branch;
    if (filter.leaveType) params.leaveType = filter.leaveType;
    if (filter.status) params.status = filter.status;
    if (filter.startDate) params.startDate = filter.startDate.toISOString();
    if (filter.endDate) params.endDate = filter.endDate.toISOString();
    if (filter.page) params.page = filter.page.toString();
    if (filter.limit) params.limit = filter.limit.toString();

    return this.http.get<{ requests: LeaveRequest[], total: number }>(`${this.apiUrl}/requests`, {
      headers: this.getHeaders(),
      params
    });
  }

  getLeaveRequest(id: string): Observable<LeaveRequest> {
    return this.http.get<LeaveRequest>(`${this.apiUrl}/requests/${id}`, {
      headers: this.getHeaders()
    });
  }

  createLeaveRequest(request: Partial<LeaveRequest>): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.apiUrl}/requests`, request, {
      headers: this.getHeaders()
    });
  }

  updateLeaveRequest(id: string, request: Partial<LeaveRequest>): Observable<LeaveRequest> {
    return this.http.put<LeaveRequest>(`${this.apiUrl}/requests/${id}`, request, {
      headers: this.getHeaders()
    });
  }

  deleteLeaveRequest(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/requests/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Leave Approval
  approveLeaveRequest(id: string, comments?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.apiUrl}/requests/${id}/approve`, {
      comments
    }, {
      headers: this.getHeaders()
    });
  }

  rejectLeaveRequest(id: string, comments: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.apiUrl}/requests/${id}/reject`, {
      comments
    }, {
      headers: this.getHeaders()
    });
  }

  cancelLeaveRequest(id: string, reason?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.apiUrl}/requests/${id}/cancel`, {
      reason
    }, {
      headers: this.getHeaders()
    });
  }

  // Bulk Operations
  bulkApproveLeaveRequests(requestIds: string[], comments?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/bulk-approve`, {
      requestIds,
      comments
    }, {
      headers: this.getHeaders()
    });
  }

  bulkRejectLeaveRequests(requestIds: string[], comments: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requests/bulk-reject`, {
      requestIds,
      comments
    }, {
      headers: this.getHeaders()
    });
  }

  // Leave Balance
  getLeaveBalances(employeeId?: string): Observable<LeaveBalance[]> {
    const params = employeeId ? { employeeId } : {};
    return this.http.get<LeaveBalance[]>(`${this.apiUrl}/balances`, {
      headers: this.getHeaders(),
      params
    });
  }

  getEmployeeLeaveBalance(employeeId: string, year?: number): Observable<LeaveBalance[]> {
    const params = year ? { year: year.toString() } : {};
    return this.http.get<LeaveBalance[]>(`${this.apiUrl}/balances/${employeeId}`, {
      headers: this.getHeaders(),
      params
    });
  }

  updateLeaveBalance(employeeId: string, leaveType: string, adjustment: number, reason: string): Observable<LeaveBalance> {
    return this.http.patch<LeaveBalance>(`${this.apiUrl}/balances/${employeeId}/${leaveType}`, {
      adjustment,
      reason
    }, {
      headers: this.getHeaders()
    });
  }

  // Leave Policies
  getLeavePolicies(): Observable<LeavePolicy[]> {
    return this.http.get<LeavePolicy[]>(`${this.apiUrl}/policies`, {
      headers: this.getHeaders()
    });
  }

  getLeavePolicy(id: string): Observable<LeavePolicy> {
    return this.http.get<LeavePolicy>(`${this.apiUrl}/policies/${id}`, {
      headers: this.getHeaders()
    });
  }

  createLeavePolicy(policy: Partial<LeavePolicy>): Observable<LeavePolicy> {
    return this.http.post<LeavePolicy>(`${this.apiUrl}/policies`, policy, {
      headers: this.getHeaders()
    });
  }

  updateLeavePolicy(id: string, policy: Partial<LeavePolicy>): Observable<LeavePolicy> {
    return this.http.put<LeavePolicy>(`${this.apiUrl}/policies/${id}`, policy, {
      headers: this.getHeaders()
    });
  }

  deleteLeavePolicy(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/policies/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Leave History
  getEmployeeLeaveHistory(employeeId: string, year?: number): Observable<LeaveRequest[]> {
    const params = year ? { year: year.toString() } : {};
    return this.http.get<LeaveRequest[]>(`${this.apiUrl}/history/${employeeId}`, {
      headers: this.getHeaders(),
      params
    });
  }

  // Leave Statistics
  getLeaveStatistics(filter: LeaveFilter = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`, {
      headers: this.getHeaders(),
      params: filter as any
    });
  }

  // Pending Approvals
  getPendingApprovals(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.apiUrl}/pending-approvals`, {
      headers: this.getHeaders()
    });
  }

  // Leave Calendar
  getLeaveCalendar(startDate: Date, endDate: Date, department?: string): Observable<any[]> {
    const params: any = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
    if (department) params.department = department;

    return this.http.get<any[]>(`${this.apiUrl}/calendar`, {
      headers: this.getHeaders(),
      params
    });
  }

  // Reports
  generateLeaveReport(filter: LeaveFilter, format: 'pdf' | 'csv' | 'excel'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/generate`, {
      headers: this.getHeaders(),
      params: { ...filter as any, format },
      responseType: 'blob'
    });
  }

  // Leave Usage Analysis
  getLeaveUsageAnalysis(year: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/analysis/usage`, {
      headers: this.getHeaders(),
      params: { year: year.toString() }
    });
  }

  // Attachment Management
  uploadLeaveAttachment(requestId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('attachment', file);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'X-Tenant-ID': localStorage.getItem('tenantId') || ''
    });

    return this.http.post(`${this.apiUrl}/requests/${requestId}/attachments`, formData, {
      headers
    });
  }

  removeLeaveAttachment(requestId: string, attachmentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/requests/${requestId}/attachments/${attachmentId}`, {
      headers: this.getHeaders()
    });
  }
}