import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface FinancialKPIs {
  totalRevenue: number;
  netCollections: number;
  outstandingReceivables: number;
  refundsIssued: number;
  todayRevenue: number;
  monthToDateRevenue: number;
  previousMonthRevenue: number;
  revenueGrowth: number;
  collectionEfficiency: number;
  averageReceivableDays: number;
}

export interface RevenueAnalytics {
  departmentWise: DepartmentRevenue[];
  doctorWise: DoctorRevenue[];
  treatmentWise: TreatmentRevenue[];
  paymentModeAnalytics: PaymentModeData[];
  trendData: RevenueTrend[];
}

export interface DepartmentRevenue {
  departmentId: string;
  departmentName: string;
  revenue: number;
  percentage: number;
  growth: number;
}

export interface DoctorRevenue {
  doctorId: string;
  doctorName: string;
  revenue: number;
  patientCount: number;
  averagePerPatient: number;
  growth: number;
}

export interface TreatmentRevenue {
  treatmentId: string;
  treatmentName: string;
  revenue: number;
  count: number;
  averagePrice: number;
}

export interface PaymentModeData {
  mode: 'CASH' | 'UPI' | 'CARD' | 'WALLET' | 'INSURANCE';
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface RevenueTrend {
  date: Date;
  revenue: number;
  collections: number;
  refunds: number;
}

export interface BillingOversightData {
  flaggedBills: FlaggedBill[];
  pendingApprovals: PendingApproval[];
  billingDiscrepancies: BillingDiscrepancy[];
  adjustmentRequests: AdjustmentRequest[];
}

export interface FlaggedBill {
  id: string;
  billNumber: string;
  patientName: string;
  amount: number;
  flagReason: string;
  flaggedBy: string;
  flaggedDate: Date;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PendingApproval {
  id: string;
  type: 'ADJUSTMENT' | 'REFUND' | 'WRITE_OFF' | 'DISCOUNT';
  amount: number;
  reason: string;
  requestedBy: string;
  requestDate: Date;
  patientName: string;
  billId: string;
  supportingDocs?: string[];
}

export interface BillingDiscrepancy {
  id: string;
  billId: string;
  discrepancyType: string;
  description: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  identifiedBy: string;
  identifiedDate: Date;
}

export interface AdjustmentRequest {
  id: string;
  billId: string;
  patientName: string;
  originalAmount: number;
  adjustedAmount: number;
  adjustmentType: 'DISCOUNT' | 'CORRECTION' | 'WRITE_OFF';
  reason: string;
  requestedBy: string;
  requestDate: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface RefundData {
  id: string;
  billId: string;
  patientName: string;
  originalAmount: number;
  refundAmount: number;
  reason: string;
  requestedBy: string;
  requestDate: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  supportingDocuments: string[];
  approvalNotes?: string;
}

export interface ReceivablesData {
  totalOutstanding: number;
  agingAnalysis: AgingBucket[];
  overdueAccounts: OverdueAccount[];
  collectionActions: CollectionAction[];
}

export interface AgingBucket {
  range: '0-7' | '8-30' | '31-60' | '60+';
  amount: number;
  count: number;
  percentage: number;
}

export interface OverdueAccount {
  patientId: string;
  patientName: string;
  totalDue: number;
  oldestInvoiceDate: Date;
  daysPastDue: number;
  contactInfo: string;
  lastContactDate?: Date;
}

export interface CollectionAction {
  id: string;
  patientId: string;
  actionType: 'REMINDER' | 'NOTICE' | 'ESCALATION';
  actionDate: Date;
  status: 'PENDING' | 'COMPLETED';
  assignedTo: string;
}

export interface AccountantActivity {
  accountantId: string;
  accountantName: string;
  tasksAssigned: number;
  tasksCompleted: number;
  pendingReconciliations: number;
  flaggedItems: number;
  lastActivity: Date;
  performance: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT';
}

export interface FinancialAlert {
  id: string;
  type: 'REVENUE_DROP' | 'HIGH_OUTSTANDING' | 'AUDIT_FLAG' | 'POLICY_VIOLATION';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  details: any;
  createdDate: Date;
  acknowledged: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AccountsManagerService {
  private apiUrl = `${environment.apiUrl}/accounts-manager`;
  
  // Real-time data streams
  private kpisSubject = new BehaviorSubject<FinancialKPIs | null>(null);
  private alertsSubject = new BehaviorSubject<FinancialAlert[]>([]);
  private pendingApprovalsSubject = new BehaviorSubject<PendingApproval[]>([]);
  
  public kpis$ = this.kpisSubject.asObservable();
  public alerts$ = this.alertsSubject.asObservable();
  public pendingApprovals$ = this.pendingApprovalsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeRealTimeData();
  }

  private initializeRealTimeData(): void {
    // Poll for KPIs every 30 seconds
    interval(30000).pipe(
      startWith(0),
      switchMap(() => this.getFinancialKPIs())
    ).subscribe(kpis => this.kpisSubject.next(kpis));

    // Poll for alerts every 60 seconds
    interval(60000).pipe(
      startWith(0),
      switchMap(() => this.getFinancialAlerts())
    ).subscribe(alerts => this.alertsSubject.next(alerts));

    // Poll for pending approvals every 15 seconds
    interval(15000).pipe(
      startWith(0),
      switchMap(() => this.getPendingApprovals())
    ).subscribe(approvals => this.pendingApprovalsSubject.next(approvals));
  }

  // Dashboard KPIs
  getFinancialKPIs(): Observable<FinancialKPIs> {
    return this.http.get<FinancialKPIs>(`${this.apiUrl}/kpis`);
  }

  getFinancialAlerts(): Observable<FinancialAlert[]> {
    return this.http.get<FinancialAlert[]>(`${this.apiUrl}/alerts`);
  }

  // Revenue Analytics
  getRevenueAnalytics(period?: string): Observable<RevenueAnalytics> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    return this.http.get<RevenueAnalytics>(`${this.apiUrl}/revenue/analytics`, { params });
  }

  // Billing Oversight
  getBillingOversightData(): Observable<BillingOversightData> {
    return this.http.get<BillingOversightData>(`${this.apiUrl}/billing/oversight`);
  }

  getPendingApprovals(): Observable<PendingApproval[]> {
    return this.http.get<PendingApproval[]>(`${this.apiUrl}/approvals/pending`);
  }

  // Approval Actions
  approveRequest(requestId: string, notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/approvals/${requestId}/approve`, { notes });
  }

  rejectRequest(requestId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/approvals/${requestId}/reject`, { reason });
  }

  // Refund Management
  getRefundRequests(status?: string): Observable<RefundData[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<RefundData[]>(`${this.apiUrl}/refunds`, { params });
  }

  approveRefund(refundId: string, notes: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/refunds/${refundId}/approve`, { notes });
  }

  rejectRefund(refundId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/refunds/${refundId}/reject`, { reason });
  }

  // Receivables Control
  getReceivablesData(): Observable<ReceivablesData> {
    return this.http.get<ReceivablesData>(`${this.apiUrl}/receivables`);
  }

  initiateCollectionAction(patientId: string, actionType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/receivables/collection-action`, {
      patientId,
      actionType
    });
  }

  // Accountant Supervision
  getAccountantActivities(): Observable<AccountantActivity[]> {
    return this.http.get<AccountantActivity[]>(`${this.apiUrl}/supervision/activities`);
  }

  assignTask(accountantId: string, taskData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/supervision/assign-task`, {
      accountantId,
      ...taskData
    });
  }

  // Financial Reports
  generateReport(reportType: string, parameters: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/generate`, {
      reportType,
      parameters
    });
  }

  exportReport(reportId: string, format: 'PDF' | 'CSV' | 'EXCEL'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/${reportId}/export`, {
      params: { format },
      responseType: 'blob'
    });
  }

  // Policy Configuration
  getPolicyConfiguration(): Observable<any> {
    return this.http.get(`${this.apiUrl}/policies`);
  }

  updatePolicyConfiguration(policies: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/policies`, policies);
  }

  // Audit & Compliance
  getAuditLogs(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/audit/logs`, { params });
  }

  acknowledgeAlert(alertId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/alerts/${alertId}/acknowledge`, {});
  }
}