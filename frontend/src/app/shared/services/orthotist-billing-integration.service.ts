import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OrthodonticBillingItem {
  id: string;
  caseId: string;
  patientId: string;
  itemType: 'CONSULTATION' | 'MEASUREMENT' | 'FABRICATION' | 'DELIVERY' | 'ADJUSTMENT' | 'MATERIAL';
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  laborHours?: number;
  materialCost?: number;
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  isCompleted: boolean;
  completionDate?: Date;
  orthotistId: string;
}

export interface CostEstimate {
  caseId: string;
  patientId: string;
  caseType: 'BRACES' | 'ALIGNERS' | 'RETAINER' | 'APPLIANCE';
  estimatedCosts: {
    consultation: number;
    measurements: number;
    fabrication: number;
    materials: number;
    delivery: number;
    followUp: number;
  };
  totalEstimate: number;
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  estimatedDuration: number; // in days
  validUntil: Date;
  notes?: string;
}

export interface BillingApproval {
  caseId: string;
  itemId: string;
  approvalType: 'PRE_APPROVAL' | 'POST_COMPLETION' | 'MODIFICATION';
  requestedAmount: number;
  approvedAmount?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_REVIEW';
  requestDate: Date;
  approvalDate?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface MaterialUsage {
  caseId: string;
  materialId: string;
  materialName: string;
  quantityUsed: number;
  unitCost: number;
  totalCost: number;
  supplier: string;
  batchNumber?: string;
  expiryDate?: Date;
  usageDate: Date;
  orthotistId: string;
}

export interface LaborTracking {
  caseId: string;
  orthotistId: string;
  stage: 'MEASUREMENT_REVIEW' | 'FABRICATION' | 'QUALITY_CHECK' | 'DELIVERY_PREP';
  startTime: Date;
  endTime?: Date;
  totalHours?: number;
  hourlyRate: number;
  totalCost?: number;
  description: string;
  isCompleted: boolean;
}

export interface InsuranceClaim {
  caseId: string;
  patientId: string;
  insuranceProvider: string;
  policyNumber: string;
  claimNumber?: string;
  claimAmount: number;
  approvedAmount?: number;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  submissionDate?: Date;
  approvalDate?: Date;
  paymentDate?: Date;
  rejectionReason?: string;
  documents: string[];
}

@Injectable({
  providedIn: 'root'
})
export class OrthotistBillingIntegrationService {
  private apiUrl = `${environment.apiUrl}/integration/orthotist-billing`;
  private billingUpdatesSubject = new BehaviorSubject<any[]>([]);
  public billingUpdates$ = this.billingUpdatesSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Cost Estimation
  generateCostEstimate(caseDetails: any): Observable<CostEstimate> {
    return this.http.post<CostEstimate>(`${this.apiUrl}/cost-estimate`, caseDetails, {
      headers: this.getHeaders()
    });
  }

  updateCostEstimate(caseId: string, updates: Partial<CostEstimate>): Observable<CostEstimate> {
    return this.http.patch<CostEstimate>(`${this.apiUrl}/cost-estimate/${caseId}`, updates, {
      headers: this.getHeaders()
    });
  }

  getCostEstimate(caseId: string): Observable<CostEstimate> {
    return this.http.get<CostEstimate>(`${this.apiUrl}/cost-estimate/${caseId}`, {
      headers: this.getHeaders()
    });
  }

  // Billing Items Management
  createBillingItem(item: Partial<OrthodonticBillingItem>): Observable<OrthodonticBillingItem> {
    return this.http.post<OrthodonticBillingItem>(`${this.apiUrl}/billing-items`, item, {
      headers: this.getHeaders()
    });
  }

  updateBillingItem(itemId: string, updates: Partial<OrthodonticBillingItem>): Observable<OrthodonticBillingItem> {
    return this.http.patch<OrthodonticBillingItem>(`${this.apiUrl}/billing-items/${itemId}`, updates, {
      headers: this.getHeaders()
    });
  }

  getBillingItems(caseId: string): Observable<OrthodonticBillingItem[]> {
    return this.http.get<OrthodonticBillingItem[]>(`${this.apiUrl}/cases/${caseId}/billing-items`, {
      headers: this.getHeaders()
    });
  }

  markItemCompleted(itemId: string, completionDetails: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/billing-items/${itemId}/complete`, completionDetails, {
      headers: this.getHeaders()
    });
  }

  // Material Usage Tracking
  recordMaterialUsage(usage: MaterialUsage): Observable<any> {
    return this.http.post(`${this.apiUrl}/material-usage`, usage, {
      headers: this.getHeaders()
    });
  }

  getMaterialUsage(caseId: string): Observable<MaterialUsage[]> {
    return this.http.get<MaterialUsage[]>(`${this.apiUrl}/cases/${caseId}/material-usage`, {
      headers: this.getHeaders()
    });
  }

  updateMaterialCosts(caseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/update-material-costs`, {}, {
      headers: this.getHeaders()
    });
  }

  // Labor Time Tracking
  startLaborTracking(caseId: string, stage: string): Observable<LaborTracking> {
    return this.http.post<LaborTracking>(`${this.apiUrl}/labor-tracking/start`, {
      caseId,
      stage
    }, {
      headers: this.getHeaders()
    });
  }

  stopLaborTracking(trackingId: string, notes?: string): Observable<LaborTracking> {
    return this.http.post<LaborTracking>(`${this.apiUrl}/labor-tracking/${trackingId}/stop`, {
      notes
    }, {
      headers: this.getHeaders()
    });
  }

  getLaborTracking(caseId: string): Observable<LaborTracking[]> {
    return this.http.get<LaborTracking[]>(`${this.apiUrl}/cases/${caseId}/labor-tracking`, {
      headers: this.getHeaders()
    });
  }

  // Billing Approvals
  requestBillingApproval(approval: Partial<BillingApproval>): Observable<BillingApproval> {
    return this.http.post<BillingApproval>(`${this.apiUrl}/approvals`, approval, {
      headers: this.getHeaders()
    });
  }

  getBillingApprovals(caseId: string): Observable<BillingApproval[]> {
    return this.http.get<BillingApproval[]>(`${this.apiUrl}/cases/${caseId}/approvals`, {
      headers: this.getHeaders()
    });
  }

  updateApprovalStatus(approvalId: string, status: string, notes?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/approvals/${approvalId}`, {
      status,
      notes
    }, {
      headers: this.getHeaders()
    });
  }

  // Insurance Claims
  createInsuranceClaim(claim: Partial<InsuranceClaim>): Observable<InsuranceClaim> {
    return this.http.post<InsuranceClaim>(`${this.apiUrl}/insurance-claims`, claim, {
      headers: this.getHeaders()
    });
  }

  updateInsuranceClaim(claimId: string, updates: Partial<InsuranceClaim>): Observable<InsuranceClaim> {
    return this.http.patch<InsuranceClaim>(`${this.apiUrl}/insurance-claims/${claimId}`, updates, {
      headers: this.getHeaders()
    });
  }

  getInsuranceClaims(caseId: string): Observable<InsuranceClaim[]> {
    return this.http.get<InsuranceClaim[]>(`${this.apiUrl}/cases/${caseId}/insurance-claims`, {
      headers: this.getHeaders()
    });
  }

  submitInsuranceClaim(claimId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/insurance-claims/${claimId}/submit`, {}, {
      headers: this.getHeaders()
    });
  }

  // Financial Reporting
  getCaseFinancialSummary(caseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cases/${caseId}/financial-summary`, {
      headers: this.getHeaders()
    });
  }

  getOrthotistRevenue(orthotistId: string, dateRange?: { start: Date; end: Date }): Observable<any> {
    const params = dateRange ? 
      `?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}` : '';
    return this.http.get(`${this.apiUrl}/orthotist/${orthotistId}/revenue${params}`, {
      headers: this.getHeaders()
    });
  }

  getMaterialCostAnalysis(dateRange?: { start: Date; end: Date }): Observable<any> {
    const params = dateRange ? 
      `?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}` : '';
    return this.http.get(`${this.apiUrl}/analytics/material-costs${params}`, {
      headers: this.getHeaders()
    });
  }

  // Integration with Billing Staff
  notifyBillingStaff(caseId: string, notification: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/notify-billing-staff`, {
      caseId,
      ...notification
    }, {
      headers: this.getHeaders()
    });
  }

  requestBillingReview(caseId: string, reviewType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/request-billing-review`, {
      caseId,
      reviewType
    }, {
      headers: this.getHeaders()
    });
  }

  // Payment Status Updates
  updatePaymentStatus(caseId: string, paymentStatus: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/payment-status`, paymentStatus, {
      headers: this.getHeaders()
    });
  }

  getPaymentStatus(caseId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/cases/${caseId}/payment-status`, {
      headers: this.getHeaders()
    });
  }

  // Real-time Billing Updates
  subscribeToBillingUpdates(orthotistId: string): Observable<any> {
    return new Observable(observer => {
      const ws = new WebSocket(`${environment.wsUrl}/orthotist-billing/${orthotistId}`);
      
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
}