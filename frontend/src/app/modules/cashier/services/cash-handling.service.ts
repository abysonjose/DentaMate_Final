import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CashShift {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: Date;
  endTime?: Date;
  openingBalance: number;
  closingBalance?: number;
  totalCashReceived: number;
  totalCashPaid: number;
  expectedBalance: number;
  actualBalance?: number;
  variance?: number;
  status: 'ACTIVE' | 'CLOSED' | 'PENDING_APPROVAL';
  transactions: CashTransaction[];
  notes?: string;
}

export interface CashTransaction {
  id: string;
  type: 'PAYMENT_RECEIVED' | 'CHANGE_GIVEN' | 'OPENING_BALANCE' | 'CLOSING_BALANCE';
  amount: number;
  description: string;
  timestamp: Date;
  invoiceId?: string;
  receiptNumber?: string;
}

export interface CashSummary {
  currentBalance: number;
  todayReceived: number;
  todayPaid: number;
  transactionCount: number;
  lastTransaction?: Date;
}

export interface ShiftClosure {
  totalCash: number;
  totalDigital: number;
  totalTransactions: number;
  openingBalance: number;
  expectedClosing: number;
  actualClosing: number;
  variance: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CashHandlingService {
  private apiUrl = `${environment.apiUrl}/cash-handling`;
  private currentShiftSubject = new BehaviorSubject<CashShift | null>(null);
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

  // Shift Management
  startShift(openingBalance: number, notes?: string): Observable<CashShift> {
    const shiftData = { openingBalance, notes };
    return this.http.post<CashShift>(`${this.apiUrl}/shift/start`, shiftData, { 
      headers: this.getHeaders() 
    });
  }

  getCurrentShift(): Observable<CashShift> {
    return this.http.get<CashShift>(`${this.apiUrl}/shift/current`, { headers: this.getHeaders() });
  }

  loadCurrentShift(): void {
    this.getCurrentShift().subscribe(
      shift => this.currentShiftSubject.next(shift),
      error => this.currentShiftSubject.next(null)
    );
  }

  endShift(closureData: ShiftClosure): Observable<CashShift> {
    return this.http.post<CashShift>(`${this.apiUrl}/shift/end`, closureData, { 
      headers: this.getHeaders() 
    });
  }

  // Cash Transactions
  recordCashTransaction(transaction: Partial<CashTransaction>): Observable<CashTransaction> {
    return this.http.post<CashTransaction>(`${this.apiUrl}/transactions`, transaction, { 
      headers: this.getHeaders() 
    });
  }

  getCashTransactions(shiftId?: string): Observable<CashTransaction[]> {
    const params = shiftId ? { shiftId } : {};
    return this.http.get<CashTransaction[]>(`${this.apiUrl}/transactions`, { 
      headers: this.getHeaders(),
      params 
    });
  }

  // Cash Summary
  getCashSummary(): Observable<CashSummary> {
    return this.http.get<CashSummary>(`${this.apiUrl}/summary`, { headers: this.getHeaders() });
  }

  getCurrentBalance(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/balance/current`, { headers: this.getHeaders() });
  }

  // Shift History
  getShiftHistory(filters?: any): Observable<CashShift[]> {
    return this.http.get<CashShift[]>(`${this.apiUrl}/shifts/history`, { 
      headers: this.getHeaders(),
      params: filters 
    });
  }

  getShiftById(shiftId: string): Observable<CashShift> {
    return this.http.get<CashShift>(`${this.apiUrl}/shifts/${shiftId}`, { headers: this.getHeaders() });
  }

  // Cash Reconciliation
  reconcileCash(actualAmount: number, notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reconcile`, { actualAmount, notes }, { 
      headers: this.getHeaders() 
    });
  }

  reportCashDiscrepancy(discrepancyData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/discrepancy`, discrepancyData, { 
      headers: this.getHeaders() 
    });
  }

  // Shift Validation
  validateShiftClosure(closureData: ShiftClosure): Observable<any> {
    return this.http.post(`${this.apiUrl}/shift/validate-closure`, closureData, { 
      headers: this.getHeaders() 
    });
  }

  // Cash Denominations
  recordDenominations(denominations: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/denominations`, denominations, { 
      headers: this.getHeaders() 
    });
  }

  // Reports
  generateShiftReport(shiftId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/shifts/${shiftId}/report`, { 
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  getCashFlowReport(startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/cash-flow`, { 
      headers: this.getHeaders(),
      params: { startDate, endDate }
    });
  }

  // Utility Methods
  calculateExpectedBalance(shift: CashShift): number {
    return shift.openingBalance + shift.totalCashReceived - shift.totalCashPaid;
  }

  calculateVariance(expected: number, actual: number): number {
    return actual - expected;
  }

  isShiftActive(): boolean {
    const currentShift = this.currentShiftSubject.value;
    return currentShift?.status === 'ACTIVE';
  }

  // Audit Trail
  logCashActivity(activity: string, amount: number, details?: any): Observable<any> {
    const logData = {
      activity,
      amount,
      details,
      timestamp: new Date(),
      cashierId: localStorage.getItem('userId')
    };
    return this.http.post(`${this.apiUrl}/audit-log`, logData, { headers: this.getHeaders() });
  }
}