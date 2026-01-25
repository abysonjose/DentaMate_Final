import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OrthotistDoctorIntegrationService } from '../../../shared/services/orthotist-doctor-integration.service';
import { OrthotistPatientIntegrationService } from '../../../shared/services/orthotist-patient-integration.service';
import { OrthotistBillingIntegrationService } from '../../../shared/services/orthotist-billing-integration.service';
import { OrthotistCashierIntegrationService } from '../../../shared/services/orthotist-cashier-integration.service';

export interface OrthodonticCase {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  caseType: 'BRACES' | 'ALIGNERS' | 'RETAINER' | 'APPLIANCE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'RECEIVED' | 'IN_MEASUREMENT_REVIEW' | 'IN_FABRICATION' | 'READY' | 'DELIVERED';
  createdDate: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  measurements?: CaseMeasurement;
  fabricationStages?: FabricationStage[];
  notes?: string;
  qualityChecks?: QualityCheck[];
}

export interface CaseMeasurement {
  id: string;
  dentalImpressions: string[];
  images: string[];
  scans: string[];
  doctorNotes: string;
  specifications: any;
  isComplete: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface FabricationStage {
  id: string;
  stage: 'MATERIAL_PREP' | 'SHAPING' | 'QUALITY_CHECK' | 'FINISHING';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  orthotistId: string;
}

export interface QualityCheck {
  id: string;
  checkType: 'DIMENSIONAL' | 'MATERIAL' | 'FINISH' | 'FINAL';
  status: 'PASSED' | 'FAILED' | 'NEEDS_REVIEW';
  checkedBy: string;
  checkedAt: Date;
  notes?: string;
  images?: string[];
}

export interface CommunicationMessage {
  id: string;
  caseId: string;
  fromRole: string;
  toRole: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DelayReport {
  caseId: string;
  reason: 'MATERIAL_SHORTAGE' | 'MEASUREMENT_ISSUE' | 'EQUIPMENT_PROBLEM' | 'OTHER';
  description: string;
  revisedETA: Date;
  escalateToAdmin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrthotistService {
  private apiUrl = `${environment.apiUrl}/orthodontic`;
  private casesSubject = new BehaviorSubject<OrthodonticCase[]>([]);
  public cases$ = this.casesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private doctorIntegration: OrthotistDoctorIntegrationService,
    private patientIntegration: OrthotistPatientIntegrationService,
    private billingIntegration: OrthotistBillingIntegrationService,
    private cashierIntegration: OrthotistCashierIntegrationService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Case Management
  getCases(): Observable<OrthodonticCase[]> {
    return this.http.get<OrthodonticCase[]>(`${this.apiUrl}/cases`, {
      headers: this.getHeaders()
    });
  }

  getCaseById(caseId: string): Observable<OrthodonticCase> {
    return this.http.get<OrthodonticCase>(`${this.apiUrl}/cases/${caseId}`, {
      headers: this.getHeaders()
    });
  }

  updateCaseStatus(caseId: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cases/${caseId}/status`, 
      { status }, 
      { headers: this.getHeaders() }
    );
  }

  // Measurement Review
  getMeasurements(caseId: string): Observable<CaseMeasurement> {
    return this.http.get<CaseMeasurement>(`${this.apiUrl}/cases/${caseId}/measurements`, {
      headers: this.getHeaders()
    });
  }

  confirmMeasurementReceipt(caseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/measurements/confirm`, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  requestMeasurementClarification(caseId: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/measurements/clarification`, 
      { message }, 
      { headers: this.getHeaders() }
    );
  }

  // Fabrication Tracking
  getFabricationStages(caseId: string): Observable<FabricationStage[]> {
    return this.http.get<FabricationStage[]>(`${this.apiUrl}/cases/${caseId}/fabrication`, {
      headers: this.getHeaders()
    });
  }

  updateFabricationStage(caseId: string, stageId: string, data: Partial<FabricationStage>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cases/${caseId}/fabrication/${stageId}`, 
      data, 
      { headers: this.getHeaders() }
    );
  }

  addFabricationNote(caseId: string, stageId: string, note: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/fabrication/${stageId}/notes`, 
      { note }, 
      { headers: this.getHeaders() }
    );
  }

  // Delivery Management
  setDeliveryDate(caseId: string, deliveryDate: Date): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cases/${caseId}/delivery`, 
      { estimatedDeliveryDate: deliveryDate }, 
      { headers: this.getHeaders() }
    );
  }

  markAsReady(caseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/ready`, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  // Quality & Compliance
  getQualityChecks(caseId: string): Observable<QualityCheck[]> {
    return this.http.get<QualityCheck[]>(`${this.apiUrl}/cases/${caseId}/quality`, {
      headers: this.getHeaders()
    });
  }

  performQualityCheck(caseId: string, checkData: Partial<QualityCheck>): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/quality`, 
      checkData, 
      { headers: this.getHeaders() }
    );
  }

  // Communication
  getMessages(): Observable<CommunicationMessage[]> {
    return this.http.get<CommunicationMessage[]>(`${this.apiUrl}/messages`, {
      headers: this.getHeaders()
    });
  }

  sendMessage(message: Partial<CommunicationMessage>): Observable<any> {
    return this.http.post(`${this.apiUrl}/messages`, 
      message, 
      { headers: this.getHeaders() }
    );
  }

  markMessageAsRead(messageId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/messages/${messageId}/read`, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  // Delay & Issue Handling
  reportDelay(delayReport: DelayReport): Observable<any> {
    return this.http.post(`${this.apiUrl}/delays`, 
      delayReport, 
      { headers: this.getHeaders() }
    );
  }

  // Dashboard Analytics
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/stats`, {
      headers: this.getHeaders()
    });
  }

  // Case History
  getCaseHistory(filters?: any): Observable<OrthodonticCase[]> {
    let params = '';
    if (filters) {
      params = '?' + Object.keys(filters)
        .map(key => `${key}=${encodeURIComponent(filters[key])}`)
        .join('&');
    }
    
    return this.http.get<OrthodonticCase[]>(`${this.apiUrl}/cases/history${params}`, {
      headers: this.getHeaders()
    });
  }

  // Utility Methods
  refreshCases(): void {
    this.getCases().subscribe(cases => {
      this.casesSubject.next(cases);
    });
  }

  // Integration Methods
  
  // Doctor Integration
  sendProgressUpdateToDoctor(caseId: string, update: any): Observable<any> {
    return this.doctorIntegration.sendProgressUpdate({
      caseId,
      ...update
    });
  }

  requestClarificationFromDoctor(caseId: string, message: string): Observable<any> {
    return this.doctorIntegration.requestClarification({
      caseId,
      orthotistId: this.getCurrentOrthotistId(),
      doctorId: '', // Will be resolved by backend
      subject: 'Case Clarification Required',
      message,
      urgency: 'MEDIUM',
      requestDate: new Date(),
      responseRequired: true
    });
  }

  notifyDoctorCaseReady(caseId: string): Observable<any> {
    return this.doctorIntegration.notifyReadyForDelivery(caseId, {
      readyDate: new Date(),
      qualityChecked: true,
      deliveryInstructions: 'Case ready for patient delivery'
    });
  }

  // Patient Integration
  notifyPatientProgress(caseId: string, progress: any): Observable<any> {
    return this.patientIntegration.sendPatientUpdate(caseId, {
      type: 'PROGRESS_UPDATE',
      message: `Your orthodontic case is ${progress.percentage}% complete`,
      currentStage: progress.stage,
      estimatedCompletion: progress.estimatedCompletion
    });
  }

  notifyPatientReady(caseId: string): Observable<any> {
    return this.patientIntegration.sendDeliveryNotification({
      caseId,
      patientId: '', // Will be resolved by backend
      message: 'Your orthodontic appliance is ready for delivery',
      deliveryDate: new Date(),
      appointmentRequired: true,
      instructions: [
        'Please schedule an appointment for fitting',
        'Bring your insurance card if applicable',
        'Allow 30-45 minutes for the appointment'
      ],
      contactInfo: {
        phone: '(555) 123-4567',
        email: 'appointments@dentamate.com'
      },
      urgency: 'MEDIUM'
    });
  }

  schedulePatientDeliveryAppointment(caseId: string, appointmentDetails: any): Observable<any> {
    return this.patientIntegration.confirmDeliveryAppointment(caseId, appointmentDetails);
  }

  // Billing Integration
  createCostEstimate(caseId: string, caseDetails: any): Observable<any> {
    return this.billingIntegration.generateCostEstimate({
      caseId,
      patientId: caseDetails.patientId,
      caseType: caseDetails.caseType,
      complexity: this.determineCaseComplexity(caseDetails),
      estimatedDuration: this.estimateDuration(caseDetails)
    });
  }

  recordLaborTime(caseId: string, stage: string): Observable<any> {
    return this.billingIntegration.startLaborTracking(caseId, stage);
  }

  stopLaborTime(trackingId: string, notes?: string): Observable<any> {
    return this.billingIntegration.stopLaborTracking(trackingId, notes);
  }

  recordMaterialUsage(caseId: string, materials: any[]): Observable<any> {
    const promises = materials.map(material => 
      this.billingIntegration.recordMaterialUsage({
        caseId,
        materialId: material.id,
        materialName: material.name,
        quantityUsed: material.quantity,
        unitCost: material.unitCost,
        totalCost: material.quantity * material.unitCost,
        supplier: material.supplier,
        usageDate: new Date(),
        orthotistId: this.getCurrentOrthotistId()
      })
    );
    
    return new Observable(observer => {
      Promise.all(promises).then(results => {
        observer.next(results);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  requestBillingApproval(caseId: string, amount: number, description: string): Observable<any> {
    return this.billingIntegration.requestBillingApproval({
      caseId,
      approvalType: 'PRE_APPROVAL',
      requestedAmount: amount,
      requestDate: new Date(),
      notes: description
    });
  }

  // Cashier Integration
  createPaymentRequest(caseId: string, paymentDetails: any): Observable<any> {
    return this.cashierIntegration.createPaymentRequest({
      caseId,
      patientId: paymentDetails.patientId,
      patientName: paymentDetails.patientName,
      totalAmount: paymentDetails.totalAmount,
      itemizedCharges: paymentDetails.items,
      paymentType: 'FULL',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: 'MEDIUM',
      orthotistId: this.getCurrentOrthotistId(),
      createdDate: new Date()
    });
  }

  checkPaymentStatus(caseId: string): Observable<any> {
    return this.cashierIntegration.getPaymentStatus(caseId);
  }

  verifyPaymentBeforeDelivery(caseId: string): Observable<any> {
    return this.cashierIntegration.verifyPaymentBeforeDelivery(caseId);
  }

  notifyCashierReadyForDelivery(caseId: string): Observable<any> {
    return this.cashierIntegration.notifyReadyForDelivery(caseId, {
      readyDate: new Date(),
      requiresPaymentVerification: true,
      deliveryNotes: 'Orthodontic appliance ready for patient pickup'
    });
  }

  requestRefund(caseId: string, refundDetails: any): Observable<any> {
    return this.cashierIntegration.createRefundRequest({
      caseId,
      patientId: refundDetails.patientId,
      refundAmount: refundDetails.amount,
      refundReason: refundDetails.reason,
      description: refundDetails.description,
      requestedBy: this.getCurrentOrthotistId(),
      requestDate: new Date(),
      approvalRequired: refundDetails.amount > 500 // Require approval for refunds over $500
    });
  }

  // Utility Methods
  private getCurrentOrthotistId(): string {
    // Get current orthotist ID from auth service or local storage
    return localStorage.getItem('userId') || '';
  }

  private determineCaseComplexity(caseDetails: any): 'SIMPLE' | 'MODERATE' | 'COMPLEX' {
    // Logic to determine case complexity based on case details
    if (caseDetails.caseType === 'RETAINER') return 'SIMPLE';
    if (caseDetails.caseType === 'BRACES' && caseDetails.severity === 'MILD') return 'MODERATE';
    return 'COMPLEX';
  }

  private estimateDuration(caseDetails: any): number {
    // Logic to estimate duration in days
    const baseDuration = {
      'RETAINER': 3,
      'ALIGNERS': 7,
      'BRACES': 14,
      'APPLIANCE': 10
    };
    
    return baseDuration[caseDetails.caseType] || 7;
  }

  // Integration Status Methods
  getIntegrationStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/integration-status`, {
      headers: this.getHeaders()
    });
  }

  syncWithAllSystems(caseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cases/${caseId}/sync-all`, {}, {
      headers: this.getHeaders()
    });
  }
}

  getCaseStatusColor(status: string): string {
    const statusColors = {
      'RECEIVED': '#2196F3',
      'IN_MEASUREMENT_REVIEW': '#FF9800',
      'IN_FABRICATION': '#9C27B0',
      'READY': '#4CAF50',
      'DELIVERED': '#607D8B'
    };
    return statusColors[status] || '#757575';
  }

  getPriorityColor(priority: string): string {
    const priorityColors = {
      'LOW': '#4CAF50',
      'MEDIUM': '#FF9800',
      'HIGH': '#F44336',
      'URGENT': '#D32F2F'
    };
    return priorityColors[priority] || '#757575';
  }
}