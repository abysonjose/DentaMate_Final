import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface TestResult {
  testId: string;
  results: {
    [key: string]: any;
  };
  notes?: string;
  abnormalFindings?: string;
  recommendations?: string;
}

export interface SampleCollection {
  sampleId: string;
  collectionMethod: string;
  collectionTime: string;
  collectedBy: string;
  notes?: string;
  storageConditions?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LabStaffService {
  private readonly API_URL = `${environment.apiUrl}/lab-diagnostics`;

  constructor(private http: HttpClient) {}

  // Dashboard data
  getPendingTests(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/tests/pending`);
  }

  getInProgressTests(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/tests/in-progress`);
  }

  getCompletedTests(): Observable<ApiResponse> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<ApiResponse>(`${this.API_URL}/tests/completed?date=${today}`);
  }

  getSampleCollectionQueue(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/samples/collection-queue`);
  }

  // Test management
  getTestDetails(testId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/tests/${testId}`);
  }

  startTest(testId: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.API_URL}/tests/${testId}/start`, {});
  }

  submitTestResults(testResult: TestResult): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/tests/${testResult.testId}/results`, testResult);
  }

  updateTestStatus(testId: string, status: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.API_URL}/tests/${testId}/status`, { status });
  }

  // Sample management
  collectSample(sampleCollection: SampleCollection): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/samples/collect`, sampleCollection);
  }

  getSampleDetails(sampleId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/samples/${sampleId}`);
  }

  updateSampleStatus(sampleId: string, status: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.API_URL}/samples/${sampleId}/status`, { status });
  }

  // Test types and templates
  getTestTypes(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/test-types`);
  }

  getTestTemplate(testTypeId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/test-types/${testTypeId}/template`);
  }

  // Reports and analytics
  generateTestReport(testId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/tests/${testId}/report`, {});
  }

  getTestHistory(patientId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/patients/${patientId}/test-history`);
  }

  // Quality control
  getQualityControlTests(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/quality-control`);
  }

  submitQualityControlResult(qcTestId: string, result: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/quality-control/${qcTestId}/result`, result);
  }

  // Equipment and maintenance
  getEquipmentStatus(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/equipment/status`);
  }

  logEquipmentMaintenance(equipmentId: string, maintenanceData: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/equipment/${equipmentId}/maintenance`, maintenanceData);
  }

  // Inventory management
  getLabInventory(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/inventory`);
  }

  updateInventoryItem(itemId: string, quantity: number): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.API_URL}/inventory/${itemId}`, { quantity });
  }

  // Communication
  notifyDoctor(testId: string, message: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/tests/${testId}/notify-doctor`, { message });
  }

  sendReportToPatient(testId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/tests/${testId}/send-report`, {});
  }
}