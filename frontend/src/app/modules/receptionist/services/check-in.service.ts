import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CheckInRequest {
  patientId: string;
  appointmentId?: string;
  checkInMethod: 'qr' | 'nfc' | 'manual';
  branchId: string;
  notes?: string;
}

export interface CheckInResponse {
  success: boolean;
  tokenNumber?: string;
  queuePosition?: number;
  estimatedWaitTime?: number;
  message: string;
  checkInId: string;
}

export interface PendingCheckIn {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  appointmentTime?: Date;
  doctorName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  checkInTime: Date;
  tokenNumber?: string;
  queueId?: string;
}

export interface QRCodeData {
  patientId: string;
  appointmentId?: string;
  branchId: string;
  timestamp: number;
  signature: string;
}

@Injectable({
  providedIn: 'root'
})
export class CheckInService {
  private readonly apiUrl = `${environment.apiUrl}/check-in`;
  
  private pendingCheckInsSubject = new BehaviorSubject<PendingCheckIn[]>([]);
  public pendingCheckIns$ = this.pendingCheckInsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Manual Check-In
  checkInPatient(request: CheckInRequest): Observable<CheckInResponse> {
    return this.http.post<CheckInResponse>(`${this.apiUrl}/manual`, request);
  }

  // QR Code Check-In
  checkInWithQRCode(qrData: string): Observable<CheckInResponse> {
    return this.http.post<CheckInResponse>(`${this.apiUrl}/qr`, { qrData });
  }

  // NFC Check-In
  checkInWithNFC(nfcData: string): Observable<CheckInResponse> {
    return this.http.post<CheckInResponse>(`${this.apiUrl}/nfc`, { nfcData });
  }

  // Validate Check-In Eligibility
  validateCheckInEligibility(patientId: string, appointmentId?: string): Observable<{
    eligible: boolean;
    reason?: string;
    appointment?: any;
    patient?: any;
  }> {
    let params = new HttpParams().set('patientId', patientId);
    if (appointmentId) {
      params = params.set('appointmentId', appointmentId);
    }
    return this.http.get<{
      eligible: boolean;
      reason?: string;
      appointment?: any;
      patient?: any;
    }>(`${this.apiUrl}/validate`, { params });
  }

  // Get Pending Check-Ins
  getPendingCheckIns(): Observable<PendingCheckIn[]> {
    return this.http.get<PendingCheckIn[]>(`${this.apiUrl}/pending`);
  }

  // Update Pending Check-In Status
  updateCheckInStatus(checkInId: string, status: string, notes?: string): Observable<PendingCheckIn> {
    return this.http.patch<PendingCheckIn>(`${this.apiUrl}/${checkInId}/status`, { status, notes });
  }

  // Cancel Check-In
  cancelCheckIn(checkInId: string, reason: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${checkInId}`, {
      body: { reason }
    });
  }

  // Bulk Check-In Operations
  bulkCheckIn(requests: CheckInRequest[]): Observable<{
    successful: CheckInResponse[];
    failed: { request: CheckInRequest; error: string }[];
  }> {
    return this.http.post<{
      successful: CheckInResponse[];
      failed: { request: CheckInRequest; error: string }[];
    }>(`${this.apiUrl}/bulk`, { requests });
  }

  // Check-In History
  getCheckInHistory(patientId?: string, startDate?: Date, endDate?: Date): Observable<any[]> {
    let params = new HttpParams();
    if (patientId) {
      params = params.set('patientId', patientId);
    }
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<any[]>(`${this.apiUrl}/history`, { params });
  }

  // QR Code Generation and Validation
  generateQRCode(patientId: string, appointmentId?: string): Observable<{
    qrCode: string;
    qrCodeUrl: string;
    expiresAt: Date;
  }> {
    return this.http.post<{
      qrCode: string;
      qrCodeUrl: string;
      expiresAt: Date;
    }>(`${this.apiUrl}/generate-qr`, { patientId, appointmentId });
  }

  validateQRCode(qrData: string): Observable<{
    valid: boolean;
    patientId?: string;
    appointmentId?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    return this.http.post<{
      valid: boolean;
      patientId?: string;
      appointmentId?: string;
      expiresAt?: Date;
      error?: string;
    }>(`${this.apiUrl}/validate-qr`, { qrData });
  }

  // NFC Card Management
  registerNFCCard(patientId: string, nfcId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/register-nfc`, {
      patientId,
      nfcId
    });
  }

  validateNFCCard(nfcId: string): Observable<{
    valid: boolean;
    patientId?: string;
    patientName?: string;
    error?: string;
  }> {
    return this.http.post<{
      valid: boolean;
      patientId?: string;
      patientName?: string;
      error?: string;
    }>(`${this.apiUrl}/validate-nfc`, { nfcId });
  }

  // Check-In Statistics
  getCheckInStats(date?: Date): Observable<{
    totalCheckIns: number;
    qrCheckIns: number;
    nfcCheckIns: number;
    manualCheckIns: number;
    averageCheckInTime: number;
    peakHours: { hour: number; count: number }[];
  }> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date.toISOString().split('T')[0]);
    }
    return this.http.get<{
      totalCheckIns: number;
      qrCheckIns: number;
      nfcCheckIns: number;
      manualCheckIns: number;
      averageCheckInTime: number;
      peakHours: { hour: number; count: number }[];
    }>(`${this.apiUrl}/stats`, { params });
  }

  // Duplicate Check-In Prevention
  checkForDuplicateCheckIn(patientId: string, appointmentId?: string): Observable<{
    isDuplicate: boolean;
    existingCheckIn?: PendingCheckIn;
  }> {
    let params = new HttpParams().set('patientId', patientId);
    if (appointmentId) {
      params = params.set('appointmentId', appointmentId);
    }
    return this.http.get<{
      isDuplicate: boolean;
      existingCheckIn?: PendingCheckIn;
    }>(`${this.apiUrl}/check-duplicate`, { params });
  }

  // Emergency Check-In
  emergencyCheckIn(patientId: string, reason: string): Observable<CheckInResponse> {
    return this.http.post<CheckInResponse>(`${this.apiUrl}/emergency`, {
      patientId,
      reason,
      priority: 'high'
    });
  }

  // Check-In Notifications
  sendCheckInConfirmation(checkInId: string, method: 'sms' | 'email' | 'whatsapp'): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/${checkInId}/notify`, { method });
  }

  // Real-time Updates
  subscribeToCheckInUpdates(): Observable<PendingCheckIn> {
    // WebSocket implementation for real-time check-in updates
    // This would be implemented based on your WebSocket setup
    return new Observable(observer => {
      // WebSocket connection logic here
    });
  }

  // Utility Methods
  updatePendingCheckIns(checkIns: PendingCheckIn[]): void {
    this.pendingCheckInsSubject.next(checkIns);
  }

  addPendingCheckIn(checkIn: PendingCheckIn): void {
    const current = this.pendingCheckInsSubject.value;
    this.pendingCheckInsSubject.next([checkIn, ...current]);
  }

  removePendingCheckIn(checkInId: string): void {
    const current = this.pendingCheckInsSubject.value;
    const filtered = current.filter(checkIn => checkIn.id !== checkInId);
    this.pendingCheckInsSubject.next(filtered);
  }

  // Check-In Time Tracking
  getAverageCheckInTime(): Observable<{
    averageTime: number;
    byMethod: {
      qr: number;
      nfc: number;
      manual: number;
    };
  }> {
    return this.http.get<{
      averageTime: number;
      byMethod: {
        qr: number;
        nfc: number;
        manual: number;
      };
    }>(`${this.apiUrl}/metrics/time`);
  }

  // Check-In Queue Integration
  getQueuePositionAfterCheckIn(checkInId: string): Observable<{
    queueId: string;
    position: number;
    estimatedWaitTime: number;
    doctorName: string;
  }> {
    return this.http.get<{
      queueId: string;
      position: number;
      estimatedWaitTime: number;
      doctorName: string;
    }>(`${this.apiUrl}/${checkInId}/queue-position`);
  }
}