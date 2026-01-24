import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BillingCashierNotification {
  id: string;
  type: 'INVOICE_GENERATED' | 'INVOICE_UPDATED' | 'PAYMENT_REQUIRED' | 'PAYMENT_PROCESSED' | 'PAYMENT_FAILED';
  invoiceId: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  amount: number;
  status: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: Date;
  billingStaffId?: string;
  cashierId?: string;
  metadata?: any;
}

export interface InvoiceStatusUpdate {
  invoiceId: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  updatedAt: Date;
  paymentDetails?: any;
}

export interface BillingWorkflowStatus {
  invoiceId: string;
  currentStage: 'DRAFT' | 'GENERATED' | 'SENT_TO_CASHIER' | 'PAYMENT_PENDING' | 'PAYMENT_PROCESSING' | 'PAID' | 'CANCELLED';
  billingStaffId: string;
  cashierId?: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CashierBillingIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/cashier-billing`;
  
  // Real-time notification streams
  private notificationsSubject = new BehaviorSubject<BillingCashierNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private invoiceStatusUpdatesSubject = new Subject<InvoiceStatusUpdate>();
  public invoiceStatusUpdates$ = this.invoiceStatusUpdatesSubject.asObservable();
  
  private workflowUpdatesSubject = new Subject<BillingWorkflowStatus>();
  public workflowUpdates$ = this.workflowUpdatesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeWebSocketConnection();
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

  // ==================== BILLING STAFF TO CASHIER ====================

  /**
   * Billing Staff: Send invoice to cashier for payment collection
   */
  sendInvoiceToCashier(invoiceId: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM', notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-to-cashier`, {
      invoiceId,
      priority,
      notes,
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Billing Staff: Update invoice and notify cashier
   */
  updateInvoiceForCashier(invoiceId: string, updates: any, notifyCashier: boolean = true): Observable<any> {
    return this.http.patch(`${this.apiUrl}/update-invoice`, {
      invoiceId,
      updates,
      notifyCashier,
      updatedBy: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Billing Staff: Cancel invoice and notify cashier
   */
  cancelInvoiceForCashier(invoiceId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cancel-invoice`, {
      invoiceId,
      reason,
      cancelledBy: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Billing Staff: Request payment status from cashier
   */
  requestPaymentStatus(invoiceId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/payment-status/${invoiceId}`, { headers: this.getHeaders() });
  }

  // ==================== CASHIER TO BILLING STAFF ====================

  /**
   * Cashier: Notify billing staff of payment processing
   */
  notifyPaymentProcessing(invoiceId: string, paymentDetails: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment-processing`, {
      invoiceId,
      paymentDetails,
      cashierId: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Cashier: Confirm payment completion to billing staff
   */
  confirmPaymentToBilling(invoiceId: string, paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment-confirmed`, {
      invoiceId,
      paymentData,
      cashierId: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Cashier: Report payment failure to billing staff
   */
  reportPaymentFailure(invoiceId: string, failureReason: string, details?: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment-failed`, {
      invoiceId,
      failureReason,
      details,
      cashierId: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  /**
   * Cashier: Request invoice clarification from billing staff
   */
  requestInvoiceClarification(invoiceId: string, questions: string[], urgency: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'): Observable<any> {
    return this.http.post(`${this.apiUrl}/request-clarification`, {
      invoiceId,
      questions,
      urgency,
      requestedBy: localStorage.getItem('userId'),
      timestamp: new Date()
    }, { headers: this.getHeaders() });
  }

  // ==================== SHARED OPERATIONS ====================

  /**
   * Get integration notifications for current user
   */
  getNotifications(role: 'BILLING_STAFF' | 'CASHIER'): Observable<BillingCashierNotification[]> {
    return this.http.get<BillingCashierNotification[]>(`${this.apiUrl}/notifications/${role}`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(notificationId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notifications/${notificationId}/read`, {}, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * Get workflow status for invoice
   */
  getWorkflowStatus(invoiceId: string): Observable<BillingWorkflowStatus> {
    return this.http.get<BillingWorkflowStatus>(`${this.apiUrl}/workflow-status/${invoiceId}`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * Get integration dashboard data
   */
  getIntegrationDashboard(role: 'BILLING_STAFF' | 'CASHIER'): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/${role}`, { headers: this.getHeaders() });
  }

  /**
   * Get pending handoffs between billing and cashier
   */
  getPendingHandoffs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pending-handoffs`, { headers: this.getHeaders() });
  }

  /**
   * Get integration metrics
   */
  getIntegrationMetrics(period: 'TODAY' | 'WEEK' | 'MONTH'): Observable<any> {
    return this.http.get(`${this.apiUrl}/metrics/${period}`, { headers: this.getHeaders() });
  }

  // ==================== REAL-TIME UPDATES ====================

  private initializeWebSocketConnection(): void {
    // WebSocket connection for real-time updates
    // This would be implemented with Socket.IO or WebSocket
    // For now, we'll simulate with polling
    
    setInterval(() => {
      this.pollForUpdates();
    }, 10000); // Poll every 10 seconds
  }

  private pollForUpdates(): void {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'BILLING_STAFF' || userRole === 'CASHIER') {
      this.getNotifications(userRole as any).subscribe(notifications => {
        this.notificationsSubject.next(notifications);
      });
    }
  }

  /**
   * Subscribe to real-time invoice status updates
   */
  subscribeToInvoiceUpdates(invoiceId: string): Observable<InvoiceStatusUpdate> {
    // This would establish a WebSocket subscription for specific invoice
    return this.invoiceStatusUpdates$;
  }

  /**
   * Subscribe to workflow status changes
   */
  subscribeToWorkflowUpdates(): Observable<BillingWorkflowStatus> {
    return this.workflowUpdates$;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Format notification message for display
   */
  formatNotificationMessage(notification: BillingCashierNotification): string {
    switch (notification.type) {
      case 'INVOICE_GENERATED':
        return `New invoice ${notification.invoiceNumber} generated for ${notification.patientName}`;
      case 'INVOICE_UPDATED':
        return `Invoice ${notification.invoiceNumber} has been updated`;
      case 'PAYMENT_REQUIRED':
        return `Payment required for invoice ${notification.invoiceNumber} - ₹${notification.amount}`;
      case 'PAYMENT_PROCESSED':
        return `Payment processed for invoice ${notification.invoiceNumber}`;
      case 'PAYMENT_FAILED':
        return `Payment failed for invoice ${notification.invoiceNumber}`;
      default:
        return notification.type;
    }
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'INVOICE_GENERATED': return 'description';
      case 'INVOICE_UPDATED': return 'edit';
      case 'PAYMENT_REQUIRED': return 'payment';
      case 'PAYMENT_PROCESSED': return 'check_circle';
      case 'PAYMENT_FAILED': return 'error';
      default: return 'info';
    }
  }

  /**
   * Get notification color based on priority
   */
  getNotificationColor(priority: string): string {
    switch (priority) {
      case 'HIGH': return 'warn';
      case 'MEDIUM': return 'accent';
      case 'LOW': return 'primary';
      default: return 'primary';
    }
  }

  /**
   * Check if user can perform action on invoice
   */
  canPerformAction(action: string, invoiceStatus: string, userRole: string): boolean {
    const permissions = {
      'BILLING_STAFF': {
        'SEND_TO_CASHIER': ['GENERATED', 'DRAFT'],
        'UPDATE_INVOICE': ['GENERATED', 'SENT_TO_CASHIER'],
        'CANCEL_INVOICE': ['GENERATED', 'SENT_TO_CASHIER', 'PAYMENT_PENDING']
      },
      'CASHIER': {
        'PROCESS_PAYMENT': ['SENT_TO_CASHIER', 'PAYMENT_PENDING'],
        'REQUEST_CLARIFICATION': ['SENT_TO_CASHIER', 'PAYMENT_PENDING'],
        'REPORT_FAILURE': ['PAYMENT_PROCESSING']
      }
    };

    return permissions[userRole]?.[action]?.includes(invoiceStatus) || false;
  }
}