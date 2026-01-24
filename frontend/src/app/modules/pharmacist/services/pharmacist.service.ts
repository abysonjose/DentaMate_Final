import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PharmacistBillingIntegrationService } from '../../../shared/services/pharmacist-billing-integration.service';
import { PharmacistCashierIntegrationService } from '../../../shared/services/pharmacist-cashier-integration.service';

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  prescriptionDate: Date;
  status: 'pending' | 'verified' | 'dispensed' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'failed';
  medicines: PrescriptionMedicine[];
  totalAmount: number;
  notes?: string;
  isAuthentic: boolean;
}

export interface PrescriptionMedicine {
  medicineId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  instructions?: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  expiryDate: Date;
  batchNumber: string;
  location: string;
  status: 'available' | 'low_stock' | 'out_of_stock' | 'expired';
}

export interface DispensingRecord {
  id: string;
  prescriptionId: string;
  patientName: string;
  medicineId: string;
  medicineName: string;
  quantityDispensed: number;
  batchNumber: string;
  dispensedBy: string;
  dispensedAt: Date;
  notes?: string;
}

export interface StockAlert {
  id: string;
  medicineId: string;
  medicineName: string;
  alertType: 'low_stock' | 'expiry_warning' | 'expired' | 'out_of_stock';
  currentStock: number;
  minStockLevel: number;
  expiryDate?: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

export interface StockRefillRequest {
  id?: string;
  medicineId: string;
  medicineName: string;
  currentStock: number;
  requestedQuantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  requestedBy: string;
  requestedAt: Date;
}

export interface PharmacyOverview {
  pendingPrescriptions: number;
  medicinesDispensed: number;
  lowStockAlerts: number;
  expiryAlerts: number;
  todayRevenue: number;
  pendingPayments: number;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacistService {
  private apiUrl = `${environment.apiUrl}/pharmacy`;
  private currentTenantId = new BehaviorSubject<string>('');
  private currentBranchId = new BehaviorSubject<string>('');

  constructor(
    private http: HttpClient,
    private billingIntegration: PharmacistBillingIntegrationService,
    private cashierIntegration: PharmacistCashierIntegrationService
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.currentTenantId.value,
      'X-Branch-ID': this.currentBranchId.value
    });
  }

  setTenantContext(tenantId: string, branchId: string): void {
    this.currentTenantId.next(tenantId);
    this.currentBranchId.next(branchId);
  }

  // Dashboard Overview
  getPharmacyOverview(): Observable<PharmacyOverview> {
    return this.http.get<PharmacyOverview>(`${this.apiUrl}/overview`, {
      headers: this.getHeaders()
    });
  }

  // Prescription Management
  getPendingPrescriptions(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.apiUrl}/prescriptions/pending`, {
      headers: this.getHeaders()
    });
  }

  getPrescriptionById(prescriptionId: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.apiUrl}/prescriptions/${prescriptionId}`, {
      headers: this.getHeaders()
    });
  }

  verifyPrescription(prescriptionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/prescriptions/${prescriptionId}/verify`, {}, {
      headers: this.getHeaders()
    });
  }

  // Payment Verification with Billing Integration
  verifyPaymentStatus(prescriptionId: string): Observable<{ status: string; amount: number }> {
    // First check with billing integration service
    return this.billingIntegration.checkPaymentStatus(prescriptionId);
  }

  // Enhanced payment verification with cashier integration
  verifyPaymentWithCashier(prescriptionId: string, expectedAmount: number): Observable<any> {
    return this.cashierIntegration.verifyPaymentWithCashier(prescriptionId, expectedAmount);
  }

  // Request payment collection from cashier
  requestPaymentFromCashier(prescriptionId: string, patientId: string, patientName: string, medicines: PrescriptionMedicine[]): Observable<any> {
    const paymentRequest = {
      prescriptionId,
      patientId,
      patientName,
      medicines: medicines.map(med => ({
        medicineId: med.medicineId,
        medicineName: med.medicineName,
        quantity: med.quantity,
        unitPrice: med.unitPrice,
        totalPrice: med.totalPrice
      })),
      totalAmount: medicines.reduce((total, med) => total + med.totalPrice, 0),
      requestedBy: localStorage.getItem('userId') || 'pharmacist',
      priority: 'MEDIUM' as const
    };

    return this.cashierIntegration.sendPaymentRequestToCashier(paymentRequest);
  }

  // Enhanced Medicine Dispensing with Billing Integration
  dispenseMedicine(dispensingData: {
    prescriptionId: string;
    medicineId: string;
    quantityDispensed: number;
    batchNumber: string;
    notes?: string;
  }): Observable<any> {
    // First dispense the medicine
    const dispensingResult = this.http.post(`${this.apiUrl}/dispense`, dispensingData, {
      headers: this.getHeaders()
    });

    // Then update billing system
    dispensingResult.subscribe({
      next: (result) => {
        this.updateBillingAfterDispensing(dispensingData.prescriptionId, result);
      },
      error: (error) => console.error('Error in medicine dispensing:', error)
    });

    return dispensingResult;
  }

  completePrescriptionDispensing(prescriptionId: string): Observable<any> {
    const completionResult = this.http.post(`${this.apiUrl}/prescriptions/${prescriptionId}/complete`, {}, {
      headers: this.getHeaders()
    });

    // Notify billing and cashier systems
    completionResult.subscribe({
      next: (result) => {
        this.notifyBillingOfCompletion(prescriptionId, result);
        this.notifyCashierOfCompletion(prescriptionId, result);
      },
      error: (error) => console.error('Error completing prescription:', error)
    });

    return completionResult;
  }

  // Private helper methods for integration
  private updateBillingAfterDispensing(prescriptionId: string, dispensingResult: any): void {
    this.billingIntegration.updateBillingAfterDispensing({
      prescriptionId,
      patientId: dispensingResult.patientId,
      patientName: dispensingResult.patientName,
      doctorId: dispensingResult.doctorId,
      doctorName: dispensingResult.doctorName,
      medicines: dispensingResult.medicines,
      totalAmount: dispensingResult.totalAmount,
      dispensedAt: new Date(),
      dispensedBy: localStorage.getItem('userId') || 'pharmacist',
      paymentStatus: dispensingResult.paymentStatus
    }).subscribe({
      next: () => console.log('Billing updated after dispensing'),
      error: (error) => console.error('Error updating billing:', error)
    });
  }

  private notifyBillingOfCompletion(prescriptionId: string, result: any): void {
    this.billingIntegration.notifyBillingStaffOfDispensing(prescriptionId, result).subscribe({
      next: () => console.log('Billing staff notified of completion'),
      error: (error) => console.error('Error notifying billing staff:', error)
    });
  }

  private notifyCashierOfCompletion(prescriptionId: string, result: any): void {
    this.cashierIntegration.confirmPaymentCollection(prescriptionId).subscribe({
      next: () => console.log('Cashier notified of completion'),
      error: (error) => console.error('Error notifying cashier:', error)
    });
  }

  // Inventory Management
  getMedicineInventory(): Observable<Medicine[]> {
    return this.http.get<Medicine[]>(`${this.apiUrl}/inventory`, {
      headers: this.getHeaders()
    });
  }

  getMedicineById(medicineId: string): Observable<Medicine> {
    return this.http.get<Medicine>(`${this.apiUrl}/inventory/${medicineId}`, {
      headers: this.getHeaders()
    });
  }

  updateMedicineStock(medicineId: string, stockData: {
    quantity: number;
    operation: 'add' | 'subtract';
    reason: string;
    batchNumber?: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/inventory/${medicineId}/stock`, stockData, {
      headers: this.getHeaders()
    });
  }

  // Stock Alerts
  getStockAlerts(): Observable<StockAlert[]> {
    return this.http.get<StockAlert[]>(`${this.apiUrl}/alerts`, {
      headers: this.getHeaders()
    });
  }

  acknowledgeAlert(alertId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/alerts/${alertId}/acknowledge`, {}, {
      headers: this.getHeaders()
    });
  }

  // Stock Refill Requests
  createStockRefillRequest(request: StockRefillRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/refill-requests`, request, {
      headers: this.getHeaders()
    });
  }

  getStockRefillRequests(): Observable<StockRefillRequest[]> {
    return this.http.get<StockRefillRequest[]>(`${this.apiUrl}/refill-requests`, {
      headers: this.getHeaders()
    });
  }

  // Dispensing History
  getDispensingHistory(filters?: {
    patientId?: string;
    medicineId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Observable<DispensingRecord[]> {
    let params = '';
    if (filters) {
      const queryParams = new URLSearchParams();
      if (filters.patientId) queryParams.append('patientId', filters.patientId);
      if (filters.medicineId) queryParams.append('medicineId', filters.medicineId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());
      params = queryParams.toString() ? `?${queryParams.toString()}` : '';
    }

    return this.http.get<DispensingRecord[]>(`${this.apiUrl}/dispensing-history${params}`, {
      headers: this.getHeaders()
    });
  }

  // Medicine Returns and Corrections
  processMedicineReturn(returnData: {
    prescriptionId: string;
    medicineId: string;
    quantityReturned: number;
    reason: string;
    notes?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/returns`, returnData, {
      headers: this.getHeaders()
    });
  }

  correctDispensing(correctionData: {
    dispensingRecordId: string;
    correctionType: 'quantity' | 'medicine' | 'cancel';
    newQuantity?: number;
    newMedicineId?: string;
    reason: string;
    notes?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/corrections`, correctionData, {
      headers: this.getHeaders()
    });
  }

  // Search and Filter
  searchMedicines(query: string): Observable<Medicine[]> {
    return this.http.get<Medicine[]>(`${this.apiUrl}/inventory/search?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders()
    });
  }

  searchPrescriptions(query: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.apiUrl}/prescriptions/search?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders()
    });
  }

  // Integration Methods for Billing and Cashier
  
  // Billing Integration Methods
  createPharmacyBill(prescriptionId: string, medicines: PrescriptionMedicine[]): Observable<any> {
    const billRequest = {
      prescriptionId,
      patientId: '', // Will be populated from prescription data
      medicines: medicines.map(med => ({
        medicineId: med.medicineId,
        medicineName: med.medicineName,
        quantity: med.quantity,
        unitPrice: med.unitPrice,
        totalPrice: med.totalPrice,
        batchNumber: '',
        expiryDate: new Date()
      })),
      totalAmount: medicines.reduce((total, med) => total + med.totalPrice, 0),
      dispensedBy: localStorage.getItem('userId') || 'pharmacist'
    };

    return this.billingIntegration.createPharmacyBill(billRequest);
  }

  getInvoiceForPrescription(prescriptionId: string): Observable<any> {
    return this.billingIntegration.getInvoiceForPrescription(prescriptionId);
  }

  refreshPaymentStatus(prescriptionId: string): Observable<any> {
    return this.billingIntegration.refreshPaymentStatus(prescriptionId);
  }

  // Cashier Integration Methods
  checkCashierAvailability(): Observable<any> {
    return this.cashierIntegration.checkCashierAvailability();
  }

  getPaymentQueuePosition(prescriptionId: string): Observable<any> {
    return this.cashierIntegration.getPaymentQueuePosition(prescriptionId);
  }

  requestUrgentPayment(prescriptionId: string, message: string): Observable<any> {
    return this.cashierIntegration.sendUrgentNotificationToCashier(prescriptionId, message);
  }

  getReceiptForPrescription(prescriptionId: string): Observable<any> {
    return this.cashierIntegration.getReceiptForPrescription(prescriptionId);
  }

  // Medicine Return and Refund Integration
  processMedicineReturn(returnData: {
    prescriptionId: string;
    medicineId: string;
    quantityReturned: number;
    reason: string;
    notes?: string;
  }): Observable<any> {
    // First process the return in pharmacy system
    const returnResult = this.http.post(`${this.apiUrl}/returns`, returnData, {
      headers: this.getHeaders()
    });

    // Then request refund from cashier
    returnResult.subscribe({
      next: (result) => {
        this.requestRefundFromCashier(returnData.prescriptionId, result);
      },
      error: (error) => console.error('Error processing return:', error)
    });

    return returnResult;
  }

  private requestRefundFromCashier(prescriptionId: string, returnResult: any): void {
    const refundRequest = {
      prescriptionId,
      originalPaymentId: returnResult.originalPaymentId,
      refundAmount: returnResult.refundAmount,
      reason: returnResult.reason,
      medicines: returnResult.medicines,
      requestedBy: localStorage.getItem('userId') || 'pharmacist',
      notes: returnResult.notes
    };

    this.cashierIntegration.requestMedicineRefund(refundRequest).subscribe({
      next: () => console.log('Refund request sent to cashier'),
      error: (error) => console.error('Error requesting refund:', error)
    });
  }

  // Real-time Integration Methods
  subscribeToPaymentUpdates(prescriptionIds: string[]): void {
    this.billingIntegration.subscribeToPaymentUpdates(prescriptionIds);
    this.cashierIntegration.subscribeToPaymentUpdates(prescriptionIds);
  }

  unsubscribeFromPaymentUpdates(): void {
    this.billingIntegration.unsubscribeFromPaymentUpdates();
    this.cashierIntegration.unsubscribeFromPaymentUpdates();
  }

  // Get integration observables
  getBillingUpdates(): Observable<any> {
    return this.billingIntegration.paymentStatusUpdates$;
  }

  getCashierNotifications(): Observable<any> {
    return this.cashierIntegration.cashierNotifications$;
  }

  getPaymentResponses(): Observable<any> {
    return this.cashierIntegration.paymentResponses$;
  }

  // Audit Integration
  logIntegratedActivity(activity: string, details: any): void {
    // Log to both billing and cashier systems
    this.billingIntegration.logPharmacyBillingActivity(activity, details).subscribe();
    this.cashierIntegration.logCashierInteraction(activity, details).subscribe();
  }
}