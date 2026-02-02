import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface CompletedTreatment {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  treatmentDate: Date;
  services: TreatmentService[];
  totalAmount: number;
  status: 'completed' | 'billed' | 'paid';
  notes?: string;
  completedAt: Date;
}

export interface TreatmentService {
  id: string;
  serviceCode: string;
  serviceName: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  finalPrice: number;
  taxable: boolean;
  taxRate: number;
  taxAmount: number;
  performedBy: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  doctorId: string;
  doctorName: string;
  appointmentId: string;
  treatmentId: string;
  invoiceDate: Date;
  dueDate: Date;
  services: InvoiceService[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: 'draft' | 'generated' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: string;
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  generatedBy: string;
  generatedAt: Date;
  paidAt?: Date;
}

export interface InvoiceService {
  id: string;
  serviceCode: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export interface BillGenerationRequest {
  treatmentId: string;
  patientId: string;
  services: {
    serviceId: string;
    quantity: number;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
  }[];
  notes?: string;
  dueDate?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CashierBillingService {
  private apiUrl = `${environment.apiUrl}/cashier/billing`;

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

  // Completed Treatments
  getCompletedTreatments(filters?: {
    status?: string;
    patientName?: string;
    doctorName?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<CompletedTreatment[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<any>(`${this.apiUrl}/completed-treatments?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const treatments = response.data || response;
        return treatments.map((t: any) => this.mapToCompletedTreatment(t));
      }),
      catchError(error => {
        console.error('Error fetching completed treatments:', error);
        throw error;
      })
    );
  }

  private mapToCompletedTreatment(data: any): CompletedTreatment {
    return {
      id: data.id,
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhone: data.patientPhone || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      treatmentDate: new Date(data.treatmentDate || data.completedAt),
      services: (data.services || []).map((s: any) => this.mapToTreatmentService(s)),
      totalAmount: data.totalAmount || 0,
      status: data.status?.toLowerCase() || 'completed',
      notes: data.notes,
      completedAt: new Date(data.completedAt || data.treatmentDate)
    };
  }

  private mapToTreatmentService(data: any): TreatmentService {
    return {
      id: data.id,
      serviceCode: data.serviceCode || data.code,
      serviceName: data.serviceName || data.name,
      description: data.description || '',
      category: data.category || 'General',
      quantity: data.quantity || 1,
      unitPrice: data.unitPrice || data.price || 0,
      totalPrice: data.totalPrice || (data.quantity * data.unitPrice) || 0,
      discount: data.discount || 0,
      finalPrice: data.finalPrice || data.totalPrice || 0,
      taxable: data.taxable !== false,
      taxRate: data.taxRate || 0,
      taxAmount: data.taxAmount || 0,
      performedBy: data.performedBy || data.doctorName || ''
    };
  }

  // Treatment Details
  getTreatmentDetails(treatmentId: string): Observable<CompletedTreatment> {
    return this.http.get<any>(`${this.apiUrl}/treatments/${treatmentId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToCompletedTreatment(response.data || response))
    );
  }

  // Bill Generation
  generateBill(request: BillGenerationRequest): Observable<Invoice> {
    return this.http.post<any>(`${this.apiUrl}/generate-bill`, request, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToInvoice(response.data || response))
    );
  }

  private mapToInvoice(data: any): Invoice {
    return {
      id: data.id,
      invoiceNumber: data.invoiceNumber || data.number,
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhone: data.patientPhone || '',
      patientEmail: data.patientEmail,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      appointmentId: data.appointmentId,
      treatmentId: data.treatmentId,
      invoiceDate: new Date(data.invoiceDate || data.createdAt),
      dueDate: new Date(data.dueDate),
      services: (data.services || []).map((s: any) => this.mapToInvoiceService(s)),
      subtotal: data.subtotal || 0,
      discountAmount: data.discountAmount || 0,
      taxAmount: data.taxAmount || 0,
      totalAmount: data.totalAmount || 0,
      status: data.status?.toLowerCase() || 'draft',
      paymentStatus: data.paymentStatus?.toLowerCase() || 'unpaid',
      paymentMethod: data.paymentMethod,
      paidAmount: data.paidAmount || 0,
      balanceAmount: data.balanceAmount || data.totalAmount || 0,
      notes: data.notes,
      generatedBy: data.generatedBy,
      generatedAt: new Date(data.generatedAt || data.createdAt),
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined
    };
  }

  private mapToInvoiceService(data: any): InvoiceService {
    return {
      id: data.id,
      serviceCode: data.serviceCode || data.code,
      serviceName: data.serviceName || data.name,
      description: data.description || '',
      quantity: data.quantity || 1,
      unitPrice: data.unitPrice || data.price || 0,
      discount: data.discount || 0,
      discountType: data.discountType || 'fixed',
      taxRate: data.taxRate || 0,
      taxAmount: data.taxAmount || 0,
      totalAmount: data.totalAmount || 0
    };
  }

  // Invoice Management
  getInvoice(invoiceId: string): Observable<Invoice> {
    return this.http.get<any>(`${this.apiUrl}/invoices/${invoiceId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToInvoice(response.data || response))
    );
  }

  updateInvoice(invoiceId: string, updates: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<any>(`${this.apiUrl}/invoices/${invoiceId}`, updates, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToInvoice(response.data || response))
    );
  }

  // Search Treatments
  searchTreatments(query: string, filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<CompletedTreatment[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<any>(`${this.apiUrl}/treatments/search?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const treatments = response.data || response;
        return treatments.map((t: any) => this.mapToCompletedTreatment(t));
      })
    );
  }

  // Service Pricing
  getServicePricing(): Observable<{
    serviceId: string;
    serviceCode: string;
    serviceName: string;
    category: string;
    unitPrice: number;
    taxRate: number;
    description: string;
  }[]> {
    return this.http.get<any>(`${this.apiUrl}/service-pricing`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Invoice Preview
  previewInvoice(request: BillGenerationRequest): Observable<{
    services: InvoiceService[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
  }> {
    return this.http.post<any>(`${this.apiUrl}/preview-invoice`, request, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Generate Invoice PDF
  generateInvoicePDF(invoiceId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/invoices/${invoiceId}/pdf`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Send Invoice
  sendInvoice(invoiceId: string, method: 'email' | 'sms' | 'whatsapp'): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/invoices/${invoiceId}/send`, {
      method
    }, {
      headers: this.getHeaders()
    });
  }
}