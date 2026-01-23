import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TokenGenerationRequest {
  patientId: string;
  queueId?: string;
  doctorId?: string;
  appointmentId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  type: 'appointment' | 'walk-in' | 'emergency';
  notes?: string;
}

export interface TokenResponse {
  id: string;
  tokenNumber: string;
  queueId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  position: number;
  estimatedWaitTime: number;
  estimatedCallTime: Date;
  status: string;
  priority: string;
  issuedAt: Date;
}

export interface TokenStatus {
  id: string;
  tokenNumber: string;
  status: 'waiting' | 'called' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  position: number;
  estimatedWaitTime: number;
  queueId: string;
  patientName: string;
  doctorName: string;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly apiUrl = `${environment.apiUrl}/tokens`;
  
  private activeTokensSubject = new BehaviorSubject<TokenStatus[]>([]);
  public activeTokens$ = this.activeTokensSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Token Generation
  generateToken(request: TokenGenerationRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/generate`, request);
  }

  generateWalkInToken(patientId: string, doctorId: string, priority: string = 'normal'): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/walk-in`, {
      patientId,
      doctorId,
      priority,
      type: 'walk-in'
    });
  }

  generateEmergencyToken(patientId: string, severity: 'low' | 'medium' | 'high' | 'critical', symptoms: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/emergency`, {
      patientId,
      severity,
      symptoms,
      priority: 'urgent',
      type: 'emergency'
    });
  }

  // Token Retrieval
  getTokenById(tokenId: string): Observable<TokenStatus> {
    return this.http.get<TokenStatus>(`${this.apiUrl}/${tokenId}`);
  }

  getTokenByNumber(tokenNumber: string): Observable<TokenStatus> {
    return this.http.get<TokenStatus>(`${this.apiUrl}/number/${tokenNumber}`);
  }

  getPatientActiveToken(patientId: string): Observable<TokenStatus | null> {
    return this.http.get<TokenStatus | null>(`${this.apiUrl}/patient/${patientId}/active`);
  }

  getActiveTokens(): Observable<TokenStatus[]> {
    return this.http.get<TokenStatus[]>(`${this.apiUrl}/active`);
  }

  getQueueTokens(queueId: string, status?: string): Observable<TokenStatus[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<TokenStatus[]>(`${this.apiUrl}/queue/${queueId}`, { params });
  }

  // Token Status Updates
  updateTokenStatus(tokenId: string, status: string, notes?: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.apiUrl}/${tokenId}/status`, { status, notes });
  }

  callToken(tokenId: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.apiUrl}/${tokenId}/call`, {});
  }

  markTokenInProgress(tokenId: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.apiUrl}/${tokenId}/in-progress`, {});
  }

  completeToken(tokenId: string, notes?: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.apiUrl}/${tokenId}/complete`, { notes });
  }

  cancelToken(tokenId: string, reason: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.apiUrl}/${tokenId}/cancel`, { reason });
  }

  markTokenNoShow(tokenId: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.apiUrl}/${tokenId}/no-show`, {});
  }

  // Token Priority Management
  updateTokenPriority(tokenId: string, priority: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.apiUrl}/${tokenId}/priority`, { priority });
  }

  moveTokenToFront(tokenId: string, reason: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.apiUrl}/${tokenId}/move-front`, { reason });
  }

  // Token Transfer
  transferToken(tokenId: string, newQueueId: string, reason: string): Observable<TokenStatus> {
    return this.http.patch<TokenStatus>(`${this.apiUrl}/${tokenId}/transfer`, {
      newQueueId,
      reason
    });
  }

  // Token Search
  searchTokens(criteria: {
    tokenNumber?: string;
    patientName?: string;
    status?: string;
    queueId?: string;
    date?: Date;
  }): Observable<TokenStatus[]> {
    let params = new HttpParams();
    Object.keys(criteria).forEach(key => {
      const value = criteria[key as keyof typeof criteria];
      if (value) {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<TokenStatus[]>(`${this.apiUrl}/search`, { params });
  }

  // Token Statistics
  getTokenStats(date?: Date): Observable<{
    totalTokens: number;
    completedTokens: number;
    cancelledTokens: number;
    noShowTokens: number;
    averageWaitTime: number;
    averageServiceTime: number;
    byPriority: {
      low: number;
      normal: number;
      high: number;
      urgent: number;
    };
    byType: {
      appointment: number;
      walkIn: number;
      emergency: number;
    };
  }> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date.toISOString().split('T')[0]);
    }
    return this.http.get<{
      totalTokens: number;
      completedTokens: number;
      cancelledTokens: number;
      noShowTokens: number;
      averageWaitTime: number;
      averageServiceTime: number;
      byPriority: {
        low: number;
        normal: number;
        high: number;
        urgent: number;
      };
      byType: {
        appointment: number;
        walkIn: number;
        emergency: number;
      };
    }>(`${this.apiUrl}/stats`, { params });
  }

  // Token History
  getTokenHistory(patientId?: string, startDate?: Date, endDate?: Date): Observable<TokenStatus[]> {
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
    return this.http.get<TokenStatus[]>(`${this.apiUrl}/history`, { params });
  }

  // Token Notifications
  sendTokenNotification(tokenId: string, type: 'called' | 'delayed' | 'cancelled', method: 'sms' | 'email' | 'whatsapp'): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/${tokenId}/notify`, { type, method });
  }

  // Bulk Operations
  bulkUpdateTokens(tokenIds: string[], updates: { status?: string; priority?: string }): Observable<{
    updated: number;
    failed: number;
    errors: string[];
  }> {
    return this.http.put<{
      updated: number;
      failed: number;
      errors: string[];
    }>(`${this.apiUrl}/bulk-update`, { tokenIds, updates });
  }

  bulkCancelTokens(tokenIds: string[], reason: string): Observable<{
    cancelled: number;
    failed: number;
    errors: string[];
  }> {
    return this.http.patch<{
      cancelled: number;
      failed: number;
      errors: string[];
    }>(`${this.apiUrl}/bulk-cancel`, { tokenIds, reason });
  }

  // Token Validation
  validateToken(tokenNumber: string): Observable<{
    valid: boolean;
    token?: TokenStatus;
    error?: string;
  }> {
    return this.http.post<{
      valid: boolean;
      token?: TokenStatus;
      error?: string;
    }>(`${this.apiUrl}/validate`, { tokenNumber });
  }

  // Wait Time Estimation
  getEstimatedWaitTime(tokenId: string): Observable<{
    estimatedWaitTime: number;
    position: number;
    tokensAhead: number;
    averageServiceTime: number;
    estimatedCallTime: Date;
  }> {
    return this.http.get<{
      estimatedWaitTime: number;
      position: number;
      tokensAhead: number;
      averageServiceTime: number;
      estimatedCallTime: Date;
    }>(`${this.apiUrl}/${tokenId}/wait-time`);
  }

  // Token Display Information
  getTokenDisplayInfo(tokenId: string): Observable<{
    tokenNumber: string;
    patientName: string;
    doctorName: string;
    queuePosition: number;
    estimatedWaitTime: number;
    status: string;
    priority: string;
    qrCode?: string;
  }> {
    return this.http.get<{
      tokenNumber: string;
      patientName: string;
      doctorName: string;
      queuePosition: number;
      estimatedWaitTime: number;
      status: string;
      priority: string;
      qrCode?: string;
    }>(`${this.apiUrl}/${tokenId}/display`);
  }

  // Token Printing
  printToken(tokenId: string): Observable<{
    success: boolean;
    printData: any;
  }> {
    return this.http.post<{
      success: boolean;
      printData: any;
    }>(`${this.apiUrl}/${tokenId}/print`, {});
  }

  // Real-time Updates
  subscribeToTokenUpdates(): Observable<TokenStatus> {
    // WebSocket implementation for real-time token updates
    return new Observable(observer => {
      // WebSocket connection logic here
    });
  }

  // Utility Methods
  updateActiveTokens(tokens: TokenStatus[]): void {
    this.activeTokensSubject.next(tokens);
  }

  addActiveToken(token: TokenStatus): void {
    const current = this.activeTokensSubject.value;
    this.activeTokensSubject.next([...current, token]);
  }

  updateTokenInList(updatedToken: TokenStatus): void {
    const current = this.activeTokensSubject.value;
    const index = current.findIndex(token => token.id === updatedToken.id);
    if (index !== -1) {
      current[index] = updatedToken;
      this.activeTokensSubject.next([...current]);
    }
  }

  removeTokenFromList(tokenId: string): void {
    const current = this.activeTokensSubject.value;
    const filtered = current.filter(token => token.id !== tokenId);
    this.activeTokensSubject.next(filtered);
  }

  // Format Helpers
  formatTokenNumber(tokenNumber: string): string {
    return tokenNumber.toUpperCase();
  }

  formatWaitTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'waiting': return 'primary';
      case 'called': return 'accent';
      case 'in-progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'no-show': return 'error';
      default: return 'default';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'low': return 'default';
      case 'normal': return 'primary';
      case 'high': return 'accent';
      case 'urgent': return 'warn';
      default: return 'default';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'waiting': return 'hourglass_empty';
      case 'called': return 'notifications_active';
      case 'in-progress': return 'play_circle';
      case 'completed': return 'check_circle';
      case 'cancelled': return 'cancel';
      case 'no-show': return 'person_off';
      default: return 'help';
    }
  }
}