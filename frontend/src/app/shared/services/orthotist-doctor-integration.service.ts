import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OrthodonticCaseAssignment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  caseType: 'BRACES' | 'ALIGNERS' | 'RETAINER' | 'APPLIANCE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  measurements: CaseMeasurements;
  specifications: OrthodonticSpecifications;
  estimatedDuration: number; // in days
  specialInstructions?: string;
  assignedDate: Date;
  requestedDeliveryDate?: Date;
}

export interface CaseMeasurements {
  dentalImpressions: FileAttachment[];
  xrayImages: FileAttachment[];
  oralPhotos: FileAttachment[];
  digitalScans: FileAttachment[];
  measurements: {
    upperArch: ArchMeasurement;
    lowerArch: ArchMeasurement;
    bite: BiteMeasurement;
  };
  doctorNotes: string;
}

export interface OrthodonticSpecifications {
  applianceType: string;
  materialPreference: string;
  colorPreference?: string;
  specialFeatures: string[];
  treatmentGoals: string[];
  contraindications?: string[];
}

export interface ArchMeasurement {
  width: number;
  length: number;
  crowding: number;
  spacing: number;
  asymmetry?: number;
}

export interface BiteMeasurement {
  overjet: number;
  overbite: number;
  midlineDeviation: number;
  classification: 'CLASS_I' | 'CLASS_II' | 'CLASS_III';
}

export interface FileAttachment {
  id: string;
  filename: string;
  url: string;
  uploadDate: Date;
  fileSize: number;
  mimeType: string;
}

export interface CaseProgressUpdate {
  caseId: string;
  status: 'RECEIVED' | 'IN_MEASUREMENT_REVIEW' | 'IN_FABRICATION' | 'READY' | 'DELIVERED';
  progress: number; // 0-100
  currentStage: string;
  estimatedCompletion: Date;
  notes?: string;
  images?: FileAttachment[];
  qualityChecksPassed: boolean;
}

export interface ClarificationRequest {
  caseId: string;
  orthotistId: string;
  doctorId: string;
  subject: string;
  message: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  attachments?: FileAttachment[];
  requestDate: Date;
  responseRequired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrthotistDoctorIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/orthotist-doctor`;
  private caseUpdatesSubject = new BehaviorSubject<CaseProgressUpdate[]>([]);
  public caseUpdates$ = this.caseUpdatesSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Doctor to Orthotist Communication
  assignCaseToOrthotist(caseAssignment: Partial<OrthodonticCaseAssignment>): Observable<any> {
    return this.http.post(`${this.apiUrl}/assign-case`, caseAssignment, {
      headers: this.getHeaders()
    });
  }

  getCaseAssignments(doctorId?: string): Observable<OrthodonticCaseAssignment[]> {
    const params = doctorId ? `?doctorId=${doctorId}` : '';
    return this.http.get<OrthodonticCaseAssignment[]>(`${this.apiUrl}/assignments${params}`, {
      headers: this.getHeaders()
    });
  }

  updateCaseSpecifications(caseId: string, specifications: Partial<OrthodonticSpecifications>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cases/${caseId}/specifications`, specifications, {
      headers: this.getHeaders()
    });
  }

  // Orthotist to Doctor Communication
  sendProgressUpdate(update: CaseProgressUpdate): Observable<any> {
    return this.http.post(`${this.apiUrl}/progress-update`, update, {
      headers: this.getHeaders()
    });
  }

  requestClarification(request: ClarificationRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/clarification-request`, request, {
      headers: this.getHeaders()
    });
  }

  notifyReadyForDelivery(caseId: string, deliveryDetails: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ready-for-delivery`, {
      caseId,
      ...deliveryDetails
    }, {
      headers: this.getHeaders()
    });
  }

  // Shared Communication
  getCaseHistory(caseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cases/${caseId}/history`, {
      headers: this.getHeaders()
    });
  }

  getCommunicationThread(caseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cases/${caseId}/communications`, {
      headers: this.getHeaders()
    });
  }

  sendMessage(caseId: string, message: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/messages`, message, {
      headers: this.getHeaders()
    });
  }

  // File Management
  uploadMeasurementFiles(caseId: string, files: File[]): Observable<FileAttachment[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    return this.http.post<FileAttachment[]>(`${this.apiUrl}/cases/${caseId}/upload-measurements`, formData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      })
    });
  }

  downloadFile(fileId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/files/${fileId}/download`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Real-time Updates
  subscribeToUpdates(caseId: string): Observable<any> {
    // WebSocket implementation for real-time updates
    return new Observable(observer => {
      const ws = new WebSocket(`${environment.wsUrl}/orthotist-doctor/${caseId}`);
      
      ws.onmessage = (event) => {
        observer.next(JSON.parse(event.data));
      };
      
      ws.onerror = (error) => {
        observer.error(error);
      };
      
      ws.onclose = () => {
        observer.complete();
      };
      
      return () => ws.close();
    });
  }

  // Analytics and Reporting
  getDoctorOrthotistStats(doctorId?: string): Observable<any> {
    const params = doctorId ? `?doctorId=${doctorId}` : '';
    return this.http.get(`${this.apiUrl}/stats${params}`, {
      headers: this.getHeaders()
    });
  }

  getCasePerformanceMetrics(dateRange?: { start: Date; end: Date }): Observable<any> {
    const params = dateRange ? 
      `?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}` : '';
    return this.http.get(`${this.apiUrl}/performance-metrics${params}`, {
      headers: this.getHeaders()
    });
  }
}