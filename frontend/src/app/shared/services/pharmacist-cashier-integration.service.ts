import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CashierPaymentRequest {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  medicines: CashierMedicineItem[];
  totalAmount: number;
  requestedBy: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
}

export interface CashierMedicineItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PaymentCollectionResponse {
  success: boolean;
  paymentId: string;
  transactionId?: string;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'NET_BANKING' | 'OTHER';
  amountCollected: number;
  changeGiven?: number;
  receiptNumber: string;
  collectedAt: Date;
  collectedBy: string;
}

export interface CashierNotification {
  id: string;
  type: 'PAYMENT_REQUEST' | 'PAYMENT_COLLECTED' | 'PAYMENT_FAILED' | 'REFUND_REQUEST';
  prescriptionId: string;
  patientName: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  message: string;
}

export interface RefundRequest {
  prescriptionId: string;
  originalPaymentId: string;
  refundAmount: number;
  reason: string;
  medicines: CashierMedicineItem[];
  requestedBy: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacistCashierIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/pharmacist-cashier`;
  
  // Subjects for real-time updates
  private paymentRequestsSubject = new BehaviorSubject<CashierPaymentRequest[]>([]);
  private paymentResponsesSubject = new Subject<PaymentCollectionResponse>();
  private cashierNotificationsSubject = new Subject<CashierNotification>();
  private refundUpdatesSubject = new Subject<any>();

  // Observables
  public paymentRequests$ = this.paymentRequestsSubject.asObservable();
  public paymentResponses$ = this.paymentResponsesSubject.asObservable();
  public cashierNotifications$ = this.cashierNotificationsSubject.asObservable();
  public refundUpdates$ = this.refundUpdatesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeWebSocketConnection();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    const branchId = localStorage.getItem('branchId');
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'X-Branch-ID': branchId || '',
      'Content-Type': 'application/json'
    });
  }

  // Payment Request Methods
  sendPaymentRequestToCashier(paymentRequest: CashierPaymentRequest): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/send-payment-request`, 
      paymentRequest, 
      { headers: this.getHeaders() }
    );
  }

  checkPaymentRequestStatus(prescriptionId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/payment-request-status/${prescriptionId}`, 
      { headers: this.getHeaders() }
    );
  }

  cancelPaymentRequest(prescriptionId: string, reason: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/cancel-payment-request`, 
      { prescriptionId, reason }, 
      { headers: this.getHeaders() }
    );
  }

  // Payment Collection Methods
  confirmPaymentCollection(prescriptionId: string): Observable<PaymentCollectionResponse> {
    return this.http.post<PaymentCollectionResponse>(
      `${this.apiUrl}/confirm-payment-collection`, 
      { prescriptionId }, 
      { headers: this.getHeaders() }
    );
  }

  getPaymentCollectionDetails(prescriptionId: string): Observable<PaymentCollectionResponse> {
    return this.http.get<PaymentCollectionResponse>(
      `${this.apiUrl}/payment-collection-details/${prescriptionId}`, 
      { headers: this.getHeaders() }
    );
  }

  verifyPaymentWithCashier(prescriptionId: string, expectedAmount: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/verify-payment-with-cashier`, 
      { prescriptionId, expectedAmount }, 
      { headers: this.getHeaders() }
    );
  }

  // Receipt and Documentation Methods
  requestReceiptGeneration(prescriptionId: string, paymentDetails: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/request-receipt-generation`, 
      { prescriptionId, paymentDetails }, 
      { headers: this.getHeaders() }
    );
  }

  getReceiptForPrescription(prescriptionId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/receipt-for-prescription/${prescriptionId}`, 
      { headers: this.getHeaders() }
    );
  }

  printReceiptForPatient(prescriptionId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/print-receipt-for-patient`, 
      { prescriptionId }, 
      { headers: this.getHeaders() }
    );
  }

  // Refund and Return Methods
  requestMedicineRefund(refundRequest: RefundRequest): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/request-medicine-refund`, 
      refundRequest, 
      { headers: this.getHeaders() }
    );
  }

  checkRefundStatus(prescriptionId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/refund-status/${prescriptionId}`, 
      { headers: this.getHeaders() }
    );
  }

  processPartialRefund(prescriptionId: string, refundItems: CashierMedicineItem[]): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/process-partial-refund`, 
      { prescriptionId, refundItems }, 
      { headers: this.getHeaders() }
    );
  }

  // Notification Methods
  getCashierNotifications(): Observable<CashierNotification[]> {
    return this.http.get<CashierNotification[]>(
      `${this.apiUrl}/cashier-notifications`, 
      { headers: this.getHeaders() }
    );
  }

  markNotificationAsRead(notificationId: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/mark-notification-read/${notificationId}`, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  sendUrgentNotificationToCashier(prescriptionId: string, message: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/send-urgent-notification`, 
      { prescriptionId, message }, 
      { headers: this.getHeaders() }
    );
  }

  // Queue Management Methods
  addToPaymentQueue(prescriptionId: string, priority: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/add-to-payment-queue`, 
      { prescriptionId, priority }, 
      { headers: this.getHeaders() }
    );
  }

  getPaymentQueuePosition(prescriptionId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/payment-queue-position/${prescriptionId}`, 
      { headers: this.getHeaders() }
    );
  }

  updatePaymentQueuePriority(prescriptionId: string, newPriority: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/update-payment-queue-priority`, 
      { prescriptionId, newPriority }, 
      { headers: this.getHeaders() }
    );
  }

  // Audit and Compliance Methods
  logCashierInteraction(interaction: string, details: any): Observable<any> {
    const logData = {
      interaction,
      details,
      timestamp: new Date(),
      pharmacistId: localStorage.getItem('userId'),
      branchId: localStorage.getItem('branchId')
    };
    
    return this.http.post(
      `${this.apiUrl}/log-cashier-interaction`, 
      logData, 
      { headers: this.getHeaders() }
    );
  }

  getCashierInteractionLogs(filters?: any): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/cashier-interaction-logs`, 
      { 
        headers: this.getHeaders(),
        params: filters || {}
      }
    );
  }

  // Real-time Communication Methods
  subscribeToPaymentUpdates(prescriptionIds: string[]): void {
    this.http.post(
      `${this.apiUrl}/subscribe-payment-updates`, 
      { prescriptionIds }, 
      { headers: this.getHeaders() }
    ).subscribe();
  }

  unsubscribeFromPaymentUpdates(): void {
    this.http.post(
      `${this.apiUrl}/unsubscribe-payment-updates`, 
      {}, 
      { headers: this.getHeaders() }
    ).subscribe();
  }

  sendRealTimeMessageToCashier(message: string, prescriptionId?: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/send-realtime-message`, 
      { message, prescriptionId }, 
      { headers: this.getHeaders() }
    );
  }

  // Utility Methods
  calculateTotalAmount(medicines: CashierMedicineItem[]): number {
    return medicines.reduce((total, medicine) => total + medicine.totalPrice, 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getPriorityColor(priority: string): string {
    const colors = {
      'LOW': '#4caf50',
      'MEDIUM': '#ff9800',
      'HIGH': '#f44336',
      'URGENT': '#e91e63'
    };
    return colors[priority as keyof typeof colors] || '#9e9e9e';
  }

  getPriorityIcon(priority: string): string {
    const icons = {
      'LOW': 'low_priority',
      'MEDIUM': 'priority_high',
      'HIGH': 'priority_high',
      'URGENT': 'emergency'
    };
    return icons[priority as keyof typeof icons] || 'help';
  }

  getPaymentMethodIcon(method: string): string {
    const icons = {
      'CASH': 'payments',
      'CARD': 'credit_card',
      'UPI': 'qr_code',
      'NET_BANKING': 'account_balance',
      'OTHER': 'payment'
    };
    return icons[method as keyof typeof icons] || 'payment';
  }

  // WebSocket Connection for Real-time Updates
  private initializeWebSocketConnection(): void {
    // WebSocket implementation for real-time cashier communication
    console.log('Initializing WebSocket connection for pharmacist-cashier integration');
  }

  // Error Handling
  handlePaymentRequestError(error: any): string {
    if (error.status === 404) {
      return 'Cashier not available. Please try again later or contact support.';
    } else if (error.status === 409) {
      return 'Payment request already exists for this prescription.';
    } else if (error.status === 422) {
      return 'Invalid payment request data. Please check the prescription details.';
    } else {
      return 'An error occurred while sending payment request. Please try again.';
    }
  }

  handleRefundRequestError(error: any): string {
    if (error.status === 403) {
      return 'Refund not allowed for this prescription. Please check the refund policy.';
    } else if (error.status === 409) {
      return 'Refund request already exists for this prescription.';
    } else {
      return 'An error occurred while processing refund request. Please try again.';
    }
  }

  // Integration Status Methods
  checkCashierAvailability(): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/cashier-availability`, 
      { headers: this.getHeaders() }
    );
  }

  getCashierWorkload(): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/cashier-workload`, 
      { headers: this.getHeaders() }
    );
  }

  getEstimatedWaitTime(priority: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/estimated-wait-time`, 
      { 
        headers: this.getHeaders(),
        params: { priority }
      }
    );
  }
}