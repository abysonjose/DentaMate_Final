import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface Patient {
  id?: string;
  registrationId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phoneNumber: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  medicalHistory?: {
    allergies: string[];
    medications: string[];
    conditions: string[];
    notes?: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  branchId: string;
  status: 'active' | 'inactive' | 'blocked';
}

export interface PatientSearchResult {
  id: string;
  registrationId: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  lastVisit?: Date;
  status: string;
}

export interface RegistrationValidation {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class PatientRegistrationService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;
  
  private searchSubject = new BehaviorSubject<string>('');
  public searchResults$ = this.searchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    map(query => query.length >= 2 ? this.searchPatients(query) : [])
  );

  constructor(private http: HttpClient) {}

  // Patient Registration
  registerPatient(patient: Omit<Patient, 'id' | 'registrationId' | 'createdAt' | 'updatedAt'>): Observable<Patient> {
    return this.http.post<Patient>(`${this.apiUrl}/register`, patient);
  }

  // Quick Registration (minimal fields)
  quickRegisterPatient(patientData: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    dateOfBirth: Date;
    gender: string;
  }): Observable<Patient> {
    return this.http.post<Patient>(`${this.apiUrl}/quick-register`, patientData);
  }

  // Patient Search
  searchPatients(query: string): Observable<PatientSearchResult[]> {
    const params = new HttpParams()
      .set('query', query)
      .set('limit', '10');
    return this.http.get<PatientSearchResult[]>(`${this.apiUrl}/search`, { params });
  }

  // Advanced Search
  advancedSearchPatients(criteria: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    registrationId?: string;
    dateOfBirth?: Date;
    status?: string;
  }): Observable<PatientSearchResult[]> {
    let params = new HttpParams();
    Object.keys(criteria).forEach(key => {
      const value = criteria[key as keyof typeof criteria];
      if (value) {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<PatientSearchResult[]>(`${this.apiUrl}/advanced-search`, { params });
  }

  // Get Patient Details
  getPatientById(patientId: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${patientId}`);
  }

  getPatientByRegistrationId(registrationId: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/registration/${registrationId}`);
  }

  // Update Patient Information
  updatePatient(patientId: string, updates: Partial<Patient>): Observable<Patient> {
    return this.http.put<Patient>(`${this.apiUrl}/${patientId}`, updates);
  }

  // Update Non-Medical Information Only (receptionist permission)
  updatePatientBasicInfo(patientId: string, updates: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    address?: Partial<Patient['address']>;
    emergencyContact?: Partial<Patient['emergencyContact']>;
  }): Observable<Patient> {
    return this.http.put<Patient>(`${this.apiUrl}/${patientId}/basic-info`, updates);
  }

  // Patient Status Management
  activatePatient(patientId: string): Observable<Patient> {
    return this.http.patch<Patient>(`${this.apiUrl}/${patientId}/activate`, {});
  }

  deactivatePatient(patientId: string, reason: string): Observable<Patient> {
    return this.http.patch<Patient>(`${this.apiUrl}/${patientId}/deactivate`, { reason });
  }

  // Validation
  validatePatientData(patient: Partial<Patient>): Observable<RegistrationValidation[]> {
    return this.http.post<RegistrationValidation[]>(`${this.apiUrl}/validate`, patient);
  }

  // Check for Duplicates
  checkDuplicatePatient(phoneNumber: string, email?: string): Observable<{
    isDuplicate: boolean;
    existingPatients: PatientSearchResult[];
  }> {
    let params = new HttpParams().set('phoneNumber', phoneNumber);
    if (email) {
      params = params.set('email', email);
    }
    return this.http.get<{
      isDuplicate: boolean;
      existingPatients: PatientSearchResult[];
    }>(`${this.apiUrl}/check-duplicate`, { params });
  }

  // Generate Registration ID
  generateRegistrationId(): Observable<{ registrationId: string }> {
    return this.http.post<{ registrationId: string }>(`${this.apiUrl}/generate-id`, {});
  }

  // Patient Statistics
  getPatientStats(): Observable<{
    totalPatients: number;
    newPatientsToday: number;
    activePatients: number;
    inactivePatients: number;
  }> {
    return this.http.get<{
      totalPatients: number;
      newPatientsToday: number;
      activePatients: number;
      inactivePatients: number;
    }>(`${this.apiUrl}/stats`);
  }

  // Recent Patients
  getRecentPatients(limit: number = 10): Observable<PatientSearchResult[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<PatientSearchResult[]>(`${this.apiUrl}/recent`, { params });
  }

  // Patient History (Read-only for receptionist)
  getPatientVisitHistory(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/visit-history`);
  }

  getPatientAppointmentHistory(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/appointment-history`);
  }

  // Bulk Operations
  bulkUpdatePatients(patientIds: string[], updates: Partial<Patient>): Observable<{ updated: number; failed: number }> {
    return this.http.put<{ updated: number; failed: number }>(`${this.apiUrl}/bulk-update`, {
      patientIds,
      updates
    });
  }

  // Export Patient Data
  exportPatients(criteria?: any): Observable<Blob> {
    let params = new HttpParams();
    if (criteria) {
      Object.keys(criteria).forEach(key => {
        if (criteria[key]) {
          params = params.set(key, criteria[key]);
        }
      });
    }
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }

  // Patient Communication Preferences
  getPatientCommunicationPreferences(patientId: string): Observable<{
    smsEnabled: boolean;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    preferredLanguage: string;
  }> {
    return this.http.get<{
      smsEnabled: boolean;
      emailEnabled: boolean;
      whatsappEnabled: boolean;
      preferredLanguage: string;
    }>(`${this.apiUrl}/${patientId}/communication-preferences`);
  }

  updatePatientCommunicationPreferences(patientId: string, preferences: {
    smsEnabled?: boolean;
    emailEnabled?: boolean;
    whatsappEnabled?: boolean;
    preferredLanguage?: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${patientId}/communication-preferences`, preferences);
  }

  // Search Utilities
  updateSearchQuery(query: string): void {
    this.searchSubject.next(query);
  }

  clearSearch(): void {
    this.searchSubject.next('');
  }

  // Form Validation Helpers
  validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phoneNumber);
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateDateOfBirth(dateOfBirth: Date): boolean {
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    return age >= 0 && age <= 150;
  }

  // Patient Photo Management
  uploadPatientPhoto(patientId: string, photo: File): Observable<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('photo', photo);
    return this.http.post<{ photoUrl: string }>(`${this.apiUrl}/${patientId}/photo`, formData);
  }

  deletePatientPhoto(patientId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${patientId}/photo`);
  }
}