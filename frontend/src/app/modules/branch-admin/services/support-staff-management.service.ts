import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SupportStaffIntegrationService, SupportStaffPerformanceMetrics } from '../../../shared/services/support-staff-integration.service';

export interface SupportStaffEmployee {
  id: string;
  employeeId: string;
  name: string;
  role: 'HOUSEKEEPING' | 'SECURITY' | 'ATTENDANT';
  department: string;
  hireDate: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  contactInfo: {
    phone: string;
    email: string;
    emergencyContact: string;
  };
  schedule: {
    shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ROTATING';
    workDays: string[];
    startTime: string;
    endTime: string;
  };
  certifications: string[];
  performanceRating: number;
  branchId: string;
  tenantId: string;
}

export interface IncidentReport {
  id: string;
  reportedBy: string;
  reportedByRole: string;
  incidentType: 'SAFETY' | 'SECURITY' | 'EQUIPMENT' | 'PERSONNEL' | 'PATIENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: string;
  description: string;
  involvedStaff?: string[];
  witnessAccounts?: string[];
  actionsTaken: string;
  followUpRequired: boolean;
  status: 'REPORTED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  reportedAt: Date;
  resolvedAt?: Date;
  branchId: string;
  tenantId: string;
}

export interface SupportStaffBudget {
  branchId: string;
  period: string;
  totalBudget: number;
  allocatedBudget: number;
  actualSpending: number;
  categories: {
    salaries: number;
    supplies: number;
    equipment: number;
    training: number;
    overtime: number;
  };
  variance: number;
  projectedSpending: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupportStaffManagementService {

  constructor(
    private http: HttpClient,
    private supportStaffIntegration: SupportStaffIntegrationService
  ) {}

  // Employee Management
  getSupportStaffEmployees(branchId: string): Observable<SupportStaffEmployee[]> {
    return this.http.get<SupportStaffEmployee[]>(`/api/branch-admin/support-staff/employees/${branchId}`);
  }

  createSupportStaffEmployee(employee: Partial<SupportStaffEmployee>): Observable<SupportStaffEmployee> {
    return this.http.post<SupportStaffEmployee>('/api/branch-admin/support-staff/employees', employee);
  }

  updateSupportStaffEmployee(employeeId: string, updates: Partial<SupportStaffEmployee>): Observable<SupportStaffEmployee> {
    return this.http.put<SupportStaffEmployee>(`/api/branch-admin/support-staff/employees/${employeeId}`, updates);
  }

  deactivateSupportStaffEmployee(employeeId: string, reason: string): Observable<void> {
    return this.http.put<void>(`/api/branch-admin/support-staff/employees/${employeeId}/deactivate`, { reason });
  }

  // Performance Management
  getSupportStaffPerformanceReports(branchId: string, period: string): Observable<SupportStaffPerformanceMetrics[]> {
    return this.supportStaffIntegration.getSupportStaffPerformanceMetrics(branchId, period);
  }

  getIndividualPerformanceReport(staffId: string, period: string): Observable<SupportStaffPerformanceMetrics> {
    return this.supportStaffIntegration.getStaffPerformanceMetrics(staffId, period);
  }

  submitPerformanceReview(staffId: string, review: {
    period: string;
    overallRating: number;
    strengths: string[];
    areasForImprovement: string[];
    goals: string[];
    reviewerComments: string;
  }): Observable<any> {
    return this.http.post('/api/branch-admin/support-staff/performance-reviews', {
      staffId,
      ...review,
      reviewedBy: 'current-branch-admin-id',
      reviewDate: new Date()
    });
  }

  // Incident Management
  getIncidentReports(branchId: string, status?: string): Observable<IncidentReport[]> {
    const params = status ? { status } : {};
    return this.http.get<IncidentReport[]>(`/api/branch-admin/incidents/${branchId}`, { params });
  }

  createIncidentReport(incident: Partial<IncidentReport>): Observable<IncidentReport> {
    const incidentReport: Partial<IncidentReport> = {
      ...incident,
      reportedBy: 'current-branch-admin-id',
      reportedByRole: 'BRANCH_ADMIN',
      reportedAt: new Date(),
      status: 'REPORTED',
      branchId: 'current-branch-id',
      tenantId: 'current-tenant-id'
    };
    
    return this.http.post<IncidentReport>('/api/branch-admin/incidents', incidentReport);
  }

  updateIncidentReport(incidentId: string, updates: Partial<IncidentReport>): Observable<IncidentReport> {
    return this.http.put<IncidentReport>(`/api/branch-admin/incidents/${incidentId}`, updates);
  }

  resolveIncidentReport(incidentId: string, resolution: string): Observable<IncidentReport> {
    return this.http.put<IncidentReport>(`/api/branch-admin/incidents/${incidentId}/resolve`, {
      resolution,
      resolvedBy: 'current-branch-admin-id',
      resolvedAt: new Date()
    });
  }

  // Schedule Management
  getSupportStaffSchedules(branchId: string, startDate: Date, endDate: Date): Observable<any[]> {
    return this.http.get<any[]>(`/api/branch-admin/support-staff/schedules/${branchId}`, {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });
  }

  updateSupportStaffSchedule(scheduleId: string, schedule: any): Observable<any> {
    return this.http.put(`/api/branch-admin/support-staff/schedules/${scheduleId}`, schedule);
  }

  approveOvertimeRequest(requestId: string, approved: boolean, reason?: string): Observable<any> {
    return this.http.put(`/api/branch-admin/support-staff/overtime/${requestId}`, {
      approved,
      reason,
      approvedBy: 'current-branch-admin-id',
      approvedAt: new Date()
    });
  }

  // Budget and Cost Management
  getSupportStaffBudget(branchId: string, period: string): Observable<SupportStaffBudget> {
    return this.http.get<SupportStaffBudget>(`/api/branch-admin/support-staff/budget/${branchId}`, {
      params: { period }
    });
  }

  updateSupportStaffBudget(branchId: string, budget: Partial<SupportStaffBudget>): Observable<SupportStaffBudget> {
    return this.http.put<SupportStaffBudget>(`/api/branch-admin/support-staff/budget/${branchId}`, budget);
  }

  getPayrollSummary(branchId: string, period: string): Observable<any> {
    return this.http.get(`/api/branch-admin/support-staff/payroll/${branchId}`, {
      params: { period }
    });
  }

  // Training and Development
  getSupportStaffTrainingRecords(branchId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/branch-admin/support-staff/training/${branchId}`);
  }

  scheduleTrainingSession(training: {
    title: string;
    description: string;
    trainerId: string;
    attendees: string[];
    scheduledDate: Date;
    duration: number;
    location: string;
    type: 'SAFETY' | 'SKILLS' | 'COMPLIANCE' | 'ORIENTATION';
  }): Observable<any> {
    return this.http.post('/api/branch-admin/support-staff/training/schedule', training);
  }

  recordTrainingCompletion(trainingId: string, attendeeId: string, completed: boolean, score?: number): Observable<any> {
    return this.http.post('/api/branch-admin/support-staff/training/completion', {
      trainingId,
      attendeeId,
      completed,
      score,
      recordedBy: 'current-branch-admin-id',
      recordedAt: new Date()
    });
  }

  // Equipment and Supplies Management
  getSupportStaffEquipment(branchId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/branch-admin/support-staff/equipment/${branchId}`);
  }

  requestEquipmentPurchase(request: {
    itemName: string;
    description: string;
    quantity: number;
    estimatedCost: number;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    justification: string;
  }): Observable<any> {
    return this.http.post('/api/branch-admin/support-staff/equipment/request', {
      ...request,
      requestedBy: 'current-branch-admin-id',
      requestedAt: new Date()
    });
  }

  // Analytics and Reporting
  getSupportStaffAnalytics(branchId: string, period: string): Observable<any> {
    return this.http.get(`/api/branch-admin/support-staff/analytics/${branchId}`, {
      params: { period }
    });
  }

  generateSupportStaffReport(branchId: string, reportType: string, parameters: any): Observable<any> {
    return this.http.post(`/api/branch-admin/support-staff/reports/generate`, {
      branchId,
      reportType,
      parameters,
      generatedBy: 'current-branch-admin-id',
      generatedAt: new Date()
    });
  }

  // Compliance and Audit
  getComplianceChecklist(branchId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/branch-admin/support-staff/compliance/${branchId}`);
  }

  submitComplianceReport(report: {
    checklistId: string;
    items: { id: string; compliant: boolean; notes?: string }[];
    overallCompliance: number;
    recommendations: string[];
  }): Observable<any> {
    return this.http.post('/api/branch-admin/support-staff/compliance/submit', {
      ...report,
      submittedBy: 'current-branch-admin-id',
      submittedAt: new Date()
    });
  }

  // Communication and Announcements
  sendAnnouncementToSupportStaff(announcement: {
    title: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    targetRoles?: string[];
    expiryDate?: Date;
  }): Observable<any> {
    return this.http.post('/api/branch-admin/support-staff/announcements', {
      ...announcement,
      sentBy: 'current-branch-admin-id',
      sentAt: new Date()
    });
  }

  getSupportStaffFeedback(branchId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/branch-admin/support-staff/feedback/${branchId}`);
  }
}