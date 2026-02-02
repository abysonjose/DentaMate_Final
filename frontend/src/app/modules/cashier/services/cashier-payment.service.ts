import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface PaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque';
  paymentDetails?: {
    transactionId?: string;
    cardLast4?: string;
    upiId?: string;
    chequeNumber?: string;
    bankName?: string;
    reference?: string;
  };
  notes?: string;
}

export interface PaymentResponse {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  paymentDate: Date;
  processedBy: string;
  notes?: string;
  receipt: {
    receiptNumber: string;
    receiptUrl?: string;
  };
}

export interface PendingPayment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: Date;
  status: 'unpaid' | 'partial' | 'overdue';
  priority: 'normal' | 'urgent' | 'overdue';
  daysPastDue: number;
  services: {
    serviceName: string;
    amount: number;
  }[];
}

export interface PaymentHistory {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  status: string;
  processedBy: string;
  receiptNumber: string;
}

@Injectable({
  providedIn: 'root'
})
export class CashierPaymentService {
  private apiUrl = `${environment.apiUrl}/cashier/payments`;

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

  // Pending Payments
  getPendingPayments(filters?: {
    status?: string;
    priority?: string;
    patientName?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<PendingPayment[]> {
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
        const payments = response.data || response;
        return payments.map((p: any) => this.mapToPendingPayment(p));
      })
    );
  }

  private mapToPendingPayment(data: any): PendingPayment {
    const dueDate = new Date(data.dueDate);
    const today = new Date();
    const daysPastDue = Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    let priority: 'normal' | 'urgent' | 'overdue' = 'normal';
    if (daysPastDue > 0) {
      priority = 'overdue';
    } else if (daysPastDue > -7) {
      priority = 'urgent';
    }

    return {
      id: data.id,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhone: data.patientPhone || '',
      totalAmount: data.totalAmount || 0,
      paidAmount: data.paidAmount || 0,
      balanceAmount: data.balanceAmount || data.totalAmount || 0,
      dueDate: dueDate,
      status: data.status?.toLowerCase() || 'unpaid',
      priority: priority,
      daysPastDue: daysPastDue,
      services: data.services || []
    };
  }

  // Process Payment
  processPayment(paymentRequest: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<any>(`${this.apiUrl}/process`, paymentRequest, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToPaymentResponse(response.data || response))
    );
  }

  private mapToPaymentResponse(data: any): PaymentResponse {
    return {
      id: data.id,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus?.toLowerCase() || 'completed',
      transactionId: data.transactionId,
      paymentDate: new Date(data.paymentDate || data.createdAt),
      processedBy: data.processedBy,
      notes: data.notes,
      receipt: {
        receiptNumber: data.receiptNumber || data.receipt?.receiptNumber,
        receiptUrl: data.receiptUrl || data.receipt?.receiptUrl
      }
    };
  }

  // Payment Verification (for simulated payments)
  verifyPayment(paymentId: string, verificationData?: {
    transactionId?: string;
    otp?: string;
    pin?: string;
  }): Observable<{
    verified: boolean;
    status: string;
    message: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/${paymentId}/verify`, verificationData || {}, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Payment History
  getPaymentHistory(filters?: {
    patientName?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Observable<PaymentHistory[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<any>(`${this.apiUrl}/history?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const payments = response.data || response;
        return payments.map((p: any) => this.mapToPaymentHistory(p));
      })
    );
  }

  private mapToPaymentHistory(data: any): PaymentHistory {
    return {
      id: data.id,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      patientName: data.patientName,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentDate: new Date(data.paymentDate || data.createdAt),
      status: data.status?.toLowerCase() || 'completed',
      processedBy: data.processedBy,
      receiptNumber: data.receiptNumber
    };
  }

  // Search Payments
  searchPayments(query: string, filters?: {
    paymentMethod?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<PendingPayment[]> {
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
        const payments = response.data || response;
        return payments.map((p: any) => this.mapToPendingPayment(p));
      })
    );
  }

  // Payment Methods Configuration
  getPaymentMethods(): Observable<{
    method: string;
    name: string;
    enabled: boolean;
    icon: string;
    description: string;
    processingFee?: number;
  }[]> {
    return this.http.get<any>(`${this.apiUrl}/methods`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Generate Receipt
  generateReceipt(paymentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${paymentId}/receipt`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Send Receipt
  sendReceipt(paymentId: string, method: 'email' | 'sms' | 'whatsapp'): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${paymentId}/send-receipt`, {
      method
    }, {
      headers: this.getHeaders()
    });
  }

  // Refund Payment
  refundPayment(paymentId: string, refundData: {
    amount: number;
    reason: string;
    notes?: string;
  }): Observable<{
    refundId: string;
    status: string;
    refundAmount: number;
    processedAt: Date;
  }> {
    return this.http.post<any>(`${this.apiUrl}/${paymentId}/refund`, refundData, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Payment Statistics
  getPaymentStats(dateFrom?: string, dateTo?: string): Observable<{
    totalPayments: number;
    totalAmount: number;
    paymentMethodBreakdown: { method: string; count: number; amount: number }[];
    dailyCollections: { date: string; amount: number; count: number }[];
    averagePaymentAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  }> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get(`${this.apiUrl}/stats?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }

  // Simulate Payment (for demo purposes)
  simulatePayment(paymentMethod: string, amount: number): Observable<{
    success: boolean;
    transactionId?: string;
    message: string;
    processingTime: number;
  }> {
    return this.http.post<any>(`${this.apiUrl}/simulate`, {
      paymentMethod,
      amount
    }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }
}