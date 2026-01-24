import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PrescriptionBillingData {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  medicines: MedicineBillingItem[];
  totalAmount: number;
  dispensedAt: Date;
  dispensedBy: string;
  billId?: string;
  invoiceId?: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
}

export interface MedicineBillingItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber: string;
  expiryDate: Date;
}

export interface PharmacyBillRequest {
  prescriptionId: string;
  patientId: string;
  medicines: MedicineBillingItem[];
  totalAmount: number;
  dispensedBy: string;
  notes?: string;
}

export interface PaymentVerificationRequest {
  prescriptionId: string;
  patientId: string;
  expectedAmount: number;
  paymentMethod?: string;
}

export interface PaymentVerificationResponse {
  isVerified: boolean;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'PARTIAL';
  paidAmount: number;
  pendingAmount: number;
  paymentMethod: string;
  transactionId?: string;
  paidAt?: Date;
  billId?: string;
  invoiceId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacistBillingIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/pharmacist-billing`;
  
  // Subjects for real-time updates
  private prescriptionBillingUpdatesSubject = new BehaviorSubject<PrescriptionBillingData[]>([]);
  private paymentStatusUpdatesSubject = new Subject<PaymentVerificationResponse>();
  private billingAlertsSubject = new Subject<any>();

  // Observables
  public prescriptionBillingUpdates$ = this.prescriptionBillingUpdatesSubject.asObservable();
  public paymentStatusUpdates$ = this.paymentStatusUpdatesSubject.asObservable();
  public billingAlerts$ = this.billingAlertsSubject.asObservable();

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

  // Payment Verification Methods
  verifyPrescriptionPayment(request: PaymentVerificationRequest): Observable<PaymentVerificationResponse> {
    return this.http.post<PaymentVerificationResponse>(
      `${this.apiUrl}/verify-payment`, 
      request, 
      { headers: this.getHeaders() }
    );
  }

  checkPaymentStatus(prescriptionId: string): Observable<PaymentVerificationResponse> {
    return this.http.get<PaymentVerificationResponse>(
      `${this.apiUrl}/payment-status/${prescriptionId}`, 
      { headers: this.getHeaders() }
    );
  }

  refreshPaymentStatus(prescriptionId: string): Observable<PaymentVerificationResponse> {
    return this.http.post<PaymentVerificationResponse>(
      `${this.apiUrl}/refresh-payment-status`, 
      { prescriptionId }, 
      { headers: this.getHeaders() }
    );
  }

  // Billing Integration Methods
  createPharmacyBill(billRequest: PharmacyBillRequest): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/create-pharmacy-bill`, 
      billRequest, 
      { headers: this.getHeaders() }
    );
  }

  updateBillingAfterDispensing(prescriptionBilling: PrescriptionBillingData): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/update-billing-after-dispensing`, 
      prescriptionBilling, 
      { headers: this.getHeaders() }
    );
  }

  notifyBillingStaffOfDispensing(prescriptionId: string, dispensingData: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/notify-billing-staff`, 
      { prescriptionId, dispensingData }, 
      { headers: this.getHeaders() }
    );
  }

  // Cashier Integration Methods
  notifyCashierOfPendingPayment(prescriptionId: string, paymentData: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/notify-cashier-pending-payment`, 
      { prescriptionId, paymentData }, 
      { headers: this.getHeaders() }
    );
  }

  requestPaymentFromCashier(prescriptionId: string, patientId: string, amount: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/request-payment-from-cashier`, 
      { prescriptionId, patientId, amount }, 
      { headers: this.getHeaders() }
    );
  }

  confirmPaymentWithCashier(prescriptionId: string, paymentDetails: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/confirm-payment-with-cashier`, 
      { prescriptionId, paymentDetails }, 
      { headers: this.getHeaders() }
    );
  }

  // Invoice Integration Methods
  getInvoiceForPrescription(prescriptionId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/invoice-for-prescription/${prescriptionId}`, 
      { headers: this.getHeaders() }
    );
  }

  createInvoiceForMedicines(prescriptionId: string, medicines: MedicineBillingItem[]): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/create-medicine-invoice`, 
      { prescriptionId, medicines }, 
      { headers: this.getHeaders() }
    );
  }

  updateInvoiceAfterDispensing(invoiceId: string, dispensingData: any): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/update-invoice-after-dispensing/${invoiceId}`, 
      dispensingData, 
      { headers: this.getHeaders() }
    );
  }

  // Audit and Compliance Methods
  logPharmacyBillingActivity(activity: string, details: any): Observable<any> {
    const logData = {
      activity,
      details,
      timestamp: new Date(),
      pharmacistId: localStorage.getItem('userId'),
      branchId: localStorage.getItem('branchId')
    };
    
    return this.http.post(
      `${this.apiUrl}/log-pharmacy-billing-activity`, 
      logData, 
      { headers: this.getHeaders() }
    );
  }

  getPharmacyBillingAuditLogs(filters?: any): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/pharmacy-billing-audit-logs`, 
      { 
        headers: this.getHeaders(),
        params: filters || {}
      }
    );
  }

  // Real-time Updates Methods
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

  // Utility Methods
  calculateMedicineBillAmount(medicines: MedicineBillingItem[]): number {
    return medicines.reduce((total, medicine) => total + medicine.totalPrice, 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getPaymentStatusColor(status: string): string {
    const colors = {
      'PAID': '#4caf50',
      'PENDING': '#ff9800',
      'FAILED': '#f44336',
      'PARTIAL': '#2196f3'
    };
    return colors[status as keyof typeof colors] || '#9e9e9e';
  }

  getPaymentStatusIcon(status: string): string {
    const icons = {
      'PAID': 'check_circle',
      'PENDING': 'schedule',
      'FAILED': 'error',
      'PARTIAL': 'partial_fulfillment'
    };
    return icons[status as keyof typeof icons] || 'help';
  }

  // WebSocket Connection for Real-time Updates
  private initializeWebSocketConnection(): void {
    // WebSocket implementation for real-time payment status updates
    // This would connect to the backend WebSocket service
    console.log('Initializing WebSocket connection for pharmacy-billing integration');
  }

  // Error Handling
  handlePaymentVerificationError(error: any): string {
    if (error.status === 404) {
      return 'Payment information not found. Please check with billing staff.';
    } else if (error.status === 400) {
      return 'Invalid payment verification request. Please check the prescription details.';
    } else if (error.status === 403) {
      return 'Access denied. You may not have permission to verify this payment.';
    } else {
      return 'An error occurred while verifying payment. Please try again or contact support.';
    }
  }

  handleBillingIntegrationError(error: any): string {
    if (error.status === 409) {
      return 'Billing conflict detected. The prescription may already be billed.';
    } else if (error.status === 422) {
      return 'Invalid billing data. Please check the medicine details and amounts.';
    } else {
      return 'An error occurred while processing billing. Please try again or contact support.';
    }
  }
}