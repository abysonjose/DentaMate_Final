import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { BillingPatientIntegrationService } from '../../../shared/services/billing-patient-integration.service';

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'CASH' | 'UPI' | 'CARD' | 'WALLET' | 'BANK_TRANSFER';
  enabled: boolean;
  processingFee?: number;
  icon?: string;
}

export interface PaymentRequest {
  billId: string;
  amount: number;
  paymentMethod: string;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'WALLET' | 'BANK_TRANSFER';
  transactionId?: string;
  referenceNumber?: string;
  notes?: string;
  receivedBy: string;
}

export interface PaymentResponse {
  paymentId: string;
  billId: string;
  amount: number;
  paymentMethod: string;
  paymentMode: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  transactionId?: string;
  referenceNumber?: string;
  processedDate: Date;
  receivedBy: string;
  gatewayResponse?: any;
}

export interface PaymentGatewayConfig {
  razorpay: {
    enabled: boolean;
    keyId: string;
    supportedMethods: string[];
  };
  paytm: {
    enabled: boolean;
    merchantId: string;
    supportedMethods: string[];
  };
  phonepe: {
    enabled: boolean;
    merchantId: string;
    supportedMethods: string[];
  };
}

export interface CashPaymentDetails {
  amountReceived: number;
  changeGiven: number;
  denomination?: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class PaymentProcessingService {
  private apiUrl = `${environment.apiUrl}/billing/payments`;
  private paymentMethodsSubject = new BehaviorSubject<PaymentMethod[]>([]);
  
  paymentMethods$ = this.paymentMethodsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private patientIntegration: BillingPatientIntegrationService
  ) {
    this.loadPaymentMethods();
  }

  // Payment Methods
  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(`${this.apiUrl}/methods`);
  }

  getPaymentGatewayConfig(): Observable<PaymentGatewayConfig> {
    return this.http.get<PaymentGatewayConfig>(`${this.apiUrl}/gateway/config`);
  }

  // Payment Processing
  processCashPayment(paymentRequest: PaymentRequest, cashDetails: CashPaymentDetails): Observable<PaymentResponse> {
    const request = {
      ...paymentRequest,
      cashDetails,
      paymentMode: 'CASH'
    };
    return this.http.post<PaymentResponse>(`${this.apiUrl}/process/cash`, request).pipe(
      tap(response => {
        if (response.status === 'SUCCESS') {
          // Notify patient of successful payment
          this.patientIntegration.sendBillNotificationToPatient(
            paymentRequest.billId.split('-')[0], // Extract patient ID from bill ID
            paymentRequest.billId,
            'PAYMENT_RECEIVED'
          ).subscribe();
        }
      })
    );
  }

  processDigitalPayment(paymentRequest: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/process/digital`, paymentRequest).pipe(
      tap(response => {
        if (response.status === 'SUCCESS') {
          // Notify patient of successful payment
          this.patientIntegration.sendBillNotificationToPatient(
            paymentRequest.billId.split('-')[0], // Extract patient ID from bill ID
            paymentRequest.billId,
            'PAYMENT_RECEIVED'
          ).subscribe();
        }
      })
    );
  }

  initiateGatewayPayment(billId: string, amount: number, method: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/gateway/initiate`, {
      billId,
      amount,
      method
    });
  }

  verifyGatewayPayment(paymentId: string, gatewayResponse: any): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/gateway/verify`, {
      paymentId,
      gatewayResponse
    });
  }

  // Payment Status and History
  getPaymentStatus(paymentId: string): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.apiUrl}/${paymentId}/status`);
  }

  getBillPayments(billId: string): Observable<PaymentResponse[]> {
    return this.http.get<PaymentResponse[]>(`${this.apiUrl}/bill/${billId}`);
  }

  getPaymentHistory(filters?: any): Observable<PaymentResponse[]> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get<PaymentResponse[]>(`${this.apiUrl}/history`, { params });
  }

  // Payment Validation
  validatePayment(paymentRequest: PaymentRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate`, paymentRequest);
  }

  checkDuplicatePayment(billId: string, transactionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-duplicate`, {
      params: { billId, transactionId }
    });
  }

  // Refunds and Cancellations
  initiateRefund(paymentId: string, amount: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${paymentId}/refund`, {
      amount,
      reason
    });
  }

  cancelPayment(paymentId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${paymentId}/cancel`, {
      reason
    });
  }

  // Payment Reports
  getDailyPaymentSummary(date?: Date): Observable<any> {
    const params = date ? new HttpParams().set('date', date.toISOString()) : new HttpParams();
    return this.http.get(`${this.apiUrl}/reports/daily-summary`, { params });
  }

  getPaymentModeWiseSummary(startDate: Date, endDate: Date): Observable<any> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get(`${this.apiUrl}/reports/payment-mode-wise`, { params });
  }

  // Utility Methods
  private loadPaymentMethods(): void {
    this.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethodsSubject.next(methods);
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
      }
    });
  }

  calculateChange(amountReceived: number, billAmount: number): number {
    return Math.max(0, amountReceived - billAmount);
  }

  validateCashPayment(amountReceived: number, billAmount: number): string[] {
    const errors: string[] = [];

    if (amountReceived < billAmount) {
      errors.push('Amount received is less than bill amount');
    }

    if (amountReceived <= 0) {
      errors.push('Amount received must be greater than 0');
    }

    return errors;
  }

  validateDigitalPayment(paymentRequest: PaymentRequest): string[] {
    const errors: string[] = [];

    if (!paymentRequest.transactionId && paymentRequest.paymentMode !== 'CASH') {
      errors.push('Transaction ID is required for digital payments');
    }

    if (paymentRequest.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (!paymentRequest.paymentMethod) {
      errors.push('Payment method is required');
    }

    return errors;
  }

  formatPaymentMode(mode: string): string {
    const modeNames = {
      'CASH': 'Cash',
      'UPI': 'UPI',
      'CARD': 'Card',
      'WALLET': 'Wallet',
      'BANK_TRANSFER': 'Bank Transfer'
    };
    return modeNames[mode as keyof typeof modeNames] || mode;
  }

  getPaymentModeIcon(mode: string): string {
    const modeIcons = {
      'CASH': 'money',
      'UPI': 'qr_code',
      'CARD': 'credit_card',
      'WALLET': 'account_balance_wallet',
      'BANK_TRANSFER': 'account_balance'
    };
    return modeIcons[mode as keyof typeof modeIcons] || 'payment';
  }

  getPaymentStatusColor(status: string): string {
    const statusColors = {
      'SUCCESS': '#4caf50',
      'PENDING': '#ff9800',
      'FAILED': '#f44336',
      'CANCELLED': '#9e9e9e'
    };
    return statusColors[status as keyof typeof statusColors] || '#9e9e9e';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const time = Date.now().toString().substr(-4);
    return `RCP${year}${month}${day}${time}`;
  }

  // Cash denomination helper
  calculateDenomination(amount: number): { [key: string]: number } {
    const denominations = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
    const result: { [key: string]: number } = {};
    let remaining = amount;

    denominations.forEach(denom => {
      if (remaining >= denom) {
        const count = Math.floor(remaining / denom);
        result[denom.toString()] = count;
        remaining -= count * denom;
      }
    });

    return result;
  }
}