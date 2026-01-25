import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BillingDoctorIntegrationService } from '../../../shared/services/billing-doctor-integration.service';
import { BillingPatientIntegrationService } from '../../../shared/services/billing-patient-integration.service';
import { OrthotistBillingIntegrationService } from '../../../shared/services/orthotist-billing-integration.service';

export interface BillingSummary {
  todayBillsGenerated: number;
  todayPaymentsReceived: number;
  todayPendingPayments: number;
  totalRevenue: number;
  unpaidBillsCount: number;
  failedPaymentsCount: number;
}

export interface BillItem {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId: string;
  billNumber: string;
  totalAmount: number;
  status: 'DRAFT' | 'GENERATED' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  createdDate: Date;
  dueDate: Date;
  paymentMode?: string;
  billingStaffId: string;
}

export interface PaymentAlert {
  id: string;
  type: 'UNPAID_BILL' | 'FAILED_PAYMENT' | 'OVERDUE_PAYMENT';
  message: string;
  patientName: string;
  amount: number;
  dueDate: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable({
  providedIn: 'root'
})
export class BillingStaffService {
  private apiUrl = `${environment.apiUrl}/billing`;
  private billingSummarySubject = new BehaviorSubject<BillingSummary | null>(null);
  private alertsSubject = new BehaviorSubject<PaymentAlert[]>([]);

  billingSummary$ = this.billingSummarySubject.asObservable();
  alerts$ = this.alertsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private doctorIntegration: BillingDoctorIntegrationService,
    private patientIntegration: BillingPatientIntegrationService,
    private orthotistIntegration: OrthotistBillingIntegrationService
  ) {
    this.loadBillingSummary();
    this.loadAlerts();
    this.subscribeToTreatmentUpdates();
    this.subscribeToOrthotistUpdates();
  }

  // Dashboard Data
  getBillingSummary(): Observable<BillingSummary> {
    return this.http.get<BillingSummary>(`${this.apiUrl}/summary`);
  }

  getPaymentAlerts(): Observable<PaymentAlert[]> {
    return this.http.get<PaymentAlert[]>(`${this.apiUrl}/alerts`);
  }

  // Bill Management
  getTodayBills(): Observable<BillItem[]> {
    return this.http.get<BillItem[]>(`${this.apiUrl}/bills/today`);
  }

  getPendingBills(): Observable<BillItem[]> {
    return this.http.get<BillItem[]>(`${this.apiUrl}/bills/pending`);
  }

  getOverdueBills(): Observable<BillItem[]> {
    return this.http.get<BillItem[]>(`${this.apiUrl}/bills/overdue`);
  }

  searchBills(searchTerm: string, filters?: any): Observable<BillItem[]> {
    let params = new HttpParams().set('search', searchTerm);
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get<BillItem[]>(`${this.apiUrl}/bills/search`, { params });
  }

  getBillById(billId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/bills/${billId}`);
  }

  // Quick Actions
  generateQuickBill(appointmentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bills/quick-generate`, { appointmentId });
  }

  searchInvoice(invoiceNumber: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/invoices/search/${invoiceNumber}`);
  }

  // Audit and Logging
  logBillingAction(action: string, details: any): Observable<any> {
    const logData = {
      action,
      details,
      timestamp: new Date(),
      staffId: this.getCurrentStaffId()
    };
    return this.http.post(`${this.apiUrl}/audit/log`, logData);
  }

  getBillingAuditLogs(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get<any[]>(`${this.apiUrl}/audit/logs`, { params });
  }

  // Utility Methods
  private loadBillingSummary(): void {
    this.getBillingSummary().subscribe(
      summary => this.billingSummarySubject.next(summary),
      error => console.error('Error loading billing summary:', error)
    );
  }

  private loadAlerts(): void {
    this.getPaymentAlerts().subscribe(
      alerts => this.alertsSubject.next(alerts),
      error => console.error('Error loading alerts:', error)
    );
  }

  private getCurrentStaffId(): string {
    // Get from auth service or local storage
    return localStorage.getItem('staffId') || 'unknown';
  }

  refreshDashboard(): void {
    this.loadBillingSummary();
    this.loadAlerts();
  }

  // Integration Methods
  private subscribeToTreatmentUpdates(): void {
    this.doctorIntegration.treatmentUpdates$.subscribe(treatments => {
      // Update billing summary when new treatments are completed
      this.loadBillingSummary();
    });
  }

  // Enhanced methods with integration
  getCompletedTreatmentsForBilling(): Observable<any[]> {
    return this.doctorIntegration.getCompletedTreatments({
      status: 'COMPLETED',
      billingStatus: 'PENDING'
    });
  }

  getPatientBillingInfo(patientId: string): Observable<any> {
    return this.patientIntegration.getPatientBillingProfile(patientId);
  }

  getTreatmentDetailsForBilling(appointmentId: string): Observable<any> {
    return this.doctorIntegration.getTreatmentSummary(appointmentId);
  }

  notifyPatientOfNewBill(patientId: string, billId: string): Observable<any> {
    return this.patientIntegration.sendBillNotificationToPatient(patientId, billId, 'BILL_GENERATED');
  }

  updateDoctorOnBillingStatus(appointmentId: string, billId: string, status: string, amount: number): Observable<any> {
    return this.doctorIntegration.sendBillingStatusToDoctor(appointmentId, status, amount);
  }

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  // Get status color
  getStatusColor(status: string): string {
    const colors = {
      'DRAFT': '#9e9e9e',
      'GENERATED': '#2196f3',
      'PAID': '#4caf50',
      'CANCELLED': '#f44336',
      'OVERDUE': '#ff9800'
    };
    return colors[status as keyof typeof colors] || '#9e9e9e';
  }

  // Get priority color
  getPriorityColor(priority: string): string {
    const colors = {
      'HIGH': '#f44336',
      'MEDIUM': '#ff9800',
      'LOW': '#4caf50'
    };
    return colors[priority as keyof typeof colors] || '#9e9e9e';
  }

  // Orthotist Integration Methods
  
  // Get orthodontic billing items
  getOrthodonticBillingItems(): Observable<any[]> {
    return this.orthotistIntegration.getBillingItems('');
  }

  // Get orthodontic cost estimates
  getOrthodonticCostEstimates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/orthodontic/cost-estimates`);
  }

  // Review orthodontic billing approval
  reviewOrthodonticBillingApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED', notes?: string): Observable<any> {
    return this.orthotistIntegration.updateApprovalStatus(approvalId, decision, notes);
  }

  // Get orthodontic billing approvals pending review
  getPendingOrthodonticApprovals(): Observable<any[]> {
    return this.orthotistIntegration.getBillingApprovals('');
  }

  // Generate orthodontic case invoice
  generateOrthodonticInvoice(caseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/orthodontic/cases/${caseId}/generate-invoice`, {});
  }

  // Get orthodontic material costs
  getOrthodonticMaterialCosts(caseId: string): Observable<any[]> {
    return this.orthotistIntegration.getMaterialUsage(caseId);
  }

  // Get orthodontic labor costs
  getOrthodonticLaborCosts(caseId: string): Observable<any[]> {
    return this.orthotistIntegration.getLaborTracking(caseId);
  }

  // Update orthodontic billing item
  updateOrthodonticBillingItem(itemId: string, updates: any): Observable<any> {
    return this.orthotistIntegration.updateBillingItem(itemId, updates);
  }

  // Get orthodontic financial summary
  getOrthodonticFinancialSummary(caseId: string): Observable<any> {
    return this.orthotistIntegration.getCaseFinancialSummary(caseId);
  }

  // Process orthodontic insurance claim
  processOrthodonticInsuranceClaim(caseId: string, claimData: any): Observable<any> {
    return this.orthotistIntegration.createInsuranceClaim({
      caseId,
      ...claimData
    });
  }

  // Get orthodontic revenue analytics
  getOrthodonticRevenueAnalytics(dateRange?: { start: Date; end: Date }): Observable<any> {
    return this.orthotistIntegration.getMaterialCostAnalysis(dateRange);
  }

  // Subscribe to orthodontic billing updates
  private subscribeToOrthotistUpdates(): void {
    this.orthotistIntegration.billingUpdates$.subscribe(updates => {
      // Handle orthodontic billing updates
      this.loadBillingSummary();
    });
  }

  // Notify orthotist of billing status
  notifyOrthotistBillingStatus(caseId: string, status: string, amount: number): Observable<any> {
    return this.orthotistIntegration.updatePaymentStatus(caseId, {
      status,
      amount,
      lastUpdated: new Date()
    });
  }

  // Request orthodontic billing review
  requestOrthodonticBillingReview(caseId: string, reviewType: string): Observable<any> {
    return this.orthotistIntegration.requestBillingReview(caseId, reviewType);
  }
}