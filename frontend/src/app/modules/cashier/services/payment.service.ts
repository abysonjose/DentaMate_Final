import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'WALLET';
  paymentDetails?: {
    transactionId?: string;
    cardLast4?: string;
    upiId?: string;
    walletProvider?: string;
  };
  notes?: string;
}

export interface PaymentResponse {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMode: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId: string;
  receiptNumber: string;
  processedAt: Date;
  cashierId: string;
}

export interface PaymentHistory {
  id: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  paymentMode: string;
  status: string;
  processedAt: Date;
  receiptNumber: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'Content-Type': 'application/json'
    });
  }

  // Payment Processing
  processPayment(paymentRequest: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/process`, paymentRequest, { 
      headers: this.getHeaders() 
    });
  }

  verifyPayment(transactionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/verify/${transactionId}`, { headers: this.getHeaders() });
  }

  processPartialPayment(invoiceId: string, amount: number, paymentMode: string): Observable<PaymentResponse> {
    const paymentRequest: PaymentRequest = {
      invoiceId,
      amount,
      paymentMode: paymentMode as any
    };
    return this.http.post<PaymentResponse>(`${this.apiUrl}/partial`, paymentRequest, { 
      headers: this.getHeaders() 
    });
  }

  // Payment Status Updates
  updatePaymentStatus(paymentId: string, status: string, notes?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${paymentId}/status`, { status, notes }, { 
      headers: this.getHeaders() 
    });
  }

  markPaymentFailed(paymentId: string, reason: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${paymentId}/failed`, { reason }, { 
      headers: this.getHeaders() 
    });
  }

  // Payment History
  getPaymentHistory(filters?: any): Observable<PaymentHistory[]> {
    return this.http.get<PaymentHistory[]>(`${this.apiUrl}/history`, { 
      headers: this.getHeaders(),
      params: filters 
    });
  }

  getPaymentsByDate(date: string): Observable<PaymentHistory[]> {
    return this.http.get<PaymentHistory[]>(`${this.apiUrl}/history/date/${date}`, { 
      headers: this.getHeaders() 
    });
  }

  getPaymentsByPatient(patientId: string): Observable<PaymentHistory[]> {
    return this.http.get<PaymentHistory[]>(`${this.apiUrl}/history/patient/${patientId}`, { 
      headers: this.getHeaders() 
    });
  }

  // Payment Validation
  validatePaymentAmount(invoiceId: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-amount`, { invoiceId, amount }, { 
      headers: this.getHeaders() 
    });
  }

  checkDuplicatePayment(invoiceId: string, transactionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-duplicate`, { 
      headers: this.getHeaders(),
      params: { invoiceId, transactionId }
    });
  }

  // Payment Methods
  getAvailablePaymentMethods(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/methods`, { headers: this.getHeaders() });
  }

  // Refunds (if applicable)
  initiateRefund(paymentId: string, amount: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${paymentId}/refund`, { amount, reason }, { 
      headers: this.getHeaders() 
    });
  }

  // Payment Analytics
  getPaymentStats(period: 'TODAY' | 'WEEK' | 'MONTH'): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/${period}`, { headers: this.getHeaders() });
  }
}