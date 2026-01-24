import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { BillingDoctorIntegrationService } from '../../../shared/services/billing-doctor-integration.service';
import { BillingPatientIntegrationService } from '../../../shared/services/billing-patient-integration.service';

export interface AppointmentDetails {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  appointmentDate: Date;
  treatmentType: string;
  status: string;
  consultationFee: number;
}

export interface BillableItem {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
  category: 'CONSULTATION' | 'PROCEDURE' | 'DIAGNOSTIC' | 'MEDICINE' | 'OTHER';
  taxable: boolean;
}

export interface BillGenerationRequest {
  appointmentId: string;
  patientId: string;
  billableItems: BillableItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  dueDate: Date;
}

export interface GeneratedBill {
  billId: string;
  billNumber: string;
  patientId: string;
  patientName: string;
  appointmentId: string;
  billableItems: BillableItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'GENERATED' | 'PAID' | 'CANCELLED';
  createdDate: Date;
  dueDate: Date;
  billingStaffId: string;
  notes?: string;
}

export interface TaxConfiguration {
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  taxExemptCategories: string[];
}

@Injectable({
  providedIn: 'root'
})
export class BillGenerationService {
  private apiUrl = `${environment.apiUrl}/billing`;

  constructor(
    private http: HttpClient,
    private doctorIntegration: BillingDoctorIntegrationService,
    private patientIntegration: BillingPatientIntegrationService
  ) {}

  // Appointment and Patient Data
  getCompletedAppointments(): Observable<AppointmentDetails[]> {
    return this.doctorIntegration.getCompletedTreatments().pipe(
      tap(treatments => {
        // Map doctor treatments to appointment details format
        return treatments.map(treatment => ({
          appointmentId: treatment.appointmentId,
          patientId: treatment.patientId,
          patientName: treatment.patientName,
          doctorName: treatment.doctorName,
          appointmentDate: treatment.treatmentDate,
          treatmentType: treatment.treatmentType,
          status: treatment.status,
          consultationFee: treatment.consultationFee
        }));
      })
    );
  }

  getAppointmentDetails(appointmentId: string): Observable<AppointmentDetails> {
    return this.doctorIntegration.getTreatmentSummary(appointmentId).pipe(
      tap(treatment => ({
        appointmentId: treatment.appointmentId,
        patientId: treatment.patientId,
        patientName: treatment.patientName,
        doctorName: treatment.doctorName,
        appointmentDate: treatment.treatmentDate,
        treatmentType: treatment.treatmentType,
        status: treatment.status,
        consultationFee: treatment.consultationFee
      }))
    );
  }

  getPatientDetails(patientId: string): Observable<any> {
    return this.patientIntegration.getPatientBillingProfile(patientId);
  }

  // Billable Items Management
  getStandardBillableItems(): Observable<BillableItem[]> {
    return this.http.get<BillableItem[]>(`${this.apiUrl}/billable-items/standard`);
  }

  getAppointmentBillableItems(appointmentId: string): Observable<BillableItem[]> {
    return this.doctorIntegration.getTreatmentSummary(appointmentId).pipe(
      switchMap(treatment => 
        this.doctorIntegration.mapTreatmentToBillableItems(treatment)
      )
    );
  }

  searchBillableItems(searchTerm: string): Observable<BillableItem[]> {
    const params = new HttpParams().set('search', searchTerm);
    return this.http.get<BillableItem[]>(`${this.apiUrl}/billable-items/search`, { params });
  }

  // Tax Calculations
  getTaxConfiguration(): Observable<TaxConfiguration> {
    return this.http.get<TaxConfiguration>(`${this.apiUrl}/tax/configuration`);
  }

  calculateTax(items: BillableItem[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/tax/calculate`, { items });
  }

  // Bill Generation
  generateBill(billRequest: BillGenerationRequest): Observable<GeneratedBill> {
    return this.http.post<GeneratedBill>(`${this.apiUrl}/bills/generate`, billRequest).pipe(
      tap(bill => {
        // Notify doctor about billing completion
        this.doctorIntegration.markTreatmentBilled(billRequest.appointmentId, bill.billId).subscribe();
        
        // Notify patient about new bill
        this.patientIntegration.sendBillNotificationToPatient(
          billRequest.patientId, 
          bill.billId, 
          'BILL_GENERATED'
        ).subscribe();
      })
    );
  }

  saveBillDraft(billRequest: BillGenerationRequest): Observable<GeneratedBill> {
    return this.http.post<GeneratedBill>(`${this.apiUrl}/bills/draft`, billRequest);
  }

  updateBillDraft(billId: string, billRequest: BillGenerationRequest): Observable<GeneratedBill> {
    return this.http.put<GeneratedBill>(`${this.apiUrl}/bills/draft/${billId}`, billRequest);
  }

  // Bill Validation
  validateBill(billRequest: BillGenerationRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/bills/validate`, billRequest);
  }

  checkDuplicateBill(appointmentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/bills/check-duplicate/${appointmentId}`);
  }

  // Bill Templates and Presets
  getBillTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/templates`);
  }

  applyBillTemplate(templateId: string, appointmentId: string): Observable<BillableItem[]> {
    return this.http.post<BillableItem[]>(`${this.apiUrl}/templates/${templateId}/apply`, { appointmentId });
  }

  // Utility Methods
  calculateSubtotal(items: BillableItem[]): number {
    return items.reduce((sum, item) => sum + item.total, 0);
  }

  calculateItemTotal(item: BillableItem): number {
    return item.unitPrice * item.quantity;
  }

  formatBillNumber(billId: string): string {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `BILL${year}${month}${billId.substr(-4).toUpperCase()}`;
  }

  validateBillableItem(item: BillableItem): string[] {
    const errors: string[] = [];

    if (!item.name || item.name.trim().length === 0) {
      errors.push('Item name is required');
    }

    if (item.unitPrice <= 0) {
      errors.push('Unit price must be greater than 0');
    }

    if (item.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (!item.category) {
      errors.push('Item category is required');
    }

    return errors;
  }

  validateBillRequest(request: BillGenerationRequest): string[] {
    const errors: string[] = [];

    if (!request.appointmentId) {
      errors.push('Appointment ID is required');
    }

    if (!request.patientId) {
      errors.push('Patient ID is required');
    }

    if (!request.billableItems || request.billableItems.length === 0) {
      errors.push('At least one billable item is required');
    }

    if (request.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    if (!request.dueDate) {
      errors.push('Due date is required');
    }

    // Validate each billable item
    request.billableItems?.forEach((item, index) => {
      const itemErrors = this.validateBillableItem(item);
      itemErrors.forEach(error => {
        errors.push(`Item ${index + 1}: ${error}`);
      });
    });

    return errors;
  }

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  // Get category display name
  getCategoryDisplayName(category: string): string {
    const categoryNames = {
      'CONSULTATION': 'Consultation',
      'PROCEDURE': 'Procedure',
      'DIAGNOSTIC': 'Diagnostic',
      'MEDICINE': 'Medicine',
      'OTHER': 'Other'
    };
    return categoryNames[category as keyof typeof categoryNames] || category;
  }

  // Get category color
  getCategoryColor(category: string): string {
    const categoryColors = {
      'CONSULTATION': '#2196f3',
      'PROCEDURE': '#4caf50',
      'DIAGNOSTIC': '#ff9800',
      'MEDICINE': '#9c27b0',
      'OTHER': '#607d8b'
    };
    return categoryColors[category as keyof typeof categoryColors] || '#607d8b';
  }
}