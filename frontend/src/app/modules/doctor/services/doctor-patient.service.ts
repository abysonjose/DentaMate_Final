import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface PatientProfile {
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    phone: string;
    email: string;
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
      phone: string;
    };
  };
  medicalInfo: {
    bloodType?: string;
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
    insuranceInfo?: {
      provider: string;
      policyNumber: string;
      groupNumber: string;
    };
  };
  dentalHistory: {
    lastVisit?: Date;
    totalVisits: number;
    commonIssues: string[];
    treatmentPreferences: string[];
  };
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  visitDate: Date;
  doctorId: string;
  doctorName: string;
  appointmentType: string;
  chiefComplaint: string;
  symptoms: string[];
  clinicalFindings: string;
  diagnosis: string;
  treatmentPlan: string;
  prescriptions: Prescription[];
  labRequests: LabRequest[];
  followUpRequired: boolean;
  followUpDate?: Date;
  notes: string;
  attachments: MedicalAttachment[];
}

export interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescribedDate: Date;
  status: 'active' | 'completed' | 'discontinued';
}

export interface LabRequest {
  id: string;
  testType: string;
  testName: string;
  requestDate: Date;
  status: 'requested' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  instructions?: string;
  results?: LabResult[];
}

export interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  resultDate: Date;
  notes?: string;
}

export interface MedicalAttachment {
  id: string;
  fileName: string;
  fileType: 'image' | 'document' | 'xray' | 'report';
  fileUrl: string;
  uploadDate: Date;
  description?: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  recordedDate: Date;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  oxygenSaturation?: number;
  recordedBy: string;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorPatientService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId');
    const userId = localStorage.getItem('userId');
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'X-User-ID': userId || '',
      'Content-Type': 'application/json'
    });
  }

  // Patient Profile Management - Integration with existing patient service
  getPatientProfile(patientId: string): Observable<PatientProfile> {
    return this.http.get<any>(`${this.apiUrl}/patient-service/api/v1/patients/${patientId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToPatientProfile(response.data || response)),
      catchError(error => {
        console.error('Error fetching patient profile:', error);
        throw error;
      })
    );
  }

  private mapToPatientProfile(data: any): PatientProfile {
    return {
      id: data.id || data._id,
      personalInfo: {
        firstName: data.firstName || data.personalInfo?.firstName || '',
        lastName: data.lastName || data.personalInfo?.lastName || '',
        dateOfBirth: new Date(data.dateOfBirth || data.personalInfo?.dateOfBirth),
        gender: data.gender || data.personalInfo?.gender || 'other',
        phone: data.phone || data.personalInfo?.phone || '',
        email: data.email || data.personalInfo?.email || '',
        address: {
          street: data.address?.street || data.personalInfo?.address?.street || '',
          city: data.address?.city || data.personalInfo?.address?.city || '',
          state: data.address?.state || data.personalInfo?.address?.state || '',
          zipCode: data.address?.zipCode || data.personalInfo?.address?.zipCode || '',
          country: data.address?.country || data.personalInfo?.address?.country || ''
        },
        emergencyContact: {
          name: data.emergencyContact?.name || data.personalInfo?.emergencyContact?.name || '',
          relationship: data.emergencyContact?.relationship || data.personalInfo?.emergencyContact?.relationship || '',
          phone: data.emergencyContact?.phone || data.personalInfo?.emergencyContact?.phone || ''
        }
      },
      medicalInfo: {
        bloodType: data.bloodType || data.medicalInfo?.bloodType,
        allergies: data.allergies || data.medicalInfo?.allergies || [],
        chronicConditions: data.chronicConditions || data.medicalInfo?.chronicConditions || [],
        currentMedications: data.currentMedications || data.medicalInfo?.currentMedications || [],
        insuranceInfo: data.insuranceInfo || data.medicalInfo?.insuranceInfo
      },
      dentalHistory: {
        lastVisit: data.lastVisit ? new Date(data.lastVisit) : undefined,
        totalVisits: data.totalVisits || data.dentalHistory?.totalVisits || 0,
        commonIssues: data.commonIssues || data.dentalHistory?.commonIssues || [],
        treatmentPreferences: data.treatmentPreferences || data.dentalHistory?.treatmentPreferences || []
      }
    };
  }

  updatePatientProfile(patientId: string, profile: Partial<PatientProfile>): Observable<PatientProfile> {
    return this.http.put<any>(`${this.apiUrl}/patient-service/api/v1/patients/${patientId}`, profile, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToPatientProfile(response.data || response))
    );
  }

  searchPatients(query: string, filters?: {
    ageFrom?: number;
    ageTo?: number;
    gender?: string;
    lastVisitFrom?: string;
    lastVisitTo?: string;
  }): Observable<PatientProfile[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/patient-service/api/v1/patients/search?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const patients = response.data || response;
        return patients.map((p: any) => this.mapToPatientProfile(p));
      })
    );
  }

  // Medical Records - Integration with appointment service
  getPatientMedicalHistory(patientId: string, limit?: number): Observable<MedicalRecord[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get<any>(`${this.apiUrl}/appointment-service/api/v1/appointments/patient/${patientId}/history${params}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const appointments = response.data || response;
        return appointments.map((apt: any) => this.mapToMedicalRecord(apt));
      })
    );
  }

  private mapToMedicalRecord(appointment: any): MedicalRecord {
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      visitDate: new Date(appointment.appointmentDateTime),
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName || `Doctor ${appointment.doctorId}`,
      appointmentType: appointment.appointmentType,
      chiefComplaint: appointment.chiefComplaint || appointment.reason || '',
      symptoms: appointment.symptoms || [],
      clinicalFindings: appointment.clinicalFindings || '',
      diagnosis: appointment.diagnosis || '',
      treatmentPlan: appointment.treatmentPlan || '',
      prescriptions: appointment.prescriptions || [],
      labRequests: appointment.labRequests || [],
      followUpRequired: appointment.followUpRequired || false,
      followUpDate: appointment.followUpDate ? new Date(appointment.followUpDate) : undefined,
      notes: appointment.notes || appointment.consultationNotes || '',
      attachments: appointment.attachments || []
    };
  }

  getMedicalRecord(recordId: string): Observable<MedicalRecord> {
    return this.http.get<any>(`${this.apiUrl}/appointment-service/api/v1/appointments/${recordId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToMedicalRecord(response.data || response))
    );
  }

  createMedicalRecord(patientId: string, record: Partial<MedicalRecord>): Observable<MedicalRecord> {
    // This would typically be handled by completing an appointment
    // For now, we'll use the appointment service to update appointment with medical data
    const appointmentData = {
      patientId,
      chiefComplaint: record.chiefComplaint,
      symptoms: record.symptoms,
      clinicalFindings: record.clinicalFindings,
      diagnosis: record.diagnosis,
      treatmentPlan: record.treatmentPlan,
      notes: record.notes,
      followUpRequired: record.followUpRequired,
      followUpDate: record.followUpDate
    };

    return this.http.post<any>(`${this.apiUrl}/appointment-service/api/v1/appointments/medical-record`, appointmentData, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToMedicalRecord(response.data || response))
    );
  }

  updateMedicalRecord(recordId: string, updates: Partial<MedicalRecord>): Observable<MedicalRecord> {
    return this.http.put<any>(`${this.apiUrl}/appointment-service/api/v1/appointments/${recordId}`, updates, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToMedicalRecord(response.data || response))
    );
  }

  // Prescriptions - Integration with prescription service
  getPatientPrescriptions(patientId: string, status?: string): Observable<Prescription[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<any>(`${this.apiUrl}/prescription-service/api/v1/prescriptions/patient/${patientId}${params}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const prescriptions = response.data || response;
        return prescriptions.map((p: any) => this.mapToPrescription(p));
      }),
      catchError(error => {
        console.error('Error fetching prescriptions:', error);
        return [];
      })
    );
  }

  private mapToPrescription(data: any): Prescription {
    return {
      id: data.id,
      medicationName: data.medicationName || data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      duration: data.duration,
      instructions: data.instructions,
      prescribedDate: new Date(data.prescribedDate || data.createdAt),
      status: data.status?.toLowerCase() || 'active'
    };
  }

  createPrescription(patientId: string, prescription: Partial<Prescription>): Observable<Prescription> {
    return this.http.post<any>(`${this.apiUrl}/prescription-service/api/v1/prescriptions`, {
      patientId,
      ...prescription
    }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToPrescription(response.data || response))
    );
  }

  // Lab Requests - Integration with lab service
  getPatientLabRequests(patientId: string, status?: string): Observable<LabRequest[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<any>(`${this.apiUrl}/lab-service/api/v1/requests/patient/${patientId}${params}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const requests = response.data || response;
        return requests.map((r: any) => this.mapToLabRequest(r));
      }),
      catchError(error => {
        console.error('Error fetching lab requests:', error);
        return [];
      })
    );
  }

  private mapToLabRequest(data: any): LabRequest {
    return {
      id: data.id,
      testType: data.testType,
      testName: data.testName,
      requestDate: new Date(data.requestDate || data.createdAt),
      status: data.status?.toLowerCase().replace('_', '-') || 'requested',
      priority: data.priority?.toLowerCase() || 'routine',
      instructions: data.instructions,
      results: data.results || []
    };
  }

  createLabRequest(patientId: string, labRequest: Partial<LabRequest>): Observable<LabRequest> {
    return this.http.post<any>(`${this.apiUrl}/lab-service/api/v1/requests`, {
      patientId,
      ...labRequest
    }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToLabRequest(response.data || response))
    );
  }

  // Patient Statistics
  getPatientStatistics(patientId: string): Observable<{
    totalVisits: number;
    lastVisit: Date;
    upcomingAppointments: number;
    activePrescriptions: number;
    pendingLabResults: number;
    treatmentCompliance: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/patient-service/api/v1/patients/${patientId}/stats`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const data = response.data || response;
        return {
          totalVisits: data.totalVisits || 0,
          lastVisit: data.lastVisit ? new Date(data.lastVisit) : new Date(),
          upcomingAppointments: data.upcomingAppointments || 0,
          activePrescriptions: data.activePrescriptions || 0,
          pendingLabResults: data.pendingLabResults || 0,
          treatmentCompliance: data.treatmentCompliance || 0
        };
      }),
      catchError(error => {
        console.error('Error fetching patient stats:', error);
        return [{
          totalVisits: 0,
          lastVisit: new Date(),
          upcomingAppointments: 0,
          activePrescriptions: 0,
          pendingLabResults: 0,
          treatmentCompliance: 0
        }];
      })
    );
  }

  // Vital Signs
  getPatientVitalSigns(patientId: string, limit?: number): Observable<VitalSigns[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get<VitalSigns[]>(`${this.apiUrl}/${patientId}/vital-signs${params}`);
  }

  recordVitalSigns(patientId: string, vitals: Partial<VitalSigns>): Observable<VitalSigns> {
    return this.http.post<VitalSigns>(`${this.apiUrl}/${patientId}/vital-signs`, vitals);
  }

  // Medical Attachments
  getPatientAttachments(patientId: string, type?: string): Observable<MedicalAttachment[]> {
    const params = type ? `?type=${type}` : '';
    return this.http.get<MedicalAttachment[]>(`${this.apiUrl}/${patientId}/attachments${params}`);
  }

  uploadAttachment(patientId: string, file: File, description?: string): Observable<MedicalAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    
    return this.http.post<MedicalAttachment>(`${this.apiUrl}/${patientId}/attachments`, formData);
  }

  deleteAttachment(attachmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/attachments/${attachmentId}`);
  }

  // Patient Timeline
  getPatientTimeline(patientId: string, dateFrom?: string, dateTo?: string): Observable<any[]> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/timeline?${params.toString()}`);
  }

  // Treatment Plans
  getPatientTreatmentPlans(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/treatment-plans`);
  }

  createTreatmentPlan(patientId: string, plan: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${patientId}/treatment-plans`, plan);
  }

  updateTreatmentPlan(planId: string, updates: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/treatment-plans/${planId}`, updates);
  }

  // Allergies and Medical Conditions
  addPatientAllergy(patientId: string, allergy: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${patientId}/allergies`, { allergy });
  }

  removePatientAllergy(patientId: string, allergy: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${patientId}/allergies/${encodeURIComponent(allergy)}`);
  }

  addMedicalCondition(patientId: string, condition: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${patientId}/conditions`, { condition });
  }

  removeMedicalCondition(patientId: string, condition: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${patientId}/conditions/${encodeURIComponent(condition)}`);
  }

  // Patient Notes
  getPatientNotes(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/notes`);
  }

  addPatientNote(patientId: string, note: string, type: string = 'general'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${patientId}/notes`, { note, type });
  }

  updatePatientNote(noteId: string, note: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/notes/${noteId}`, { note });
  }

  deletePatientNote(noteId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/notes/${noteId}`);
  }

  // Emergency Information
  getEmergencyContacts(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/emergency-contacts`);
  }

  addEmergencyContact(patientId: string, contact: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${patientId}/emergency-contacts`, contact);
  }

  updateEmergencyContact(contactId: string, contact: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/emergency-contacts/${contactId}`, contact);
  }

  deleteEmergencyContact(contactId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/emergency-contacts/${contactId}`);
  }
}