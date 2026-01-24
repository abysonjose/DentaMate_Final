import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DoctorTreatmentSummary {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  treatmentDate: Date;
  treatmentType: string;
  procedures: TreatmentProcedure[];
  diagnosis: string;
  prescriptions: PrescriptionItem[];
  consultationFee: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'CANCELLED';
  notes?: string;
  followUpRequired: boolean;
}

export interface TreatmentProcedure {
  id: string;
  name: string;
  code: string;
  description: string;
  duration: number;
  cost: number;
  category: 'CONSULTATION' | 'CLEANING' | 'FILLING' | 'EXTRACTION' | 'ROOT_CANAL' | 'CROWN' | 'IMPLANT' | 'ORTHODONTICS' | 'OTHER';
  completed: boolean;
  notes?: string;
}

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  cost: number;
  quantity: number;
}

export interface BillableServiceMapping {
  procedureId: string;
  procedureName: string;
  standardCost: number;
  billingCode: string;
  category: string;
  taxable: boolean;
  description: string;
}

export interface DoctorBillingPreferences {
  doctorId: string;
  consultationFee: number;
  preferredBillingItems: string[];
  customProcedureCosts: { [procedureId: string]: number };
  autoGenerateBill: boolean;
  includePrescriptionCosts: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BillingDoctorIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/billing-doctor`;
  private treatmentUpdatesSubject = new BehaviorSubject<DoctorTreatmentSummary[]>([]);
  
  treatmentUpdates$ = this.treatmentUpdatesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Doctor Treatment Data for Billing
  getCompletedTreatments(filters?: any): Observable<DoctorTreatmentSummary[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<DoctorTreatmentSummary[]>(`${this.apiUrl}/completed-treatments`, { params });
  }

  getTreatmentSummary(appointmentId: string): Observable<DoctorTreatmentSummary> {
    return this.http.get<DoctorTreatmentSummary>(`${this.apiUrl}/treatment-summary/${appointmentId}`);
  }

  getTreatmentsByDoctor(doctorId: string, startDate?: Date, endDate?: Date): Observable<DoctorTreatmentSummary[]> {
    let params = new HttpParams().set('doctorId', doctorId);
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<DoctorTreatmentSummary[]>(`${this.apiUrl}/treatments-by-doctor`, { params });
  }

  // Billable Service Mapping
  getBillableServiceMappings(): Observable<BillableServiceMapping[]> {
    return this.http.get<BillableServiceMapping[]>(`${this.apiUrl}/billable-services`);
  }

  mapTreatmentToBillableItems(treatmentSummary: DoctorTreatmentSummary): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/map-to-billable-items`, treatmentSummary);
  }

  getStandardProcedureCosts(): Observable<{ [procedureCode: string]: number }> {
    return this.http.get<{ [procedureCode: string]: number }>(`${this.apiUrl}/standard-procedure-costs`);
  }

  // Doctor Billing Preferences
  getDoctorBillingPreferences(doctorId: string): Observable<DoctorBillingPreferences> {
    return this.http.get<DoctorBillingPreferences>(`${this.apiUrl}/doctor-preferences/${doctorId}`);
  }

  updateDoctorBillingPreferences(preferences: DoctorBillingPreferences): Observable<DoctorBillingPreferences> {
    return this.http.put<DoctorBillingPreferences>(`${this.apiUrl}/doctor-preferences`, preferences);
  }

  // Treatment Status Updates for Billing
  markTreatmentBilled(appointmentId: string, billId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/mark-billed`, { appointmentId, billId });
  }

  getTreatmentBillingStatus(appointmentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/billing-status/${appointmentId}`);
  }

  // Real-time Treatment Completion Notifications
  subscribeToTreatmentCompletions(): Observable<DoctorTreatmentSummary> {
    // WebSocket or Server-Sent Events implementation
    return this.http.get<DoctorTreatmentSummary>(`${this.apiUrl}/treatment-completions/subscribe`);
  }

  // Prescription Cost Integration
  getPrescriptionCosts(prescriptions: PrescriptionItem[]): Observable<{ [prescriptionId: string]: number }> {
    return this.http.post<{ [prescriptionId: string]: number }>(`${this.apiUrl}/prescription-costs`, { prescriptions });
  }

  // Doctor Notes for Billing Context
  getTreatmentNotesForBilling(appointmentId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/treatment-notes/${appointmentId}`, { responseType: 'text' });
  }

  // Billing Feedback to Doctor
  sendBillingStatusToDoctor(appointmentId: string, status: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/billing-feedback`, {
      appointmentId,
      status,
      amount,
      timestamp: new Date()
    });
  }

  // Treatment Validation for Billing
  validateTreatmentForBilling(appointmentId: string): Observable<{ valid: boolean; issues: string[] }> {
    return this.http.get<{ valid: boolean; issues: string[] }>(`${this.apiUrl}/validate-treatment/${appointmentId}`);
  }

  // Utility Methods
  calculateTreatmentCost(procedures: TreatmentProcedure[]): number {
    return procedures.reduce((total, procedure) => total + (procedure.completed ? procedure.cost : 0), 0);
  }

  calculatePrescriptionCost(prescriptions: PrescriptionItem[]): number {
    return prescriptions.reduce((total, prescription) => total + (prescription.cost * prescription.quantity), 0);
  }

  formatTreatmentForBilling(treatment: DoctorTreatmentSummary): any {
    return {
      appointmentId: treatment.appointmentId,
      patientId: treatment.patientId,
      patientName: treatment.patientName,
      doctorName: treatment.doctorName,
      treatmentDate: treatment.treatmentDate,
      consultationFee: treatment.consultationFee,
      procedures: treatment.procedures.filter(p => p.completed),
      prescriptions: treatment.prescriptions,
      totalProcedureCost: this.calculateTreatmentCost(treatment.procedures),
      totalPrescriptionCost: this.calculatePrescriptionCost(treatment.prescriptions),
      notes: treatment.notes
    };
  }

  getTreatmentCategoryColor(category: string): string {
    const colors = {
      'CONSULTATION': '#2196f3',
      'CLEANING': '#4caf50',
      'FILLING': '#ff9800',
      'EXTRACTION': '#f44336',
      'ROOT_CANAL': '#9c27b0',
      'CROWN': '#795548',
      'IMPLANT': '#607d8b',
      'ORTHODONTICS': '#e91e63',
      'OTHER': '#9e9e9e'
    };
    return colors[category as keyof typeof colors] || '#9e9e9e';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }
}