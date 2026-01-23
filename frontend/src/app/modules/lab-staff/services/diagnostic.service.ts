import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DiagnosticWorkflow {
  id: string;
  requestId: string;
  currentStep: 'RECEIVED' | 'PATIENT_VERIFIED' | 'IN_PROGRESS' | 'REPORT_UPLOADED' | 'VALIDATED' | 'COMPLETED';
  steps: WorkflowStep[];
  estimatedCompletionTime: Date;
  actualCompletionTime?: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  startTime?: Date;
  endTime?: Date;
  assignedTo?: string;
  notes?: string;
}

export interface DiagnosticMetrics {
  averageProcessingTime: number;
  completionRate: number;
  errorRate: number;
  patientSatisfactionScore: number;
  workloadDistribution: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticService {
  private apiUrl = `${environment.apiUrl}/lab-diagnostics`;
  private workflowSubject = new BehaviorSubject<DiagnosticWorkflow[]>([]);
  public workflows$ = this.workflowSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Workflow Management
  getWorkflows(): Observable<DiagnosticWorkflow[]> {
    return this.http.get<DiagnosticWorkflow[]>(`${this.apiUrl}/workflows`);
  }

  getWorkflowByRequestId(requestId: string): Observable<DiagnosticWorkflow> {
    return this.http.get<DiagnosticWorkflow>(`${this.apiUrl}/workflows/request/${requestId}`);
  }

  updateWorkflowStep(workflowId: string, stepId: string, status: string, notes?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/workflows/${workflowId}/steps/${stepId}`, {
      status,
      notes,
      updatedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  // Patient Verification
  verifyPatientIdentity(patientId: string, verificationData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/patient-verification`, {
      patientId,
      verificationData,
      verifiedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getPatientVerificationHistory(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/patient-verification/${patientId}/history`);
  }

  // Quality Control
  performQualityCheck(reportId: string, checklistItems: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/quality-control/${reportId}`, {
      checklistItems,
      performedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getQualityCheckResults(reportId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/quality-control/${reportId}/results`);
  }

  // Diagnostic Metrics
  getDiagnosticMetrics(dateRange: { start: Date, end: Date }): Observable<DiagnosticMetrics> {
    return this.http.get<DiagnosticMetrics>(`${this.apiUrl}/metrics`, {
      params: {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      }
    });
  }

  getPersonalPerformanceMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/metrics/personal/${this.getCurrentUserId()}`);
  }

  // Equipment Management
  getEquipmentStatus(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/equipment/status`);
  }

  reportEquipmentIssue(equipmentId: string, issue: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/equipment/${equipmentId}/issues`, {
      ...issue,
      reportedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  // Calibration and Maintenance
  getCalibrationSchedule(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/calibration/schedule`);
  }

  recordCalibrationResult(equipmentId: string, result: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/calibration/${equipmentId}/results`, {
      ...result,
      performedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  // Sample Tracking
  trackSample(sampleId: string, location: string, status: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/samples/${sampleId}/track`, {
      location,
      status,
      trackedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getSampleHistory(sampleId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/samples/${sampleId}/history`);
  }

  // Protocol Management
  getTestProtocols(testType: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/protocols/${testType}`);
  }

  updateProtocolCompliance(requestId: string, protocolId: string, complianceData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/protocols/${protocolId}/compliance`, {
      requestId,
      complianceData,
      updatedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  // Error Handling and Rework
  initiateRework(requestId: string, reason: string, details: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/rework/${requestId}`, {
      reason,
      details,
      initiatedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getReworkHistory(requestId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rework/${requestId}/history`);
  }

  // Batch Processing
  processBatch(batchId: string, requests: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/batch/${batchId}/process`, {
      requests,
      processedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getBatchStatus(batchId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/batch/${batchId}/status`);
  }

  // Scheduling and Capacity
  getLabCapacity(): Observable<any> {
    return this.http.get(`${this.apiUrl}/capacity/current`);
  }

  scheduleTest(requestId: string, scheduledTime: Date, equipmentId?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/schedule`, {
      requestId,
      scheduledTime,
      equipmentId,
      scheduledBy: this.getCurrentUserId()
    });
  }

  // Integration with External Systems
  syncWithLIS(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/integration/lis/sync`, data);
  }

  syncWithPACS(reportId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/integration/pacs/sync`, {
      reportId,
      syncedBy: this.getCurrentUserId()
    });
  }

  // Utility Methods
  private getCurrentUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  // Real-time Updates
  subscribeToWorkflowUpdates(): Observable<any> {
    // WebSocket connection for real-time updates
    // Implementation depends on your WebSocket setup
    return new Observable(observer => {
      // WebSocket implementation
    });
  }

  // Data Export
  exportDiagnosticData(filters: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/export`, filters, {
      responseType: 'blob'
    });
  }

  // Validation Helpers
  validateTestParameters(testType: string, parameters: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/validation/parameters`, {
      testType,
      parameters
    });
  }

  // Performance Optimization
  preloadCommonData(): void {
    // Preload frequently accessed data
    this.getTestProtocols('common').subscribe();
    this.getEquipmentStatus().subscribe();
  }
}