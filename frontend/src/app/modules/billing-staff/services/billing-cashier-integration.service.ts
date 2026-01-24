import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CashierBillingIntegrationService, BillingCashierNotification, InvoiceStatusUpdate } from '../../../shared/services/cashier-billing-integration.service';

export interface BillingStaffNotification {
  id: string;
  type: 'PAYMENT_PROCESSED' | 'PAYMENT_FAILED' | 'CLARIFICATION_REQUESTED' | 'PAYMENT_PROCESSING';
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  cashierId: string;
  cashierName: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  createdAt: Date;
  metadata?: any;
}

export interface InvoiceHandoffStatus {
  invoiceId: string;
  status: 'DRAFT' | 'READY_FOR_CASHIER' | 'SENT_TO_CASHIER' | 'WITH_CASHIER' | 'PAYMENT_PROCESSING' | 'COMPLETED' | 'FAILED';
  sentAt?: Date;
  processedAt?: Date;
  cashierId?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillingCashierIntegrationService extends CashierBillingIntegrationService {
  private cashierNotificationsSubject = new BehaviorSubject<BillingStaffNotification[]>([]);
  public cashierNotifications$ = this.cashierNotificationsSubject.asObservable();
  
  private handoffStatusSubject = new BehaviorSubject<InvoiceHandoffStatus[]>([]);
  public handoffStatus$ = this.handoffStatusSubject.asObservable();

  constructor(http: HttpClient) {
    super(http);
    this.initializeBillingStaffUpdates();
  }

  // ==================== BILLING STAFF SPECIFIC METHODS ====================

  /**
   * Send multiple invoices to cashier in batch
   */
  sendInvoicesToCashierBatch(invoiceIds: string[], priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM', notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-batch-to-cashier`, {
      invoiceIds,
      priority,
      notes,
      billingStaffId: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Get invoices ready to send to cashier
   */
  getInvoicesReadyForCashier(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/invoices-ready-for-cashier`, { headers: this.getHeaders() });
  }

  /**
   * Get invoices currently with cashier
   */
  getInvoicesWithCashier(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/invoices-with-cashier`, { headers: this.getHeaders() });
  }

  /**
   * Recall invoice from cashier (if not yet processed)
   */
  recallInvoiceFromCashier(invoiceId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/recall-from-cashier`, {
      invoiceId,
      reason,
      billingStaffId: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Respond to cashier clarification request
   */
  respondToClarificationRequest(invoiceId: string, responses: string[], updatedInvoice?: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/respond-to-clarification`, {
      invoiceId,
      responses,
      updatedInvoice,
      billingStaffId: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Set invoice priority for cashier
   */
  setInvoicePriority(invoiceId: string, priority: 'HIGH' | 'MEDIUM' | 'LOW', reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/set-invoice-priority`, {
      invoiceId,
      priority,
      reason,
      billingStaffId: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Get payment processing status from cashier
   */
  getPaymentProcessingStatus(invoiceIds: string[]): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/payment-processing-status`, {
      invoiceIds
    }, { headers: this.getHeaders() });
  }

  /**
   * Request payment expedite from cashier
   */
  requestPaymentExpedite(invoiceId: string, reason: string, urgency: 'HIGH' | 'URGENT'): Observable<any> {
    return this.http.post(`${this.apiUrl}/request-expedite`, {
      invoiceId,
      reason,
      urgency,
      billingStaffId: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  /**
   * Get notifications from cashier
   */
  getCashierNotifications(): Observable<BillingStaffNotification[]> {
    return this.http.get<BillingStaffNotification[]>(`${this.apiUrl}/cashier-notifications`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * Mark cashier notification as handled
   */
  markCashierNotificationHandled(notificationId: string, action?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cashier-notifications/${notificationId}/handled`, {
      action,
      handledBy: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Get handoff status for invoices
   */
  getHandoffStatus(invoiceIds?: string[]): Observable<InvoiceHandoffStatus[]> {
    const params = invoiceIds ? { invoiceIds: invoiceIds.join(',') } : {};
    return this.http.get<InvoiceHandoffStatus[]>(`${this.apiUrl}/handoff-status`, { 
      headers: this.getHeaders(),
      params 
    });
  }

  // ==================== DASHBOARD AND ANALYTICS ====================

  /**
   * Get billing staff integration dashboard
   */
  getBillingStaffDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/billing-staff-dashboard`, { headers: this.getHeaders() });
  }

  /**
   * Get cashier performance metrics
   */
  getCashierPerformanceMetrics(period: 'TODAY' | 'WEEK' | 'MONTH'): Observable<any> {
    return this.http.get(`${this.apiUrl}/cashier-performance/${period}`, { headers: this.getHeaders() });
  }

  /**
   * Get invoice processing timeline
   */
  getInvoiceProcessingTimeline(invoiceId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/invoice-timeline/${invoiceId}`, { headers: this.getHeaders() });
  }

  /**
   * Get payment collection efficiency
   */
  getPaymentCollectionEfficiency(startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/collection-efficiency`, { 
      headers: this.getHeaders(),
      params: { startDate, endDate }
    });
  }

  // ==================== REAL-TIME UPDATES ====================

  private initializeBillingStaffUpdates(): void {
    // Subscribe to cashier notifications
    setInterval(() => {
      this.getCashierNotifications().subscribe(notifications => {
        this.cashierNotificationsSubject.next(notifications);
      });
    }, 15000); // Poll every 15 seconds

    // Subscribe to handoff status updates
    setInterval(() => {
      this.getHandoffStatus().subscribe(statuses => {
        this.handoffStatusSubject.next(statuses);
      });
    }, 30000); // Poll every 30 seconds
  }

  /**
   * Subscribe to real-time payment updates
   */
  subscribeToPaymentUpdates(invoiceIds: string[]): Observable<any> {
    // This would establish WebSocket subscription for payment updates
    return new Observable(observer => {
      // WebSocket implementation would go here
      // For now, return empty observable
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Format cashier notification message
   */
  formatCashierNotificationMessage(notification: BillingStaffNotification): string {
    switch (notification.type) {
      case 'PAYMENT_PROCESSED':
        return `Payment processed by ${notification.cashierName} for invoice ${notification.invoiceNumber}`;
      case 'PAYMENT_FAILED':
        return `Payment failed for invoice ${notification.invoiceNumber} - requires attention`;
      case 'CLARIFICATION_REQUESTED':
        return `Cashier ${notification.cashierName} requested clarification for invoice ${notification.invoiceNumber}`;
      case 'PAYMENT_PROCESSING':
        return `Payment being processed by ${notification.cashierName} for invoice ${notification.invoiceNumber}`;
      default:
        return notification.message || notification.type;
    }
  }

  /**
   * Get handoff status color
   */
  getHandoffStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'primary';
      case 'PAYMENT_PROCESSING': return 'accent';
      case 'WITH_CASHIER': return 'accent';
      case 'FAILED': return 'warn';
      case 'SENT_TO_CASHIER': return 'primary';
      default: return '';
    }
  }

  /**
   * Get handoff status icon
   */
  getHandoffStatusIcon(status: string): string {
    switch (status) {
      case 'DRAFT': return 'edit';
      case 'READY_FOR_CASHIER': return 'send';
      case 'SENT_TO_CASHIER': return 'flight_takeoff';
      case 'WITH_CASHIER': return 'person';
      case 'PAYMENT_PROCESSING': return 'payment';
      case 'COMPLETED': return 'check_circle';
      case 'FAILED': return 'error';
      default: return 'help';
    }
  }

  /**
   * Calculate processing time
   */
  calculateProcessingTime(sentAt: Date, processedAt?: Date): string {
    if (!processedAt) return 'In progress';
    
    const diffMs = new Date(processedAt).getTime() - new Date(sentAt).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}min`;
  }

  /**
   * Check if invoice can be recalled
   */
  canRecallInvoice(status: string): boolean {
    return ['SENT_TO_CASHIER', 'WITH_CASHIER'].includes(status);
  }

  /**
   * Check if invoice needs attention
   */
  needsAttention(notification: BillingStaffNotification): boolean {
    return ['PAYMENT_FAILED', 'CLARIFICATION_REQUESTED'].includes(notification.type);
  }
}