import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface BranchPatient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  registrationDate: Date;
  lastVisit?: Date;
  totalVisits: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BranchPatientService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin/patients`;

  constructor(private http: HttpClient) {}

  // Read-only patient operations for branch admin
  getAllPatients(): Observable<BranchPatient[]> {
    return this.http.get<BranchPatient[]>(this.apiUrl);
  }

  getPatientById(id: string): Observable<BranchPatient> {
    return this.http.get<BranchPatient>(`${this.apiUrl}/${id}`);
  }

  getPatientAppointmentHistory(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/appointments`);
  }

  getPatientPrescriptions(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/prescriptions`);
  }

  getPatientReports(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/reports`);
  }

  flagPatientRecord(patientId: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${patientId}/flag`, { reason });
  }

  searchPatients(query: string): Observable<BranchPatient[]> {
    return this.http.get<BranchPatient[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }

  getPatientAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics`);
  }
}