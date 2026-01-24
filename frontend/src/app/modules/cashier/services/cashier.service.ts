import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
  items: InvoiceItem[];
  createdAt: Date;
  dueDate: Date;
  branchId: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: 'CONSULTATION' | 'PROCEDURE' | 'MEDICINE' | 'LAB_TEST' | 'OTHER';
}

export interface PaymentSummary {
  totalCollected: number;
  cashCollected: number;
  digitalCollected: number;
  pendingPayments: number;
  transactionCount: number;
  failedTransactions: number;
}

export interface CashierAlert {
  id: string;
  type: 'PENDING_PAYMENT' | 'FAILED_TRANSACTION' | 'OVERDUE_INVOICE' | 'SYSTEM_ERROR';
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  invoiceId?: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CashierService {
  private apiUrl = `${environment.apiUrl}/cashier`;
  private currentShiftSubject = new BehaviorSubject<any>(null);
  public currentShift$ = this.currentShiftSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCurrentShift();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'Content-Type': 'application/json'
    });
  }

  // Dashboard Data
  getDashboardData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`, { headers: this.getHeaders() });
  }

  getPaymentSummary(): Observable<PaymentSummary> {
    return this.http.get<PaymentSummary>(`${this.apiUrl}/payment-summary`, { headers: this.getHeaders() });
  }

  getAlerts(): Observable<CashierAlert[]> {
    return this.http.get<CashierAlert[]>(`${this.apiUrl}/alerts`, { headers: this.getHeaders() });
  }

  // Invoice Management
  searchInvoices(searchTerm: string, searchType: 'PATIENT_ID' | 'INVOICE_NUMBER' | 'APPOINTMENT_ID'): Observable<Invoice[]> {
    const params = { searchTerm, searchType };
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices/search`, { 
      headers: this.getHeaders(),
      params 
    });
  }

  getInvoiceById(invoiceId: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/invoices/${invoiceId}`, { headers: this.getHeaders() });
  }

  getPendingInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices/pending`, { headers: this.getHeaders() });
  }

  // Shift Management
  loadCurrentShift(): void {
    this.http.get(`${this.apiUrl}/shift/current`, { headers: this.getHeaders() })
      .subscribe(shift => this.currentShiftSubject.next(shift));
  }

  startShift(openingBalance: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/shift/start`, { openingBalance }, { headers: this.getHeaders() });
  }

  getCurrentShift(): Observable<any> {
    return this.http.get(`${this.apiUrl}/shift/current`, { headers: this.getHeaders() });
  }

  // Quick Actions
  getQuickStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/quick-stats`, { headers: this.getHeaders() });
  }

  markInvoiceAsPaid(invoiceId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/invoices/${invoiceId}/mark-paid`, {}, { headers: this.getHeaders() });
  }

  // Audit and Logs
  logActivity(activity: string, details: any): Observable<any> {
    const logData = {
      activity,
      details,
      timestamp: new Date(),
      cashierId: localStorage.getItem('userId')
    };
    return this.http.post(`${this.apiUrl}/audit-log`, logData, { headers: this.getHeaders() });
  }

  // Error Handling
  reportPaymentDispute(disputeData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/disputes`, disputeData, { headers: this.getHeaders() });
  }

  requestCorrection(correctionData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/corrections`, correctionData, { headers: this.getHeaders() });
  }
}