import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  insuranceProvider: string;
  policyNumber: string;
  treatmentDate: Date;
  submissionDate: Date;
  status: ClaimStatus;
  billedAmount: number;
  approvedAmount?: number;
  patientPayable?: number;
  rejectionReason?: string;
  documents: ClaimDocument[];
  communications: Communication[];
  createdBy: string;
  lastUpdated: Date;
}

export interface PatientInsurance {
  id: string;
  patientId: string;
  patientName: string;
  insuranceProvider: string;
  policyNumber: string;
  coverageType: string;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  copayAmount?: number;
  deductible?: number;
  maxCoverage?: number;
}

export interface ClaimDocument {
  id: string;
  claimId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  uploadedBy: string;
  documentType: DocumentType;
  version: number;
}

export interface Communication {
  id: string;
  claimId: string;
  type: CommunicationType;
  direction: 'INBOUND' | 'OUTBOUND';
  subject: string;
  content: string;
  contactPerson?: string;
  communicationDate: Date;
  followUpRequired: boolean;
  followUpDate?: Date;
  createdBy: string;
}

export enum ClaimStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED'
}

export enum DocumentType {
  INVOICE = 'INVOICE',
  TREATMENT_SUMMARY = 'TREATMENT_SUMMARY',
  PRESCRIPTION = 'PRESCRIPTION',
  XRAY = 'XRAY',
  LAB_REPORT = 'LAB_REPORT',
  SUPPORTING_DOCUMENT = 'SUPPORTING_DOCUMENT'
}

export enum CommunicationType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  PORTAL = 'PORTAL',
  FAX = 'FAX'
}

@Injectable({
  providedIn: 'root'
})
export class InsuranceService {
  private apiUrl = `${environment.apiUrl}/insurance`;
  private claimsSubject = new BehaviorSubject<InsuranceClaim[]>([]);
  public claims$ = this.claimsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Claims Management
  getClaims(filters?: any): Observable<InsuranceClaim[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<InsuranceClaim[]>(`${this.apiUrl}/claims`, { params });
  }

  getClaimById(claimId: string): Observable<InsuranceClaim> {
    return this.http.get<InsuranceClaim>(`${this.apiUrl}/claims/${claimId}`);
  }

  createClaim(claim: Partial<InsuranceClaim>): Observable<InsuranceClaim> {
    return this.http.post<InsuranceClaim>(`${this.apiUrl}/claims`, claim);
  }

  updateClaim(claimId: string, updates: Partial<InsuranceClaim>): Observable<InsuranceClaim> {
    return this.http.put<InsuranceClaim>(`${this.apiUrl}/claims/${claimId}`, updates);
  }

  submitClaim(claimId: string): Observable<InsuranceClaim> {
    return this.http.post<InsuranceClaim>(`${this.apiUrl}/claims/${claimId}/submit`, {});
  }

  // Patient Insurance Management
  getPatientInsurance(patientId?: string): Observable<PatientInsurance[]> {
    const params = patientId ? new HttpParams().set('patientId', patientId) : new HttpParams();
    return this.http.get<PatientInsurance[]>(`${this.apiUrl}/patient-insurance`, { params });
  }

  verifyInsuranceEligibility(patientId: string, policyNumber: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-eligibility`, { patientId, policyNumber });
  }

  // Document Management
  uploadDocument(claimId: string, file: File, documentType: DocumentType): Observable<ClaimDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return this.http.post<ClaimDocument>(`${this.apiUrl}/claims/${claimId}/documents`, formData);
  }

  getClaimDocuments(claimId: string): Observable<ClaimDocument[]> {
    return this.http.get<ClaimDocument[]>(`${this.apiUrl}/claims/${claimId}/documents`);
  }

  downloadDocument(documentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}/download`, { responseType: 'blob' });
  }

  deleteDocument(documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documents/${documentId}`);
  }

  // Communication Management
  addCommunication(claimId: string, communication: Partial<Communication>): Observable<Communication> {
    return this.http.post<Communication>(`${this.apiUrl}/claims/${claimId}/communications`, communication);
  }

  getCommunications(claimId: string): Observable<Communication[]> {
    return this.http.get<Communication[]>(`${this.apiUrl}/claims/${claimId}/communications`);
  }

  // Reports and Analytics
  getClaimsReport(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.apiUrl}/reports/claims`, { params });
  }

  getInsurerPerformanceReport(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/insurer-performance`);
  }

  exportReport(reportType: string, filters: any): Observable<Blob> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.apiUrl}/reports/${reportType}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  // Dashboard Statistics
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/stats`);
  }

  getClaimStatusDistribution(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/claim-status-distribution`);
  }

  getRecentActivity(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/recent-activity`);
  }

  // Utility Methods
  getClaimStatusColor(status: ClaimStatus): string {
    const statusColors = {
      [ClaimStatus.DRAFT]: '#9e9e9e',
      [ClaimStatus.SUBMITTED]: '#2196f3',
      [ClaimStatus.UNDER_REVIEW]: '#ff9800',
      [ClaimStatus.APPROVED]: '#4caf50',
      [ClaimStatus.PARTIALLY_APPROVED]: '#8bc34a',
      [ClaimStatus.REJECTED]: '#f44336',
      [ClaimStatus.SETTLED]: '#009688'
    };
    return statusColors[status] || '#9e9e9e';
  }

  getClaimStatusIcon(status: ClaimStatus): string {
    const statusIcons = {
      [ClaimStatus.DRAFT]: 'edit',
      [ClaimStatus.SUBMITTED]: 'send',
      [ClaimStatus.UNDER_REVIEW]: 'hourglass_empty',
      [ClaimStatus.APPROVED]: 'check_circle',
      [ClaimStatus.PARTIALLY_APPROVED]: 'check_circle_outline',
      [ClaimStatus.REJECTED]: 'cancel',
      [ClaimStatus.SETTLED]: 'account_balance'
    };
    return statusIcons[status] || 'help';
  }
}