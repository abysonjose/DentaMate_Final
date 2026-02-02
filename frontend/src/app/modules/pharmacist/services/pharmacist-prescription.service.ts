import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface PendingPrescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  prescribedDate: Date;
  status: 'pending' | 'partially_dispensed' | 'ready_for_pickup' | 'dispensed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'emergency';
  medications: PrescriptionMedication[];
  totalItems: number;
  estimatedCost: number;
  notes?: string;
  pharmacyInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
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
  quantityDispensed: number;
  quantityRemaining: number;
  instructions: string;
  substitutionAllowed: boolean;
  unitPrice: number;
  totalPrice: number;
  stockAvailable: number;
  status: 'pending' | 'dispensed' | 'out_of_stock' | 'substituted';
  batchNumber?: string;
  expiryDate?: Date;
  dispensedAt?: Date;
  dispensedBy?: string;
}

export interface DispenseRequest {
  prescriptionId: string;
  medications: {
    medicationId: string;
    quantityToDispense: number;
    batchNumber?: string;
    substitutedWith?: string;
    notes?: string;
  }[];
  patientVerified: boolean;
  counselingProvided: boolean;
  notes?: string;
}

export interface DispenseResponse {
  id: string;
  prescriptionId: string;
  dispensedAt: Date;
  dispensedBy: string;
  medications: PrescriptionMedication[];
  totalCost: number;
  stockDeductions: StockDeduction[];
  receiptNumber: string;
}

export interface StockDeduction {
  medicationId: string;
  medicationName: string;
  quantityDeducted: number;
  batchNumber: string;
  newStockLevel: number;
  lowStockWarning: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacistPrescriptionService {
  private apiUrl = `${environment.apiUrl}/pharmacist/prescriptions`;

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

  // Pending Prescriptions
  getPendingPrescriptions(filters?: {
    status?: string;
    priority?: string;
    patientName?: string;
    doctorName?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<PendingPrescription[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<any>(`${this.apiUrl}/pending?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const prescriptions = response.data || response;
        return prescriptions.map((p: any) => this.mapToPendingPrescription(p));
      }),
      catchError(error => {
        console.error('Error fetching pending prescriptions:', error);
        throw error;
      })
    );
  }

  private mapToPendingPrescription(data: any): PendingPrescription {
    return {
      id: data.id,
      prescriptionNumber: data.prescriptionNumber || data.number,
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhone: data.patientPhone || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      prescribedDate: new Date(data.prescribedDate || data.createdAt),
      status: data.status?.toLowerCase().replace('_', '-') || 'pending',
      priority: data.priority?.toLowerCase() || 'normal',
      medications: (data.medications || []).map((m: any) => this.mapToPrescriptionMedication(m)),
      totalItems: data.totalItems || data.medications?.length || 0,
      estimatedCost: data.estimatedCost || 0,
      notes: data.notes,
      pharmacyInstructions: data.pharmacyInstructions,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt || data.createdAt)
    };
  }

  private mapToPrescriptionMedication(data: any): PrescriptionMedication {
    return {
      id: data.id,
      medicationId: data.medicationId,
      medicationName: data.medicationName || data.name,
      genericName: data.genericName,
      dosage: data.dosage,
      frequency: data.frequency,
      duration: data.duration,
      quantity: data.quantity,
      quantityDispensed: data.quantityDispensed || 0,
      quantityRemaining: data.quantity - (data.quantityDispensed || 0),
      instructions: data.instructions,
      substitutionAllowed: data.substitutionAllowed !== false,
      unitPrice: data.unitPrice || 0,
      totalPrice: data.totalPrice || (data.unitPrice * data.quantity) || 0,
      stockAvailable: data.stockAvailable || 0,
      status: data.status?.toLowerCase() || 'pending',
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      dispensedAt: data.dispensedAt ? new Date(data.dispensedAt) : undefined,
      dispensedBy: data.dispensedBy
    };
  }

  // Prescription Details
  getPrescriptionDetails(prescriptionId: string): Observable<PendingPrescription> {
    return this.http.get<any>(`${this.apiUrl}/${prescriptionId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToPendingPrescription(response.data || response))
    );
  }

  // Dispense Medicines
  dispenseMedicines(dispenseRequest: DispenseRequest): Observable<DispenseResponse> {
    return this.http.post<any>(`${this.apiUrl}/dispense`, dispenseRequest, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToDispenseResponse(response.data || response))
    );
  }

  private mapToDispenseResponse(data: any): DispenseResponse {
    return {
      id: data.id,
      prescriptionId: data.prescriptionId,
      dispensedAt: new Date(data.dispensedAt),
      dispensedBy: data.dispensedBy,
      medications: (data.medications || []).map((m: any) => this.mapToPrescriptionMedication(m)),
      totalCost: data.totalCost || 0,
      stockDeductions: (data.stockDeductions || []).map((s: any) => ({
        medicationId: s.medicationId,
        medicationName: s.medicationName,
        quantityDeducted: s.quantityDeducted,
        batchNumber: s.batchNumber,
        newStockLevel: s.newStockLevel,
        lowStockWarning: s.lowStockWarning || false
      })),
      receiptNumber: data.receiptNumber
    };
  }

  // Partial Dispense
  partiallyDispenseMedicines(prescriptionId: string, medications: {
    medicationId: string;
    quantityToDispense: number;
    reason: string;
  }[]): Observable<DispenseResponse> {
    return this.http.post<any>(`${this.apiUrl}/${prescriptionId}/partial-dispense`, {
      medications
    }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToDispenseResponse(response.data || response))
    );
  }

  // Check Stock Availability
  checkStockAvailability(medicationIds: string[]): Observable<{
    medicationId: string;
    medicationName: string;
    available: boolean;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    batches: {
      batchNumber: string;
      quantity: number;
      expiryDate: Date;
    }[];
  }[]> {
    return this.http.post<any>(`${this.apiUrl}/check-stock`, { medicationIds }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Search Prescriptions
  searchPrescriptions(query: string, filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<PendingPrescription[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<any>(`${this.apiUrl}/search?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const prescriptions = response.data || response;
        return prescriptions.map((p: any) => this.mapToPendingPrescription(p));
      })
    );
  }

  // Update Prescription Status
  updatePrescriptionStatus(prescriptionId: string, status: string, notes?: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${prescriptionId}/status`, {
      status,
      notes
    }, {
      headers: this.getHeaders()
    });
  }

  // Get Prescription History
  getPrescriptionHistory(patientId: string, limit?: number): Observable<PendingPrescription[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get<any>(`${this.apiUrl}/patient/${patientId}/history${params}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const prescriptions = response.data || response;
        return prescriptions.map((p: any) => this.mapToPendingPrescription(p));
      })
    );
  }

  // Verify Patient Identity
  verifyPatientIdentity(patientId: string, verificationData: {
    phone?: string;
    dateOfBirth?: string;
    idNumber?: string;
  }): Observable<{ verified: boolean; message: string }> {
    return this.http.post<{ verified: boolean; message: string }>(`${this.apiUrl}/verify-patient`, {
      patientId,
      ...verificationData
    }, {
      headers: this.getHeaders()
    });
  }

  // Generate Prescription Label
  generatePrescriptionLabel(prescriptionId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${prescriptionId}/label`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Get Dispensing Instructions
  getDispensingInstructions(medicationId: string): Observable<{
    medicationName: string;
    instructions: string[];
    warnings: string[];
    sideEffects: string[];
    interactions: string[];
    storageInstructions: string;
  }> {
    return this.http.get(`${this.apiUrl}/medications/${medicationId}/instructions`, {
      headers: this.getHeaders()
    });
  }
}