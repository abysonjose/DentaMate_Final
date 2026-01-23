import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Queue {
  id: string;
  doctorId: string;
  doctorName: string;
  departmentId: string;
  departmentName: string;
  branchId: string;
  status: 'active' | 'paused' | 'closed';
  currentToken?: string;
  nextToken?: string;
  totalTokens: number;
  waitingCount: number;
  averageWaitTime: number;
  estimatedWaitTime: number;
  lastUpdated: Date;
}

export interface Token {
  id: string;
  tokenNumber: string;
  queueId: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  status: 'waiting' | 'called' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  issuedAt: Date;
  calledAt?: Date;
  completedAt?: Date;
  estimatedCallTime?: Date;
  position: number;
  waitTime?: number;
  checkInMethod: 'qr' | 'nfc' | 'manual' | 'walk-in';
}

export interface QueueUpdate {
  queueId: string;
  type: 'token_issued' | 'token_called' | 'token_completed' | 'queue_status_changed' | 'doctor_status_changed';
  data: any;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class QueueService {
  private readonly apiUrl = `${environment.apiUrl}/queues`;
  private readonly wsUrl = `${environment.wsUrl}/queues`;
  
  private queuesSubject = new BehaviorSubject<Queue[]>([]);
  public queues$ = this.queuesSubject.asObservable();
  
  private queueUpdatesSubject = new Subject<QueueUpdate>();
  public queueUpdates$ = this.queueUpdatesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Queue Management
  getCurrentQueues(): Observable<Queue[]> {
    return this.http.get<Queue[]>(`${this.apiUrl}/current`);
  }

  getQueueById(queueId: string): Observable<Queue> {
    return this.http.get<Queue>(`${this.apiUrl}/${queueId}`);
  }

  getDoctorQueue(doctorId: string): Observable<Queue> {
    return this.http.get<Queue>(`${this.apiUrl}/doctor/${doctorId}`);
  }

  // Token Management
  generateToken(queueId: string, patientId: string, appointmentId?: string, priority: string = 'normal'): Observable<Token> {
    return this.http.post<Token>(`${this.apiUrl}/${queueId}/tokens`, {
      patientId,
      appointmentId,
      priority
    });
  }

  generateWalkInToken(doctorId: string, patientId: string, priority: string = 'normal'): Observable<{
    token: Token;
    queue: Queue;
    estimatedWaitTime: number;
  }> {
    return this.http.post<{
      token: Token;
      queue: Queue;
      estimatedWaitTime: number;
    }>(`${this.apiUrl}/walk-in-token`, {
      doctorId,
      patientId,
      priority
    });
  }

  getQueueTokens(queueId: string, status?: string): Observable<Token[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Token[]>(`${this.apiUrl}/${queueId}/tokens`, { params });
  }

  getTokenById(tokenId: string): Observable<Token> {
    return this.http.get<Token>(`${this.apiUrl}/tokens/${tokenId}`);
  }

  getPatientToken(patientId: string, queueId?: string): Observable<Token | null> {
    let params = new HttpParams().set('patientId', patientId);
    if (queueId) {
      params = params.set('queueId', queueId);
    }
    return this.http.get<Token | null>(`${this.apiUrl}/patient-token`, { params });
  }

  // Token Status Updates
  callNextToken(queueId: string): Observable<{
    calledToken: Token;
    nextToken?: Token;
    queueStatus: Queue;
  }> {
    return this.http.post<{
      calledToken: Token;
      nextToken?: Token;
      queueStatus: Queue;
    }>(`${this.apiUrl}/${queueId}/call-next`, {});
  }

  callSpecificToken(tokenId: string): Observable<Token> {
    return this.http.patch<Token>(`${this.apiUrl}/tokens/${tokenId}/call`, {});
  }

  markTokenInProgress(tokenId: string): Observable<Token> {
    return this.http.patch<Token>(`${this.apiUrl}/tokens/${tokenId}/in-progress`, {});
  }

  completeToken(tokenId: string, notes?: string): Observable<Token> {
    return this.http.patch<Token>(`${this.apiUrl}/tokens/${tokenId}/complete`, { notes });
  }

  cancelToken(tokenId: string, reason: string): Observable<Token> {
    return this.http.patch<Token>(`${this.apiUrl}/tokens/${tokenId}/cancel`, { reason });
  }

  markTokenNoShow(tokenId: string): Observable<Token> {
    return this.http.patch<Token>(`${this.apiUrl}/tokens/${tokenId}/no-show`, {});
  }

  // Queue Status Management
  pauseQueue(queueId: string, reason?: string): Observable<Queue> {
    return this.http.patch<Queue>(`${this.apiUrl}/${queueId}/pause`, { reason });
  }

  resumeQueue(queueId: string): Observable<Queue> {
    return this.http.patch<Queue>(`${this.apiUrl}/${queueId}/resume`, {});
  }

  closeQueue(queueId: string): Observable<Queue> {
    return this.http.patch<Queue>(`${this.apiUrl}/${queueId}/close`, {});
  }

  // Queue Statistics
  getQueueStats(queueId: string, date?: Date): Observable<{
    totalTokens: number;
    completedTokens: number;
    cancelledTokens: number;
    noShowTokens: number;
    averageWaitTime: number;
    averageServiceTime: number;
    peakHours: { hour: number; tokenCount: number }[];
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
      peakHours: { hour: number; tokenCount: number }[];
    }>(`${this.apiUrl}/${queueId}/stats`, { params });
  }

  getBranchQueueStats(branchId: string, date?: Date): Observable<{
    totalQueues: number;
    activeQueues: number;
    totalTokens: number;
    averageWaitTime: number;
    queueEfficiency: number;
  }> {
    let params = new HttpParams().set('branchId', branchId);
    if (date) {
      params = params.set('date', date.toISOString().split('T')[0]);
    }
    return this.http.get<{
      totalQueues: number;
      activeQueues: number;
      totalTokens: number;
      averageWaitTime: number;
      queueEfficiency: number;
    }>(`${this.apiUrl}/branch-stats`, { params });
  }

  // Wait Time Estimation
  getEstimatedWaitTime(queueId: string, position?: number): Observable<{
    estimatedWaitTime: number;
    position: number;
    tokensAhead: number;
    averageServiceTime: number;
  }> {
    let params = new HttpParams();
    if (position) {
      params = params.set('position', position.toString());
    }
    return this.http.get<{
      estimatedWaitTime: number;
      position: number;
      tokensAhead: number;
      averageServiceTime: number;
    }>(`${this.apiUrl}/${queueId}/wait-time`, { params });
  }

  // Queue Display Management
  getQueueDisplayData(queueId: string): Observable<{
    currentToken: string;
    nextTokens: string[];
    waitingCount: number;
    averageWaitTime: number;
    doctorStatus: string;
    announcements: string[];
  }> {
    return this.http.get<{
      currentToken: string;
      nextTokens: string[];
      waitingCount: number;
      averageWaitTime: number;
      doctorStatus: string;
      announcements: string[];
    }>(`${this.apiUrl}/${queueId}/display`);
  }

  // Token Search and Filtering
  searchTokens(criteria: {
    patientName?: string;
    tokenNumber?: string;
    queueId?: string;
    status?: string;
    date?: Date;
  }): Observable<Token[]> {
    let params = new HttpParams();
    Object.keys(criteria).forEach(key => {
      const value = criteria[key as keyof typeof criteria];
      if (value) {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<Token[]>(`${this.apiUrl}/tokens/search`, { params });
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
    }>(`${this.apiUrl}/tokens/bulk-update`, {
      tokenIds,
      updates
    });
  }

  // Queue Notifications
  sendTokenNotification(tokenId: string, type: 'called' | 'delayed' | 'cancelled', method: 'sms' | 'email' | 'whatsapp'): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/tokens/${tokenId}/notify`, { type, method });
  }

  // Queue Announcements
  makeQueueAnnouncement(queueId: string, message: string, type: 'info' | 'warning' | 'urgent'): Observable<{
    success: boolean;
    announcementId: string;
  }> {
    return this.http.post<{
      success: boolean;
      announcementId: string;
    }>(`${this.apiUrl}/${queueId}/announce`, { message, type });
  }

  // Real-time Updates
  subscribeToQueueUpdates(): void {
    // WebSocket implementation for real-time queue updates
    // This would connect to the WebSocket server and listen for queue events
  }

  getQueueUpdates(): Observable<QueueUpdate> {
    return this.queueUpdatesSubject.asObservable();
  }

  // Emergency Queue Management
  createEmergencyToken(patientId: string, severity: 'low' | 'medium' | 'high' | 'critical', symptoms: string): Observable<{
    token: Token;
    queue: Queue;
    priorityPosition: number;
  }> {
    return this.http.post<{
      token: Token;
      queue: Queue;
      priorityPosition: number;
    }>(`${this.apiUrl}/emergency-token`, {
      patientId,
      severity,
      symptoms
    });
  }

  // Queue Optimization
  optimizeQueue(queueId: string): Observable<{
    reorderedTokens: Token[];
    estimatedTimeReduction: number;
    recommendations: string[];
  }> {
    return this.http.post<{
      reorderedTokens: Token[];
      estimatedTimeReduction: number;
      recommendations: string[];
    }>(`${this.apiUrl}/${queueId}/optimize`, {});
  }

  // Historical Data
  getQueueHistory(queueId: string, startDate: Date, endDate: Date): Observable<{
    dailyStats: Array<{
      date: Date;
      totalTokens: number;
      averageWaitTime: number;
      efficiency: number;
    }>;
    trends: {
      waitTimeTrend: 'improving' | 'stable' | 'declining';
      volumeTrend: 'increasing' | 'stable' | 'decreasing';
    };
  }> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    
    return this.http.get<{
      dailyStats: Array<{
        date: Date;
        totalTokens: number;
        averageWaitTime: number;
        efficiency: number;
      }>;
      trends: {
        waitTimeTrend: 'improving' | 'stable' | 'declining';
        volumeTrend: 'increasing' | 'stable' | 'decreasing';
      };
    }>(`${this.apiUrl}/${queueId}/history`, { params });
  }

  // Utility Methods
  updateQueues(queues: Queue[]): void {
    this.queuesSubject.next(queues);
  }

  updateQueue(updatedQueue: Queue): void {
    const current = this.queuesSubject.value;
    const index = current.findIndex(q => q.id === updatedQueue.id);
    if (index !== -1) {
      current[index] = updatedQueue;
      this.queuesSubject.next([...current]);
    }
  }

  emitQueueUpdate(update: QueueUpdate): void {
    this.queueUpdatesSubject.next(update);
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

  getQueueStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'closed': return 'error';
      default: return 'default';
    }
  }

  getTokenStatusColor(status: string): string {
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
}