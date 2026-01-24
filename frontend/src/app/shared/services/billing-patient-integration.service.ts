import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PatientBillingProfile {
  patientId: string;
  patientName: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: Date;
  insuranceDetails?: InsuranceDetails;
  paymentPreferences: PaymentPreferences;
  billingHistory: BillingHistoryItem[];
  outstandingAmount: number;
  creditLimit: number;
  loyaltyPoints: number;
}

export interface InsuranceDetails {
  providerId: string;
  providerName: string;
  policyNumber: string;
  coverageAmount: number;
  deductible: number;
  copayPercentage: number;
  validUntil: Date;
  preAuthRequired: boolean;
  claimsHistory: InsuranceClaim[];
}

export interface PaymentPreferences {
  preferredMethod: 'CASH' | 'UPI' | 'CARD' | 'WALLET' | 'BANK_TRANSFER';
  autoPayEnabled: boolean;
  reminderPreferences: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    daysBeforeDue: number;
  };
  installmentPreferences: {
    enabled: boolean;
    maxInstallments: number;
    minAmountForInstallment: number;
  };
}

export interface BillingHistoryItem {
  billId: string;
  billNumber: string;
  appointmentId: string;
  treatmentDate: Date;
  doctorName: string;
  services: string[];
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  paymentHistory: PaymentHistoryItem[];
  dueDate: Date;
}

export interface PaymentHistoryItem {
  paymentId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  transactionId?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface InsuranceClaim {
  claimId: string;
  billId: string;
  claimAmount: number;
  approvedAmount: number;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PROCESSING';
  submissionDate: Date;
  approvalDate?: Date;
}

export interface PatientPaymentNotification {
  patientId: string;
  type: 'BILL_GENERATED' | 'PAYMENT_DUE' | 'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'PAYMENT_FAILED';
  message: string;
  amount: number;
  dueDate?: Date;
  billId: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PatientBillingStatement {
  patientId: string;
  statementPeriod: {
    startDate: Date;
    endDate: Date;
  };
  previousBalance: number;
  newCharges: number;
  payments: number;
  adjustments: number;
  currentBalance: number;
  minimumPaymentDue: number;
  paymentDueDate: Date;
  transactions: BillingTransaction[];
}

export interface BillingTransaction {
  date: Date;
  description: string;
  type: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT';
  amount: number;
  balance: number;
}

@Injectable({
  providedIn: 'root'
})
export class BillingPatientIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/billing-patient`;
  private patientNotificationsSubject = new BehaviorSubject<PatientPaymentNotification[]>([]);
  
  patientNotifications$ = this.patientNotificationsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Patient Billing Profile Management
  getPatientBillingProfile(patientId: string): Observable<PatientBillingProfile> {
    return this.http.get<PatientBillingProfile>(`${this.apiUrl}/profile/${patientId}`);
  }

  updatePatientBillingProfile(profile: PatientBillingProfile): Observable<PatientBillingProfile> {
    return this.http.put<PatientBillingProfile>(`${this.apiUrl}/profile`, profile);
  }

  getPatientPaymentPreferences(patientId: string): Observable<PaymentPreferences> {
    return this.http.get<PaymentPreferences>(`${this.apiUrl}/payment-preferences/${patientId}`);
  }

  updatePatientPaymentPreferences(patientId: string, preferences: PaymentPreferences): Observable<PaymentPreferences> {
    return this.http.put<PaymentPreferences>(`${this.apiUrl}/payment-preferences/${patientId}`, preferences);
  }

  // Patient Billing History
  getPatientBillingHistory(patientId: string, filters?: any): Observable<BillingHistoryItem[]> {
    let params = new HttpParams().set('patientId', patientId);
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<BillingHistoryItem[]>(`${this.apiUrl}/billing-history`, { params });
  }

  getPatientOutstandingBills(patientId: string): Observable<BillingHistoryItem[]> {
    return this.http.get<BillingHistoryItem[]>(`${this.apiUrl}/outstanding-bills/${patientId}`);
  }

  getPatientBillingStatement(patientId: string, startDate: Date, endDate: Date): Observable<PatientBillingStatement> {
    const params = new HttpParams()
      .set('patientId', patientId)
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    
    return this.http.get<PatientBillingStatement>(`${this.apiUrl}/billing-statement`, { params });
  }

  // Patient Payment Processing
  processPatientPayment(patientId: string, billId: string, paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/process-payment`, {
      patientId,
      billId,
      ...paymentData
    });
  }

  setupPatientAutoPayment(patientId: string, autoPayConfig: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/setup-autopay`, {
      patientId,
      ...autoPayConfig
    });
  }

  processInstallmentPayment(patientId: string, billId: string, installmentPlan: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/setup-installment`, {
      patientId,
      billId,
      ...installmentPlan
    });
  }

  // Insurance Integration
  getPatientInsuranceDetails(patientId: string): Observable<InsuranceDetails> {
    return this.http.get<InsuranceDetails>(`${this.apiUrl}/insurance/${patientId}`);
  }

  verifyInsuranceCoverage(patientId: string, treatmentCodes: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-insurance`, {
      patientId,
      treatmentCodes
    });
  }

  submitInsuranceClaim(patientId: string, billId: string, claimData: any): Observable<InsuranceClaim> {
    return this.http.post<InsuranceClaim>(`${this.apiUrl}/submit-claim`, {
      patientId,
      billId,
      ...claimData
    });
  }

  getInsuranceClaimStatus(claimId: string): Observable<InsuranceClaim> {
    return this.http.get<InsuranceClaim>(`${this.apiUrl}/claim-status/${claimId}`);
  }

  // Patient Notifications
  sendBillNotificationToPatient(patientId: string, billId: string, notificationType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-notification`, {
      patientId,
      billId,
      type: notificationType
    });
  }

  getPatientNotificationPreferences(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/notification-preferences/${patientId}`);
  }

  updatePatientNotificationPreferences(patientId: string, preferences: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/notification-preferences/${patientId}`, preferences);
  }

  // Patient Portal Integration
  generatePatientBillAccessLink(patientId: string, billId: string): Observable<{ accessLink: string; expiresAt: Date }> {
    return this.http.post<{ accessLink: string; expiresAt: Date }>(`${this.apiUrl}/generate-access-link`, {
      patientId,
      billId
    });
  }

  getPatientBillForPortal(patientId: string, billId: string, accessToken: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/portal-bill/${patientId}/${billId}`, {
      headers: { 'Access-Token': accessToken }
    });
  }

  // Patient Loyalty and Discounts
  getPatientLoyaltyPoints(patientId: string): Observable<{ points: number; tier: string; benefits: string[] }> {
    return this.http.get<{ points: number; tier: string; benefits: string[] }>(`${this.apiUrl}/loyalty-points/${patientId}`);
  }

  applyLoyaltyDiscount(patientId: string, billId: string, pointsToRedeem: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/apply-loyalty-discount`, {
      patientId,
      billId,
      pointsToRedeem
    });
  }

  getAvailableDiscounts(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/available-discounts/${patientId}`);
  }

  // Patient Feedback on Billing
  submitBillingFeedback(patientId: string, billId: string, feedback: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/billing-feedback`, {
      patientId,
      billId,
      ...feedback
    });
  }

  // Payment Reminders
  schedulePaymentReminder(patientId: string, billId: string, reminderConfig: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/schedule-reminder`, {
      patientId,
      billId,
      ...reminderConfig
    });
  }

  getScheduledReminders(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/scheduled-reminders/${patientId}`);
  }

  // Utility Methods
  calculatePatientOutstanding(billingHistory: BillingHistoryItem[]): number {
    return billingHistory.reduce((total, item) => total + item.outstandingAmount, 0);
  }

  getPaymentStatusColor(status: string): string {
    const colors = {
      'PAID': '#4caf50',
      'PARTIAL': '#ff9800',
      'PENDING': '#2196f3',
      'OVERDUE': '#f44336',
      'CANCELLED': '#9e9e9e'
    };
    return colors[status as keyof typeof colors] || '#9e9e9e';
  }

  formatPatientAddress(address: string): string {
    return address.length > 50 ? address.substring(0, 50) + '...' : address;
  }

  calculateInstallmentAmount(totalAmount: number, installments: number): number {
    return Math.ceil(totalAmount / installments);
  }

  isEligibleForInstallment(amount: number, minAmount: number): boolean {
    return amount >= minAmount;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getDaysOverdue(dueDate: Date): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  getNotificationPriorityColor(priority: string): string {
    const colors = {
      'HIGH': '#f44336',
      'MEDIUM': '#ff9800',
      'LOW': '#4caf50'
    };
    return colors[priority as keyof typeof colors] || '#9e9e9e';
  }
}