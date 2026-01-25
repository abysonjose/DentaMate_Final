import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BillingStaffData {
  id: string;
  billId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  services: BillingService[];
  totalAmount: number;
  discounts: BillingDiscount[];
  taxes: BillingTax[];
  finalAmount: number;
  billingStaffId: string;
  billingStaffName: string;
  createdDate: Date;
  status: 'DRAFT' | 'FINALIZED' | 'SENT_TO_CASHIER' | 'PAID';
}

export interface BillingService {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  departmentCode: string;
}

export interface BillingDiscount {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  reason: string;
  approvedBy?: string;
}

export interface BillingTax {
  taxType: 'GST' | 'VAT' | 'SERVICE_TAX';
  rate: number;
  amount: number;
}

export interface BillingValidationRequest {
  billId: string;
  accountantNotes: string;
  validationStatus: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  discrepancies?: string[];
}

export interface BillingAuditData {
  billId: string;
  originalAmount: number;
  revisedAmount: number;
  revisionReason: string;
  revisedBy: string;
  revisionDate: Date;
  accountantReview?: {
    reviewedBy: string;
    reviewDate: Date;
    status: 'APPROVED' | 'REJECTED';
    notes: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AccountantBillingIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/accountant-billing`;
  
  // Real-time data streams
  private pendingBillsSubject = new BehaviorSubject<BillingStaffData[]>([]);
  private billingAuditsSubject = new BehaviorSubject<BillingAuditData[]>([]);
  
  public pendingBills$ = this.pendingBillsSubject.asObservable();
  public billingAudits$ = this.billingAuditsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get bills from billing staff that need accounting review
  getPendingBillsForReview(): Observable<BillingStaffData[]> {
    return this.http.get<BillingStaffData[]>(`${this.apiUrl}/pending-bills`);
  }

  // Validate bill created by billing staff
  validateBill(request: BillingValidationRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-bill`, request);
  }

  // Get billing staff performance metrics
  getBillingStaffMetrics(staffId: string, startDate: Date, endDate: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/billing-staff-metrics/${staffId}`, {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });
  }

  // Get bill revision history
  getBillRevisionHistory(billId: string): Observable<BillingAuditData[]> {
    return this.http.get<BillingAuditData[]>(`${this.apiUrl}/bill-revisions/${billId}`);
  }

  // Flag billing discrepancy
  flagBillingDiscrepancy(billId: string, discrepancy: string, severity: 'LOW' | 'MEDIUM' | 'HIGH'): Observable<any> {
    return this.http.post(`${this.apiUrl}/flag-discrepancy/${billId}`, { discrepancy, severity });
  }

  // Request bill correction from billing staff
  requestBillCorrection(billId: string, corrections: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/request-correction/${billId}`, corrections);
  }

  // Get service pricing validation data
  getServicePricingData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/service-pricing`);
  }

  // Validate service pricing in bill
  validateServicePricing(billId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-pricing/${billId}`, {});
  }

  // Get discount approval status
  getDiscountApprovals(startDate: Date, endDate: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/discount-approvals`, {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });
  }

  // Review discount application
  reviewDiscountApplication(billId: string, discountId: string, review: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/review-discount/${billId}/${discountId}`, review);
  }

  // Get tax calculation verification
  verifyTaxCalculations(billId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/verify-tax/${billId}`);
  }

  // Send feedback to billing staff
  sendBillingFeedback(staffId: string, feedback: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/billing-feedback/${staffId}`, feedback);
  }

  // Get billing compliance report
  getBillingComplianceReport(startDate: Date, endDate: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/compliance-report`, {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });
  }

  // Update real-time data
  updatePendingBills(data: BillingStaffData[]): void {
    this.pendingBillsSubject.next(data);
  }

  updateBillingAudits(data: BillingAuditData[]): void {
    this.billingAuditsSubject.next(data);
  }
}