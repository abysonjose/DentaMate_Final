import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  brandNames: string[];
  category: string;
  dosageForm: string; // tablet, capsule, syrup, injection, etc.
  availableStrengths: string[];
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  pregnancyCategory?: string;
  description?: string;
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  description: string;
  medications: {
    medicationId: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  prescriptionDate: Date;
  medications: PrescriptionMedication[];
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'expired';
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  pharmacyInstructions?: string;
  digitalSignature?: string;
  printedAt?: Date;
  dispensedAt?: Date;
  expiryDate: Date;
}

export interface PrescriptionMedication {
  id: string;
  medicationId: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  substitutionAllowed: boolean;
  refillsAllowed: number;
  refillsRemaining: number;
  status: 'active' | 'completed' | 'discontinued';
  discontinuedReason?: string;
  discontinuedDate?: Date;
}

export interface DrugInteraction {
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  clinicalEffect: string;
  management: string;
  medications: string[];
}

export interface AllergyAlert {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  reaction: string;
  medicationName: string;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorPrescriptionService {
  private apiUrl = `${environment.apiUrl}/doctor/prescriptions`;

  constructor(private http: HttpClient) {}

  // Medication Database
  searchMedications(query: string, filters?: {
    category?: string;
    dosageForm?: string;
    strength?: string;
  }): Observable<Medication[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<Medication[]>(`${this.apiUrl}/medications/search?${params.toString()}`);
  }

  getMedicationDetails(medicationId: string): Observable<Medication> {
    return this.http.get<Medication>(`${this.apiUrl}/medications/${medicationId}`);
  }

  getPopularMedications(limit: number = 20): Observable<Medication[]> {
    return this.http.get<Medication[]>(`${this.apiUrl}/medications/popular?limit=${limit}`);
  }

  getMedicationsByCategory(category: string): Observable<Medication[]> {
    return this.http.get<Medication[]>(`${this.apiUrl}/medications/category/${category}`);
  }

  // Prescription Management
  createPrescription(prescription: Partial<Prescription>): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.apiUrl}`, prescription);
  }

  updatePrescription(prescriptionId: string, updates: Partial<Prescription>): Observable<Prescription> {
    return this.http.put<Prescription>(`${this.apiUrl}/${prescriptionId}`, updates);
  }

  getPrescription(prescriptionId: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.apiUrl}/${prescriptionId}`);
  }

  getPatientPrescriptions(patientId: string, status?: string): Observable<Prescription[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<Prescription[]>(`${this.apiUrl}/patient/${patientId}${params}`);
  }

  getDoctorPrescriptions(status?: string, dateFrom?: string, dateTo?: string): Observable<Prescription[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get<Prescription[]>(`${this.apiUrl}/doctor?${params.toString()}`);
  }

  // Prescription Actions
  finalizePrescription(prescriptionId: string): Observable<Prescription> {
    return this.http.patch<Prescription>(`${this.apiUrl}/${prescriptionId}/finalize`, {
      status: 'active',
      finalizedAt: new Date().toISOString()
    });
  }

  cancelPrescription(prescriptionId: string, reason: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${prescriptionId}/cancel`, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date().toISOString()
    });
  }

  renewPrescription(prescriptionId: string, duration: string): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.apiUrl}/${prescriptionId}/renew`, {
      duration,
      renewedAt: new Date().toISOString()
    });
  }

  // Medication Management within Prescription
  addMedicationToPrescription(prescriptionId: string, medication: Partial<PrescriptionMedication>): Observable<PrescriptionMedication> {
    return this.http.post<PrescriptionMedication>(`${this.apiUrl}/${prescriptionId}/medications`, medication);
  }

  updatePrescriptionMedication(prescriptionId: string, medicationId: string, updates: Partial<PrescriptionMedication>): Observable<PrescriptionMedication> {
    return this.http.put<PrescriptionMedication>(`${this.apiUrl}/${prescriptionId}/medications/${medicationId}`, updates);
  }

  removeMedicationFromPrescription(prescriptionId: string, medicationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${prescriptionId}/medications/${medicationId}`);
  }

  discontinueMedication(prescriptionId: string, medicationId: string, reason: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${prescriptionId}/medications/${medicationId}/discontinue`, {
      reason,
      discontinuedAt: new Date().toISOString()
    });
  }

  // Drug Interactions and Safety
  checkDrugInteractions(medicationIds: string[]): Observable<DrugInteraction[]> {
    return this.http.post<DrugInteraction[]>(`${this.apiUrl}/check-interactions`, { medicationIds });
  }

  checkPatientAllergies(patientId: string, medicationIds: string[]): Observable<AllergyAlert[]> {
    return this.http.post<AllergyAlert[]>(`${this.apiUrl}/check-allergies`, { patientId, medicationIds });
  }

  validatePrescription(prescription: Partial<Prescription>): Observable<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
    interactions: DrugInteraction[];
    allergies: AllergyAlert[];
  }> {
    return this.http.post(`${this.apiUrl}/validate`, prescription);
  }

  // Prescription Templates
  getPrescriptionTemplates(): Observable<PrescriptionTemplate[]> {
    return this.http.get<PrescriptionTemplate[]>(`${this.apiUrl}/templates`);
  }

  createPrescriptionTemplate(template: Partial<PrescriptionTemplate>): Observable<PrescriptionTemplate> {
    return this.http.post<PrescriptionTemplate>(`${this.apiUrl}/templates`, template);
  }

  updatePrescriptionTemplate(templateId: string, updates: Partial<PrescriptionTemplate>): Observable<PrescriptionTemplate> {
    return this.http.put<PrescriptionTemplate>(`${this.apiUrl}/templates/${templateId}`, updates);
  }

  deletePrescriptionTemplate(templateId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/templates/${templateId}`);
  }

  applyTemplate(templateId: string, patientId: string): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.apiUrl}/templates/${templateId}/apply`, { patientId });
  }

  // Digital Prescription Features
  generateDigitalSignature(prescriptionId: string): Observable<{ signature: string }> {
    return this.http.post<{ signature: string }>(`${this.apiUrl}/${prescriptionId}/sign`, {});
  }

  generatePrescriptionPDF(prescriptionId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${prescriptionId}/pdf`, { responseType: 'blob' });
  }

  sendPrescriptionToPharmacy(prescriptionId: string, pharmacyId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${prescriptionId}/send-to-pharmacy`, { pharmacyId });
  }

  // Voice-to-Text Prescription (Future Feature)
  transcribePrescription(audioBlob: Blob): Observable<{
    transcription: string;
    confidence: number;
    suggestedMedications: Medication[];
  }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'prescription.wav');
    
    return this.http.post(`${this.apiUrl}/transcribe`, formData);
  }

  // Prescription Analytics
  getPrescriptionStats(): Observable<{
    totalPrescriptions: number;
    activePrescriptions: number;
    mostPrescribedMedications: { name: string; count: number }[];
    averageMedicationsPerPrescription: number;
    complianceRate: number;
  }> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  getMedicationUsageStats(dateFrom: string, dateTo: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/medication-usage`, {
      params: { dateFrom, dateTo }
    });
  }

  // Prescription History and Search
  searchPrescriptions(query: string, filters?: {
    patientName?: string;
    medicationName?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<Prescription[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<Prescription[]>(`${this.apiUrl}/search?${params.toString()}`);
  }

  // Refill Management
  processRefillRequest(prescriptionId: string, medicationId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${prescriptionId}/medications/${medicationId}/refill`, {});
  }

  getPendingRefills(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/refills/pending`);
  }

  approveRefill(refillId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/refills/${refillId}/approve`, {});
  }

  denyRefill(refillId: string, reason: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/refills/${refillId}/deny`, { reason });
  }

  // Integration with Pharmacy Systems
  getConnectedPharmacies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pharmacies`);
  }

  checkMedicationAvailability(medicationId: string, pharmacyId: string): Observable<{
    available: boolean;
    quantity: number;
    price: number;
    estimatedFillTime: number;
  }> {
    return this.http.get(`${this.apiUrl}/medications/${medicationId}/availability/${pharmacyId}`);
  }
}