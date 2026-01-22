import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SystemUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  branchId?: string;
  branchName?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  permissions: string[];
  profilePicture?: string;
  phone?: string;
  department?: string;
  employeeId?: string;
  loginAttempts: number;
  isLocked: boolean;
  twoFactorEnabled: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  lockedUsers: number;
  usersByRole: { [role: string]: number };
  usersByTenant: { [tenantId: string]: number };
  recentLogins: number;
  newUsersThisMonth: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly apiUrl = `${environment.apiUrl}/central-admin/users`;

  constructor(private http: HttpClient) {}

  // User CRUD Operations
  getAllUsers(): Observable<SystemUser[]> {
    return this.http.get<SystemUser[]>(this.apiUrl);
  }

  getUserById(id: string): Observable<SystemUser> {
    return this.http.get<SystemUser>(`${this.apiUrl}/${id}`);
  }

  createUser(user: Partial<SystemUser>): Observable<SystemUser> {
    return this.http.post<SystemUser>(this.apiUrl, user);
  }

  updateUser(id: string, user: Partial<SystemUser>): Observable<SystemUser> {
    return this.http.put<SystemUser>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // User Status Management
  activateUser(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivateUser(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  unlockUser(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/unlock`, {});
  }

  resetPassword(id: string): Observable<{ temporaryPassword: string }> {
    return this.http.post<{ temporaryPassword: string }>(`${this.apiUrl}/${id}/reset-password`, {});
  }

  // Role and Permission Management
  updateUserRole(id: string, role: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/role`, { role });
  }

  updateUserPermissions(id: string, permissions: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/permissions`, { permissions });
  }

  // Bulk Operations
  bulkActivateUsers(userIds: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk/activate`, { userIds });
  }

  bulkDeactivateUsers(userIds: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk/deactivate`, { userIds });
  }

  bulkUpdateRole(userIds: string[], role: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk/role`, { userIds, role });
  }

  // Search and Filter
  searchUsers(query: string): Observable<SystemUser[]> {
    return this.http.get<SystemUser[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }

  filterUsers(filters: any): Observable<SystemUser[]> {
    return this.http.post<SystemUser[]>(`${this.apiUrl}/filter`, filters);
  }

  getUsersByTenant(tenantId: string): Observable<SystemUser[]> {
    return this.http.get<SystemUser[]>(`${this.apiUrl}/tenant/${tenantId}`);
  }

  getUsersByRole(role: string): Observable<SystemUser[]> {
    return this.http.get<SystemUser[]>(`${this.apiUrl}/role/${role}`);
  }

  // Statistics and Analytics
  getUserStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/stats`);
  }

  getUserActivity(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/activity?period=${period}`);
  }

  getLoginHistory(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${userId}/login-history`);
  }

  // Security Operations
  enableTwoFactor(userId: string): Observable<{ qrCode: string; secret: string }> {
    return this.http.post<{ qrCode: string; secret: string }>(`${this.apiUrl}/${userId}/2fa/enable`, {});
  }

  disableTwoFactor(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}/2fa`);
  }

  forceLogout(userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/force-logout`, {});
  }

  // Export Operations
  exportUsers(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?format=${format}`, { 
      responseType: 'blob' 
    });
  }

  exportUserActivity(format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/activity?format=${format}`, { 
      responseType: 'blob' 
    });
  }
}