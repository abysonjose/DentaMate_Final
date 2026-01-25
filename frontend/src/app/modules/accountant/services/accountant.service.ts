import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FinancialOverview {
  totalBilled: number;
  paymentsReceived: number;
  outstandingDues: number;
  pendingReconciliations: number;
  flaggedTransactions: number;
  dailyRevenue: number;
  monthlyRevenue: number;
}

export interface BillingRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  billDate: Date;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  services: string[];
  discrepancyFlag?: string;
}

export interface PaymentRecord {
  id: string;
  billId: string;
  patientName: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'WALLET';
  paymentDate: Date;
  reconciliationStatus: 'MATCHED' | 'PENDING' | 'FLAGGED';
  transactionId?: string;
  notes?: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  date: Date;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  departmentCode: string;
  costCenter: string;
  tags: string[];
}

export interface ReceivableRecord {
  id: string;
  patientId: string;
  patientName: string;
  billId: string;
  amount: number;
  dueDate: Date;
  agingDays: number;
  agingCategory: '0-7' | '8-30' | '30+';
  contactInfo: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  details: any;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountantService {
  private apiUrl = `${environment.apiUrl}/accountant`;
  private financialOverviewSubject = new BehaviorSubject<FinancialOverview | null>(null);

  constructor(private http: HttpClient) {}

  // Financial Overview
  getFinancialOverview(): Observable<FinancialOverview> {
    return this.http.get<FinancialOverview>(`${this.apiUrl}/overview`);
  }

  // Billing Records
  getBillingRecords(filters?: any): Observable<BillingRecord[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<BillingRecord[]>(`${this.apiUrl}/billing-records`, { params });
  }

  flagBillingDiscrepancy(billId: string, flag: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/billing-records/${billId}/flag`, { flag });
  }

  // Payment Verification
  getPaymentRecords(filters?: any): Observable<PaymentRecord[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<PaymentRecord[]>(`${this.apiUrl}/payment-records`, { params });
  }

  updateReconciliationStatus(paymentId: string, status: string, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/payment-records/${paymentId}/reconciliation`, {
      status,
      notes
    });
  }

  // Ledger Management
  getLedgerEntries(filters?: any): Observable<LedgerEntry[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<LedgerEntry[]>(`${this.apiUrl}/ledger`, { params });
  }

  updateLedgerTags(entryId: string, tags: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/ledger/${entryId}/tags`, { tags });
  }

  // Receivables Tracking
  getReceivables(filters?: any): Observable<ReceivableRecord[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<ReceivableRecord[]>(`${this.apiUrl}/receivables`, { params });
  }

  // Reports
  generateDailyRevenueReport(date: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/daily-revenue`, {
      params: { date: date.toISOString().split('T')[0] }
    });
  }

  generateMonthlyIncomeReport(month: number, year: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/monthly-income`, {
      params: { month: month.toString(), year: year.toString() }
    });
  }

  generatePaymentModeReport(startDate: Date, endDate: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/payment-mode`, {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });
  }

  exportReport(reportType: string, format: 'PDF' | 'CSV', params: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/reports/export`, {
      reportType,
      format,
      params
    }, { responseType: 'blob' });
  }

  // Audit Support
  getAuditLogs(filters?: any): Observable<AuditLog[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<AuditLog[]>(`${this.apiUrl}/audit-logs`, { params });
  }

  addAuditNote(logId: string, note: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/audit-logs/${logId}/note`, { note });
  }

  // Tax Preparation
  getTaxData(year: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tax-data`, {
      params: { year: year.toString() }
    });
  }

  exportTaxData(year: number, format: 'PDF' | 'CSV'): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/tax-data/export`, {
      year,
      format
    }, { responseType: 'blob' });
  }
}