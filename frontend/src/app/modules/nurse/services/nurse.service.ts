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

export interface VitalsRecord {
  patientId: string;
  vitals: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
  };
  notes?: string;
}

export interface CareNote {
  patientId: string;
  type: string;
  title: string;
  description: string;
  priority?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NurseService {
  private readonly API_URL = `${environment.apiUrl}/nursing-care`;

  constructor(private http: HttpClient) {}

  // Dashboard data
  getAssignedPatients(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/assigned-patients`);
  }

  getPendingTasks(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/pending-tasks`);
  }

  getVitalsToRecord(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/vitals-queue`);
  }

  // Patient care
  getPatientDetails(patientId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/patients/${patientId}`);
  }

  getPatientCareHistory(patientId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/patients/${patientId}/care-history`);
  }

  getPatientVitalsHistory(patientId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/patients/${patientId}/vitals-history`);
  }

  // Vitals recording
  recordVitals(vitalsData: VitalsRecord): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/vitals/record`, vitalsData);
  }

  // Care notes
  addCareNote(careNote: CareNote): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/care-notes`, careNote);
  }

  // Task management
  completeTask(taskId: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.API_URL}/tasks/${taskId}/complete`, {});
  }

  // Medication administration
  getMedicationSchedule(patientId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/patients/${patientId}/medications`);
  }

  administerMedication(medicationId: string, administrationData: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/medications/${medicationId}/administer`, administrationData);
  }

  // Ward management
  getWardPatients(wardId?: string): Observable<ApiResponse> {
    let params = new HttpParams();
    if (wardId) {
      params = params.set('wardId', wardId);
    }
    return this.http.get<ApiResponse>(`${this.API_URL}/ward/patients`, { params });
  }

  // Shift handover
  getShiftHandoverData(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_URL}/shift/handover`);
  }

  createShiftHandover(handoverData: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/shift/handover`, handoverData);
  }
}