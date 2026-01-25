import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CashierPaymentData {
  id: string;
  billId: string;
  patientName: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'WALLET';
  paymentDate: Date;
  cashierId: string;
  cashierName: string;
  transactionId?: string;
  receiptNumber: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface ReconciliationRequest {
  paymentId: string;
  billId: string;
  expectedAmount: number;
  actualAmount: number;
  discrepancy?: string;
  accountantNotes?: string;
}

export interface CashHandoverData {
  cashierId: string;
  shiftDate: Date;
  totalCash: number;
  totalTransactions: number;
  handoverStatus: 'PENDING' | 'VERIFIED' | 'DISCREPANCY';
  accountantVerification?: {
    verifiedBy: string;
    verificationDate: Date;
    notes: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AccountantCashierIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/accountant-cashier`;
  
  // Real-time data streams
  private pendingReconciliationsSubject = new BehaviorSubject<CashierPaymentData[]>([]);
  private cashHandoversSubject = new BehaviorSubject<CashHandoverData[]>([]);
  
  public pendingReconciliations$ = this.pendingReconciliationsSubject.asObservable();
  public cashHandovers$ = this.cashHandoversSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get payments from cashier that need reconciliation
  getPendingCashierPayments(): Observable<CashierPaymentData[]> {
    return this.http.get<CashierPaymentData[]>(`${this.apiUrl}/pending-payments`);
  }

  // Reconcile cashier payment with billing record
  reconcileCashierPayment(request: ReconciliationRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/reconcile-payment`, request);
  }

  // Get cash handover data from cashiers
  getCashHandovers(date?: Date): Observable<CashHandoverData[]> {
    const params = date ? { date: date.toISOString().split('T')[0] } : {};
    return this.http.get<CashHandoverData[]>(`${this.apiUrl}/cash-handovers`, { params });
  }

  // Verify cash handover from cashier
  verifyCashHandover(handoverId: string, verification: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-handover/${handoverId}`, verification);
  }

  // Flag discrepancy in cashier transaction
  flagCashierDiscrepancy(paymentId: string, discrepancy: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/flag-discrepancy/${paymentId}`, { discrepancy });
  }

  // Get cashier performance metrics for accounting review
  getCashierMetrics(cashierId: string, startDate: Date, endDate: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/cashier-metrics/${cashierId}`, {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });
  }

  // Request payment details from cashier system
  requestPaymentDetails(paymentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/payment-details/${paymentId}`);
  }

  // Send reconciliation feedback to cashier
  sendReconciliationFeedback(cashierId: string, feedback: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reconciliation-feedback/${cashierId}`, feedback);
  }

  // Get daily cash summary from all cashiers
  getDailyCashSummary(date: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/daily-cash-summary`, {
      params: { date: date.toISOString().split('T')[0] }
    });
  }

  // Update real-time data
  updatePendingReconciliations(data: CashierPaymentData[]): void {
    this.pendingReconciliationsSubject.next(data);
  }

  updateCashHandovers(data: CashHandoverData[]): void {
    this.cashHandoversSubject.next(data);
  }
}