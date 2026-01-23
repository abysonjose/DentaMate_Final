import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DiagnosticTest {
  id: string;
  name: string;
  code: string;
  category: 'imaging' | 'laboratory' | 'pathology';
  estimatedDuration: number; // in minutes
  preparationRequired: boolean;
  preparationInstructions?: string;
  equipmentRequired: string[];
  isActive: boolean;
}

export interface DiagnosticEquipment {
  id: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  status: 'available' | 'in_use' | 'maintenance' | 'out_of_order';
  location: string;
  lastMaintenance: Date;
  nextMaintenance: Date;
  calibrationStatus: 'valid' | 'expired' | 'due_soon';
}

export interface DiagnosticProtocol {
  id: string;
  testType: string;
  protocolName: string;
  steps: DiagnosticStep[];
  qualityChecks: QualityCheck[];
  safetyRequirements: string[];
  estimatedTime: number;
}

export interface DiagnosticStep {
  stepNumber: number;
  title: string;
  description: string;
  duration: number;
  requiredEquipment?: string[];
  safetyNotes?: string[];
  qualityPoints?: string[];
}

export interface QualityCheck {
  checkPoint: string;
  description: string;
  acceptanceCriteria: string;
  isRequired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticService {
  private readonly apiUrl = `${environment.apiUrl}/diagnostic`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  // State management
  private availableTestsSubject = new BehaviorSubject<DiagnosticTest[]>([]);
  private equipmentStatusSubject = new BehaviorSubject<DiagnosticEquipment[]>([]);
  private protocolsSubject = new BehaviorSubject<DiagnosticProtocol[]>([]);

  // Public observables
  public availableTests$ = this.availableTestsSubject.asObservable();
  public equipmentStatus$ = this.equipmentStatusSubject.asObservable();
  public protocols$ = this.protocolsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  // Diagnostic Tests
  getAvailableTests(): Observable<DiagnosticTest[]> {
    return this.http.get<DiagnosticTest[]>(`${this.apiUrl}/tests`);
  }

  getTestById(testId: string): Observable<DiagnosticTest> {
    return this.http.get<DiagnosticTest>(`${this.apiUrl}/tests/${testId}`);
  }

  getTestsByCategory(category: string): Observable<DiagnosticTest[]> {
    return this.http.get<DiagnosticTest[]>(`${this.apiUrl}/tests/category/${category}`);
  }

  // Equipment Management
  getEquipmentStatus(): Observable<DiagnosticEquipment[]> {
    return this.http.get<DiagnosticEquipment[]>(`${this.apiUrl}/equipment`);
  }

  getAvailableEquipment(testType?: string): Observable<DiagnosticEquipment[]> {
    const params = testType ? { params: { testType } } : {};
    return this.http.get<DiagnosticEquipment[]>(`${this.apiUrl}/equipment/available`, params);
  }

  updateEquipmentStatus(equipmentId: string, status: string, notes?: string): Observable<DiagnosticEquipment> {
    return this.http.put<DiagnosticEquipment>(`${this.apiUrl}/equipment/${equipmentId}/status`, {
      status,
      notes
    }, this.httpOptions);
  }

  reserveEquipment(equipmentId: string, requestId: string, duration: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/equipment/${equipmentId}/reserve`, {
      requestId,
      duration
    }, this.httpOptions);
  }

  releaseEquipment(equipmentId: string, requestId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/equipment/${equipmentId}/release`, {
      requestId
    }, this.httpOptions);
  }

  // Diagnostic Protocols
  getProtocols(): Observable<DiagnosticProtocol[]> {
    return this.http.get<DiagnosticProtocol[]>(`${this.apiUrl}/protocols`);
  }

  getProtocolByTestType(testType: string): Observable<DiagnosticProtocol> {
    return this.http.get<DiagnosticProtocol>(`${this.apiUrl}/protocols/test/${testType}`);
  }

  // Quality Control
  performQualityCheck(requestId: string, checkData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/quality-check/${requestId}`, checkData, this.httpOptions);
  }

  getQualityMetrics(filters?: any): Observable<any> {
    const params = filters ? { params: filters } : {};
    return this.http.get(`${this.apiUrl}/quality-metrics`, params);
  }

  // Calibration and Maintenance
  getCalibrationSchedule(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/calibration/schedule`);
  }

  recordCalibration(equipmentId: string, calibrationData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/calibration/${equipmentId}`, calibrationData, this.httpOptions);
  }

  getMaintenanceSchedule(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/maintenance/schedule`);
  }

  recordMaintenance(equipmentId: string, maintenanceData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/maintenance/${equipmentId}`, maintenanceData, this.httpOptions);
  }

  // Test Scheduling
  checkTestAvailability(testType: string, preferredTime: Date): Observable<any> {
    return this.http.post(`${this.apiUrl}/availability/check`, {
      testType,
      preferredTime
    }, this.httpOptions);
  }

  scheduleTest(requestId: string, scheduleData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/schedule/${requestId}`, scheduleData, this.httpOptions);
  }

  rescheduleTest(requestId: string, newScheduleData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/schedule/${requestId}`, newScheduleData, this.httpOptions);
  }

  // Safety and Compliance
  getSafetyProtocols(testType: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/safety/protocols/${testType}`);
  }

  recordSafetyIncident(incidentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/safety/incident`, incidentData, this.httpOptions);
  }

  getComplianceChecklist(testType: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/compliance/checklist/${testType}`);
  }

  // Private methods
  private loadInitialData(): void {
    // Load available tests
    this.getAvailableTests().subscribe({
      next: (tests) => this.availableTestsSubject.next(tests),
      error: (error) => console.error('Error loading tests:', error)
    });

    // Load equipment status
    this.getEquipmentStatus().subscribe({
      next: (equipment) => this.equipmentStatusSubject.next(equipment),
      error: (error) => console.error('Error loading equipment:', error)
    });

    // Load protocols
    this.getProtocols().subscribe({
      next: (protocols) => this.protocolsSubject.next(protocols),
      error: (error) => console.error('Error loading protocols:', error)
    });
  }

  // Utility methods
  refreshData(): void {
    this.loadInitialData();
  }

  getCurrentTests(): DiagnosticTest[] {
    return this.availableTestsSubject.value;
  }

  getCurrentEquipment(): DiagnosticEquipment[] {
    return this.equipmentStatusSubject.value;
  }

  getCurrentProtocols(): DiagnosticProtocol[] {
    return this.protocolsSubject.value;
  }

  // Helper methods
  getTestDuration(testType: string): number {
    const test = this.getCurrentTests().find(t => t.code === testType);
    return test ? test.estimatedDuration : 30; // default 30 minutes
  }

  isEquipmentAvailable(equipmentId: string): boolean {
    const equipment = this.getCurrentEquipment().find(e => e.id === equipmentId);
    return equipment ? equipment.status === 'available' : false;
  }

  getRequiredEquipment(testType: string): string[] {
    const test = this.getCurrentTests().find(t => t.code === testType);
    return test ? test.equipmentRequired : [];
  }

  formatTestName(testCode: string): string {
    const test = this.getCurrentTests().find(t => t.code === testCode);
    return test ? test.name : testCode.replace('_', ' ').toUpperCase();
  }
}