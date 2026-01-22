import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LabTest {
  id: string;
  name: string;
  category: string;
  description: string;
  sampleType: 'blood' | 'urine' | 'saliva' | 'tissue' | 'swab' | 'other';
  preparationInstructions?: string;
  normalRange?: string;
  turnaroundTime: number; // in hours
  cost?: number;
  isActive: boolean;
}

export interface LabRequest {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  requestDate: Date;
  tests: LabRequestTest[];
  priority: 'routine' | 'urgent' | 'stat';
  status: 'requested' | 'sample-collected' | 'in-progress' | 'completed' | 'cancelled';
  clinicalNotes?: string;
  diagnosis?: string;
  expectedCompletionDate?: Date;
  labId?: string;
  labName?: string;
  totalCost?: number;
  insuranceCovered?: boolean;
}

export interface LabRequestTest {
  id: string;
  testId: string;
  testName: string;
  category: string;
  sampleType: string;
  instructions?: string;
  status: 'requested' | 'sample-collected' | 'in-progress' | 'completed' | 'cancelled';
  results?: LabResult[];
}

export interface LabResult {
  id: string;
  testId: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  resultDate: Date;
  notes?: string;
  technician?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  flagged: boolean;
  criticalValue: boolean;
}

export interface LabProvider {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  services: string[];
  turnaroundTimes: { [testCategory: string]: number };
  isPreferred: boolean;
  isActive: boolean;
}

export interface LabRequestTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tests: string[]; // test IDs
  defaultPriority: 'routine' | 'urgent' | 'stat';
  defaultInstructions?: string;
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorLabService {
  private apiUrl = `${environment.apiUrl}/doctor/lab`;

  constructor(private http: HttpClient) {}

  // Lab Tests Catalog
  getAvailableTests(category?: string): Observable<LabTest[]> {
    const params = category ? `?category=${category}` : '';
    return this.http.get<LabTest[]>(`${this.apiUrl}/tests${params}`);
  }

  searchTests(query: string, filters?: {
    category?: string;
    sampleType?: string;
    maxTurnaroundTime?: number;
  }): Observable<LabTest[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    return this.http.get<LabTest[]>(`${this.apiUrl}/tests/search?${params.toString()}`);
  }

  getTestDetails(testId: string): Observable<LabTest> {
    return this.http.get<LabTest>(`${this.apiUrl}/tests/${testId}`);
  }

  getTestCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tests/categories`);
  }

  // Lab Request Management
  createLabRequest(request: Partial<LabRequest>): Observable<LabRequest> {
    return this.http.post<LabRequest>(`${this.apiUrl}/requests`, request);
  }

  updateLabRequest(requestId: string, updates: Partial<LabRequest>): Observable<LabRequest> {
    return this.http.put<LabRequest>(`${this.apiUrl}/requests/${requestId}`, updates);
  }

  getLabRequest(requestId: string): Observable<LabRequest> {
    return this.http.get<LabRequest>(`${this.apiUrl}/requests/${requestId}`);
  }

  getPatientLabRequests(patientId: string, status?: string): Observable<LabRequest[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<LabRequest[]>(`${this.apiUrl}/requests/patient/${patientId}${params}`);
  }

  getDoctorLabRequests(status?: string, dateFrom?: string, dateTo?: string): Observable<LabRequest[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get<LabRequest[]>(`${this.apiUrl}/requests/doctor?${params.toString()}`);
  }

  cancelLabRequest(requestId: string, reason: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/requests/${requestId}/cancel`, { reason });
  }

  // Lab Results
  getLabResults(requestId: string): Observable<LabResult[]> {
    return this.http.get<LabResult[]>(`${this.apiUrl}/requests/${requestId}/results`);
  }

  getPatientLabResults(patientId: string, dateFrom?: string, dateTo?: string): Observable<LabResult[]> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get<LabResult[]>(`${this.apiUrl}/results/patient/${patientId}?${params.toString()}`);
  }

  reviewLabResult(resultId: string, review: {
    reviewed: boolean;
    notes?: string;
    followUpRequired?: boolean;
    followUpInstructions?: string;
  }): Observable<LabResult> {
    return this.http.patch<LabResult>(`${this.apiUrl}/results/${resultId}/review`, review);
  }

  flagCriticalResult(resultId: string, reason: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/results/${resultId}/flag`, { reason });
  }

  // Lab Providers
  getLabProviders(): Observable<LabProvider[]> {
    return this.http.get<LabProvider[]>(`${this.apiUrl}/providers`);
  }

  getPreferredProviders(): Observable<LabProvider[]> {
    return this.http.get<LabProvider[]>(`${this.apiUrl}/providers/preferred`);
  }

  sendRequestToLab(requestId: string, labId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/requests/${requestId}/send-to-lab`, { labId });
  }

  checkLabAvailability(labId: string, testIds: string[]): Observable<{
    available: boolean;
    unavailableTests: string[];
    estimatedTurnaroundTime: number;
    estimatedCost: number;
  }> {
    return this.http.post(`${this.apiUrl}/providers/${labId}/check-availability`, { testIds });
  }

  // Lab Request Templates
  getLabRequestTemplates(): Observable<LabRequestTemplate[]> {
    return this.http.get<LabRequestTemplate[]>(`${this.apiUrl}/templates`);
  }

  createLabRequestTemplate(template: Partial<LabRequestTemplate>): Observable<LabRequestTemplate> {
    return this.http.post<LabRequestTemplate>(`${this.apiUrl}/templates`, template);
  }

  updateLabRequestTemplate(templateId: string, updates: Partial<LabRequestTemplate>): Observable<LabRequestTemplate> {
    return this.http.put<LabRequestTemplate>(`${this.apiUrl}/templates/${templateId}`, updates);
  }

  deleteLabRequestTemplate(templateId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/templates/${templateId}`);
  }

  applyTemplate(templateId: string, patientId: string): Observable<LabRequest> {
    return this.http.post<LabRequest>(`${this.apiUrl}/templates/${templateId}/apply`, { patientId });
  }

  // Bulk Operations
  createBulkLabRequest(requests: Partial<LabRequest>[]): Observable<LabRequest[]> {
    return this.http.post<LabRequest[]>(`${this.apiUrl}/requests/bulk`, { requests });
  }

  bulkUpdateRequests(requestIds: string[], updates: Partial<LabRequest>): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/requests/bulk-update`, { requestIds, updates });
  }

  // Lab Statistics and Analytics
  getLabStatistics(dateFrom?: string, dateTo?: string): Observable<{
    totalRequests: number;
    completedRequests: number;
    pendingRequests: number;
    averageTurnaroundTime: number;
    mostRequestedTests: { testName: string; count: number }[];
    abnormalResultsRate: number;
    criticalResultsCount: number;
  }> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get(`${this.apiUrl}/statistics?${params.toString()}`);
  }

  getTestTrends(testId: string, patientId: string, period: 'month' | 'quarter' | 'year'): Observable<{
    testName: string;
    data: { date: string; value: string; status: string }[];
    trend: 'improving' | 'stable' | 'worsening';
  }> {
    return this.http.get(`${this.apiUrl}/trends/${testId}/patient/${patientId}/${period}`);
  }

  // Integration with Medical Records
  attachResultsToRecord(requestId: string, medicalRecordId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/requests/${requestId}/attach-to-record`, { medicalRecordId });
  }

  getLabRequestsForRecord(medicalRecordId: string): Observable<LabRequest[]> {
    return this.http.get<LabRequest[]>(`${this.apiUrl}/medical-record/${medicalRecordId}/requests`);
  }

  // Notifications and Alerts
  getPendingResults(): Observable<LabRequest[]> {
    return this.http.get<LabRequest[]>(`${this.apiUrl}/results/pending`);
  }

  getCriticalResults(): Observable<LabResult[]> {
    return this.http.get<LabResult[]>(`${this.apiUrl}/results/critical`);
  }

  getOverdueRequests(): Observable<LabRequest[]> {
    return this.http.get<LabRequest[]>(`${this.apiUrl}/requests/overdue`);
  }

  // Export and Reporting
  exportLabReport(requestId: string, format: 'pdf' | 'csv' | 'json'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/requests/${requestId}/export/${format}`, { 
      responseType: 'blob' 
    });
  }

  generatePatientLabSummary(patientId: string, dateFrom?: string, dateTo?: string): Observable<{
    patientId: string;
    totalTests: number;
    abnormalResults: number;
    criticalResults: number;
    testsSummary: { category: string; count: number; abnormalCount: number }[];
    trends: { testName: string; trend: 'improving' | 'stable' | 'worsening' }[];
    recommendations: string[];
  }> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get(`${this.apiUrl}/patient/${patientId}/lab-summary?${params.toString()}`);
  }

  // Real-time Updates
  subscribeToLabUpdates(): Observable<{
    type: 'result_available' | 'critical_result' | 'request_completed' | 'request_delayed';
    requestId?: string;
    resultId?: string;
    message: string;
    timestamp: Date;
  }> {
    // WebSocket implementation for real-time lab updates
    return new Observable(observer => {
      // WebSocket connection logic here
      // This would listen for lab result updates, critical results, etc.
    });
  }

  // Quality Control
  reportLabIssue(requestId: string, issue: {
    type: 'sample_quality' | 'result_accuracy' | 'turnaround_time' | 'communication' | 'other';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/requests/${requestId}/report-issue`, issue);
  }

  getLabPerformanceMetrics(labId: string, dateFrom?: string, dateTo?: string): Observable<{
    labId: string;
    labName: string;
    averageTurnaroundTime: number;
    onTimeDeliveryRate: number;
    accuracyRate: number;
    issueCount: number;
    customerSatisfaction: number;
  }> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get(`${this.apiUrl}/providers/${labId}/performance?${params.toString()}`);
  }
}