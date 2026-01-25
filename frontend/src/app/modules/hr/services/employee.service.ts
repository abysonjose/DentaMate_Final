import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Employee } from './hr.service';

export interface EmployeeFilter {
  search?: string;
  role?: string;
  department?: string;
  branch?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  branch: string;
  joiningDate: Date;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  branch?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface RoleAssignmentHistory {
  id: string;
  employeeId: string;
  previousRole: string;
  newRole: string;
  assignedBy: string;
  assignedAt: Date;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = `${environment.apiUrl}/hr/employees`;

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

  // Employee CRUD Operations
  getEmployees(filter: EmployeeFilter = {}): Observable<{ employees: Employee[], total: number, page: number, totalPages: number }> {
    const params: any = {};
    
    if (filter.search) params.search = filter.search;
    if (filter.role) params.role = filter.role;
    if (filter.department) params.department = filter.department;
    if (filter.branch) params.branch = filter.branch;
    if (filter.status) params.status = filter.status;
    if (filter.page) params.page = filter.page.toString();
    if (filter.limit) params.limit = filter.limit.toString();
    if (filter.sortBy) params.sortBy = filter.sortBy;
    if (filter.sortOrder) params.sortOrder = filter.sortOrder;

    return this.http.get<{ employees: Employee[], total: number, page: number, totalPages: number }>(
      this.apiUrl, 
      { headers: this.getHeaders(), params }
    );
  }

  getEmployee(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createEmployee(employee: CreateEmployeeRequest): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee, {
      headers: this.getHeaders()
    });
  }

  updateEmployee(id: string, employee: UpdateEmployeeRequest): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${id}`, employee, {
      headers: this.getHeaders()
    });
  }

  deleteEmployee(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Employee Status Management
  activateEmployee(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/activate`, {}, {
      headers: this.getHeaders()
    });
  }

  deactivateEmployee(id: string, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/deactivate`, { reason }, {
      headers: this.getHeaders()
    });
  }

  suspendEmployee(id: string, reason: string, duration?: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/suspend`, { reason, duration }, {
      headers: this.getHeaders()
    });
  }

  // Role Assignment
  assignRole(employeeId: string, newRole: string, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${employeeId}/assign-role`, { 
      role: newRole, 
      reason 
    }, {
      headers: this.getHeaders()
    });
  }

  getRoleAssignmentHistory(employeeId: string): Observable<RoleAssignmentHistory[]> {
    return this.http.get<RoleAssignmentHistory[]>(`${this.apiUrl}/${employeeId}/role-history`, {
      headers: this.getHeaders()
    });
  }

  // Bulk Operations
  bulkUpdateEmployees(employeeIds: string[], updates: Partial<UpdateEmployeeRequest>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/bulk-update`, {
      employeeIds,
      updates
    }, {
      headers: this.getHeaders()
    });
  }

  bulkDeactivateEmployees(employeeIds: string[], reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/bulk-deactivate`, {
      employeeIds,
      reason
    }, {
      headers: this.getHeaders()
    });
  }

  // Employee Search and Filters
  searchEmployees(query: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/search`, {
      headers: this.getHeaders(),
      params: { q: query }
    });
  }

  getEmployeesByRole(role: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/by-role/${role}`, {
      headers: this.getHeaders()
    });
  }

  getEmployeesByDepartment(department: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/by-department/${department}`, {
      headers: this.getHeaders()
    });
  }

  getEmployeesByBranch(branchId: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/by-branch/${branchId}`, {
      headers: this.getHeaders()
    });
  }

  // Employee Statistics
  getEmployeeStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`, {
      headers: this.getHeaders()
    });
  }

  // Profile Picture Management
  uploadProfilePicture(employeeId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'X-Tenant-ID': localStorage.getItem('tenantId') || ''
    });

    return this.http.post(`${this.apiUrl}/${employeeId}/profile-picture`, formData, {
      headers
    });
  }

  removeProfilePicture(employeeId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${employeeId}/profile-picture`, {
      headers: this.getHeaders()
    });
  }
}