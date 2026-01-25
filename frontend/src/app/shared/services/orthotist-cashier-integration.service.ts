import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentRequest {
  caseId: string;
  patientId: string;
  patientName: string;
  totalAmount: number;
  itemizedCharges: PaymentItem[];
  paymentType: 'FULL' | 'PARTIAL' | 'INSTALLMENT';
  dueDate: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
  orthotistId: string;
  createdDate: Date;
}

export interface PaymentItem {
  id: string;
  description: string;
  category: 'CONSULTATION' | 'FABRICATION' | 'MATERIALS' | 'DELIVERY' | 'ADJUSTMENT';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount?: number;
  discountAmount?: number;
  isCompleted: boolean;
}

export interface PaymentStatus {
  caseId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'REFUNDED';
  lastPaymentDate?: Date;
  nextPaymentDue?: Date;
  paymentMethod?: string;
  transactionId?: string;
  receiptNumber?: string;
}

export interface DeliveryPaymentConfirmation {
  caseId: string;
  patientId: string;
  paymentConfirmed: boolean;
  paymentAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'INSURANCE' | 'INSTALLMENT';
  transactionId?: string;
  receiptNumber: string;
  cashierName: string;
  paymentDate: Date;
  notes?: string;
}

export interface RefundRequest {
  caseId: string;
  patientId: string;
  refundAmount: number;
  refundReason: 'CANCELLATION' | 'DEFECT' | 'PATIENT_DISSATISFACTION' | 'MEDICAL_REASON' | 'OTHER';
  description: string;
  requestedBy: string;
  requestDate: Date;
  approvalRequired: boolean;
  originalPaymentMethod: string;
  originalTransactionId?: string;
}

export interface CashierNotification {
  id: string;
  type: 'PAYMENT_DUE' | 'DELIVERY_READY' | 'REFUND_REQUEST' | 'PAYMENT_OVERDUE';
  caseId: string;
  patientName: string;
  message: string;
  amount?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdDate: Date;
  isRead: boolean;
  actionRequired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrthotistCashierIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/orthotist-cashier`;
  private paymentUpdatesSubject = new BehaviorSubject<PaymentStatus[]>([]);
  public paymentUpdates$ = this.paymentUpdatesSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Payment Requests
  createPaymentRequest(request: Partial<PaymentRequest>): Observable<PaymentRequest> {
    return this.http.post<PaymentRequest>(`${this.apiUrl}/payment-requests`, request, {
      headers: this.getHeaders()
    });
  }

  updatePaymentRequest(requestId: string, updates: Partial<PaymentRequest>): Observable<PaymentRequest> {
    return this.http.patch<PaymentRequest>(`${this.apiUrl}/payment-requests/${requestId}`, updates, {
      headers: this.getHeaders()
    });
  }

  getPaymentRequests(orthotistId?: string): Observable<PaymentRequest[]> {
    const params = orthotistId ? `?orthotistId=${orthotistId}` : '';
    return this.http.get<PaymentRequest[]>(`${this.apiUrl}/payment-requests${params}`, {
      headers: this.getHeaders()
    });
  }

  getCasePaymentRequest(caseId: string): Observable<PaymentRequest> {
    return this.http.get<PaymentRequest>(`${this.apiUrl}/cases/${caseId}/payment-request`, {
      headers: this.getHeaders()
    });
  }

  // Payment Status Management
  getPaymentStatus(caseId: string): Observable<PaymentStatus> {
    return this.http.get<PaymentStatus>(`${this.apiUrl}/cases/${caseId}/payment-status`, {
      headers: this.getHeaders()
    });
  }

  updatePaymentStatus(caseId: string, status: Partial<PaymentStatus>): Observable<PaymentStatus> {
    return this.http.patch<PaymentStatus>(`${this.apiUrl}/cases/${caseId}/payment-status`, status, {
      headers: this.getHeaders()
    });
  }

  checkPaymentBeforeDelivery(caseId: string): Observable<{ canDeliver: boolean; reason?: string }> {
    return this.http.get<{ canDeliver: boolean; reason?: string }>(`${this.apiUrl}/cases/${caseId}/delivery-check`, {
      headers: this.getHeaders()
    });
  }

  // Delivery Payment Confirmation
  requestDeliveryPaymentConfirmation(caseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/request-payment-confirmation`, {}, {
      headers: this.getHeaders()
    });
  }

  confirmDeliveryPayment(confirmation: DeliveryPaymentConfirmation): Observable<any> {
    return this.http.post(`${this.apiUrl}/delivery-payment-confirmation`, confirmation, {
      headers: this.getHeaders()
    });
  }

  getDeliveryPaymentConfirmation(caseId: string): Observable<DeliveryPaymentConfirmation> {
    return this.http.get<DeliveryPaymentConfirmation>(`${this.apiUrl}/cases/${caseId}/delivery-payment-confirmation`, {
      headers: this.getHeaders()
    });
  }

  // Refund Management
  createRefundRequest(refund: Partial<RefundRequest>): Observable<RefundRequest> {
    return this.http.post<RefundRequest>(`${this.apiUrl}/refund-requests`, refund, {
      headers: this.getHeaders()
    });
  }

  getRefundRequests(caseId?: string): Observable<RefundRequest[]> {
    const params = caseId ? `?caseId=${caseId}` : '';
    return this.http.get<RefundRequest[]>(`${this.apiUrl}/refund-requests${params}`, {
      headers: this.getHeaders()
    });
  }

  updateRefundRequest(refundId: string, updates: Partial<RefundRequest>): Observable<RefundRequest> {
    return this.http.patch<RefundRequest>(`${this.apiUrl}/refund-requests/${refundId}`, updates, {
      headers: this.getHeaders()
    });
  }

  // Cashier Notifications
  sendCashierNotification(notification: Partial<CashierNotification>): Observable<CashierNotification> {
    return this.http.post<CashierNotification>(`${this.apiUrl}/cashier-notifications`, notification, {
      headers: this.getHeaders()
    });
  }

  getCashierNotifications(): Observable<CashierNotification[]> {
    return this.http.get<CashierNotification[]>(`${this.apiUrl}/cashier-notifications`, {
      headers: this.getHeaders()
    });
  }

  markNotificationAsRead(notificationId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cashier-notifications/${notificationId}/read`, {}, {
      headers: this.getHeaders()
    });
  }

  // Payment Verification
  verifyPaymentBeforeDelivery(caseId: string): Observable<{ verified: boolean; details: any }> {
    return this.http.post<{ verified: boolean; details: any }>(`${this.apiUrl}/cases/${caseId}/verify-payment`, {}, {
      headers: this.getHeaders()
    });
  }

  requestPaymentVerification(caseId: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/request-verification`, {
      amount
    }, {
      headers: this.getHeaders()
    });
  }

  // Invoice Generation
  generateInvoice(caseId: string): Observable<{ invoiceId: string; invoiceUrl: string }> {
    return this.http.post<{ invoiceId: string; invoiceUrl: string }>(`${this.apiUrl}/cases/${caseId}/generate-invoice`, {}, {
      headers: this.getHeaders()
    });
  }

  getInvoice(caseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cases/${caseId}/invoice`, {
      headers: this.getHeaders()
    });
  }

  // Receipt Management
  generateReceipt(caseId: string, paymentDetails: any): Observable<{ receiptId: string; receiptUrl: string }> {
    return this.http.post<{ receiptId: string; receiptUrl: string }>(`${this.apiUrl}/cases/${caseId}/generate-receipt`, paymentDetails, {
      headers: this.getHeaders()
    });
  }

  getReceipt(receiptId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/receipts/${receiptId}/download`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Payment Plans
  createPaymentPlan(caseId: string, planDetails: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/payment-plan`, planDetails, {
      headers: this.getHeaders()
    });
  }

  getPaymentPlan(caseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cases/${caseId}/payment-plan`, {
      headers: this.getHeaders()
    });
  }

  updatePaymentPlan(caseId: string, updates: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cases/${caseId}/payment-plan`, updates, {
      headers: this.getHeaders()
    });
  }

  // Financial Reporting
  getPaymentSummary(dateRange?: { start: Date; end: Date }): Observable<any> {
    const params = dateRange ? 
      `?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}` : '';
    return this.http.get(`${this.apiUrl}/reports/payment-summary${params}`, {
      headers: this.getHeaders()
    });
  }

  getOutstandingPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reports/outstanding-payments`, {
      headers: this.getHeaders()
    });
  }

  getRefundSummary(dateRange?: { start: Date; end: Date }): Observable<any> {
    const params = dateRange ? 
      `?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}` : '';
    return this.http.get(`${this.apiUrl}/reports/refund-summary${params}`, {
      headers: this.getHeaders()
    });
  }

  // Real-time Payment Updates
  subscribeToPaymentUpdates(orthotistId: string): Observable<any> {
    return new Observable(observer => {
      const ws = new WebSocket(`${environment.wsUrl}/orthotist-cashier/${orthotistId}`);
      
      ws.onmessage = (event) => {
        observer.next(JSON.parse(event.data));
      };
      
      ws.onerror = (error) => {
        observer.error(error);
      };
      
      ws.onclose = () => {
        observer.complete();
      };
      
      return () => ws.close();
    });
  }

  // Integration Utilities
  notifyReadyForDelivery(caseId: string, deliveryDetails: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/ready-for-delivery`, deliveryDetails, {
      headers: this.getHeaders()
    });
  }

  requestPaymentBeforeDelivery(caseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/request-payment-before-delivery`, {}, {
      headers: this.getHeaders()
    });
  }

  confirmCaseDelivery(caseId: string, deliveryConfirmation: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/confirm-delivery`, deliveryConfirmation, {
      headers: this.getHeaders()
    });
  }
}