import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';

export interface QueueToken {
  id: string;
  tokenNumber: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  type: 'appointment' | 'walk-in' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'waiting' | 'called' | 'in-consultation' | 'completed' | 'skipped' | 'no-show';
  checkinTime: Date;
  calledTime?: Date;
  consultationStartTime?: Date;
  consultationEndTime?: Date;
  estimatedWaitTime: number;
  actualWaitTime?: number;
  skipReason?: string;
  notes?: string;
}

export interface QueueSnapshot {
  currentToken: string;
  nextTokens: string[];
  estimatedWaitTime: number;
  status: 'active' | 'paused' | 'emergency';
  totalWaiting: number;
  averageWaitTime: number;
  lastUpdated: Date;
}

export interface QueueStats {
  totalTokensToday: number;
  completedTokens: number;
  currentlyWaiting: number;
  averageConsultationTime: number;
  averageWaitTime: number;
  noShowRate: number;
  emergencyInsertions: number;
}

export interface QueueUpdate {
  type: 'token_added' | 'token_called' | 'token_completed' | 'token_skipped' | 'queue_paused' | 'queue_resumed' | 'emergency_inserted';
  token?: QueueToken;
  queueSnapshot?: Partial<QueueSnapshot>;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorQueueService {
  private apiUrl = `${environment.apiUrl}/token-queue/api`;
  private wsUrl = environment.wsUrl || 'http://localhost:3005';
  private socket: Socket | null = null;
  
  private queueSnapshot$ = new BehaviorSubject<QueueSnapshot>({
    currentToken: '',
    nextTokens: [],
    estimatedWaitTime: 0,
    status: 'active',
    totalWaiting: 0,
    averageWaitTime: 0,
    lastUpdated: new Date()
  });
  private currentToken$ = new BehaviorSubject<QueueToken | null>(null);

  constructor(private http: HttpClient) {
    this.initializeWebSocket();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId');
    const userId = localStorage.getItem('userId');
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'X-User-ID': userId || '',
      'Content-Type': 'application/json'
    });
  }

  private initializeWebSocket(): void {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    this.socket = io(this.wsUrl, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to queue WebSocket');
      this.joinDoctorQueue();
    });

    this.socket.on('queue-updated', (data) => {
      this.handleQueueUpdate(data);
    });

    this.socket.on('token-called', (data) => {
      this.handleTokenCalled(data);
    });

    this.socket.on('queue-status', (data) => {
      this.handleQueueStatus(data);
    });
  }

  private joinDoctorQueue(): void {
    const doctorId = localStorage.getItem('doctorId');
    const branchId = localStorage.getItem('branchId');
    
    if (this.socket && doctorId && branchId) {
      this.socket.emit('join-queue', {
        branchId,
        doctorId,
        queueType: 'doctor'
      });
    }
  }

  private handleQueueUpdate(data: any): void {
    // Update queue snapshot based on WebSocket data
    const currentSnapshot = this.queueSnapshot$.value;
    this.queueSnapshot$.next({
      ...currentSnapshot,
      ...data,
      lastUpdated: new Date()
    });
  }

  private handleTokenCalled(data: any): void {
    if (data.token) {
      this.currentToken$.next(this.mapToQueueToken(data.token));
    }
  }

  private handleQueueStatus(data: any): void {
    this.queueSnapshot$.next({
      currentToken: data.currentToken?.displayToken || '',
      nextTokens: data.nextTokens?.map((t: any) => t.displayToken) || [],
      estimatedWaitTime: data.estimatedWaitTime || 0,
      status: data.status?.toLowerCase() || 'active',
      totalWaiting: data.totalWaiting || 0,
      averageWaitTime: data.averageWaitTime || 0,
      lastUpdated: new Date()
    });
  }

  // Queue Snapshot
  getCurrentQueueSnapshot(): Observable<QueueSnapshot> {
    const doctorId = localStorage.getItem('doctorId');
    const branchId = localStorage.getItem('branchId');
    
    return this.http.get<any>(`${this.apiUrl}/queues/${branchId}/${doctorId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const data = response.data || response;
        return {
          currentToken: data.currentToken?.displayToken || '',
          nextTokens: data.tokens?.filter((t: any) => t.status === 'WAITING')
            .slice(0, 5)
            .map((t: any) => t.displayToken) || [],
          estimatedWaitTime: data.estimatedWaitTime || 0,
          status: data.queue?.status?.toLowerCase() || 'active',
          totalWaiting: data.queueLength || 0,
          averageWaitTime: data.queue?.averageConsultationTime || 0,
          lastUpdated: new Date()
        };
      }),
      catchError(error => {
        console.error('Error fetching queue snapshot:', error);
        return [this.queueSnapshot$.value];
      })
    );
  }

  getQueueSnapshotStream(): Observable<QueueSnapshot> {
    return this.queueSnapshot$.asObservable();
  }

  // Token Management
  getCurrentToken(): Observable<QueueToken | null> {
    const doctorId = localStorage.getItem('doctorId');
    const branchId = localStorage.getItem('branchId');
    
    return this.http.get<any>(`${this.apiUrl}/queues/${branchId}/${doctorId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const data = response.data || response;
        const currentToken = data.currentToken;
        return currentToken ? this.mapToQueueToken(currentToken) : null;
      }),
      catchError(error => {
        console.error('Error fetching current token:', error);
        return [null];
      })
    );
  }

  callNextPatient(): Observable<QueueToken> {
    const doctorId = localStorage.getItem('doctorId');
    const branchId = localStorage.getItem('branchId');
    
    return this.http.post<any>(`${this.apiUrl}/queues/${branchId}/${doctorId}/call-next`, {}, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const token = response.data?.token || response.token;
        if (this.socket) {
          this.socket.emit('call-next-token', { branchId, doctorId });
        }
        return this.mapToQueueToken(token);
      })
    );
  }

  callSpecificToken(tokenId: string): Observable<QueueToken> {
    return this.http.patch<any>(`${this.apiUrl}/tokens/${tokenId}`, {
      status: 'IN_CONSULTATION'
    }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToQueueToken(response.data || response))
    );
  }

  skipToken(tokenId: string, reason: string): Observable<void> {
    if (this.socket) {
      this.socket.emit('skip-token', { tokenId, reason });
    }
    
    return this.http.patch<void>(`${this.apiUrl}/tokens/${tokenId}/skip`, {
      reason
    }, {
      headers: this.getHeaders()
    });
  }

  recallSkippedToken(tokenId: string): Observable<QueueToken> {
    return this.http.patch<any>(`${this.apiUrl}/tokens/${tokenId}`, {
      status: 'WAITING'
    }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToQueueToken(response.data || response))
    );
  }

  markTokenNoShow(tokenId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/tokens/${tokenId}/no-show`, {}, {
      headers: this.getHeaders()
    });
  }

  startConsultation(tokenId: string): Observable<QueueToken> {
    return this.http.patch<any>(`${this.apiUrl}/tokens/${tokenId}`, {
      status: 'IN_CONSULTATION'
    }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToQueueToken(response.data || response))
    );
  }

  completeConsultation(tokenId: string): Observable<QueueToken> {
    return this.http.patch<any>(`${this.apiUrl}/tokens/${tokenId}/complete`, {}, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToQueueToken(response.data || response))
    );
  }

  // Queue Control
  pauseQueue(): Observable<void> {
    const doctorId = localStorage.getItem('doctorId');
    const branchId = localStorage.getItem('branchId');
    
    return this.http.post<void>(`${this.apiUrl}/queues/${branchId}/${doctorId}/pause`, {
      reason: 'Doctor initiated pause'
    }, {
      headers: this.getHeaders()
    });
  }

  resumeQueue(): Observable<void> {
    const doctorId = localStorage.getItem('doctorId');
    const branchId = localStorage.getItem('branchId');
    
    return this.http.post<void>(`${this.apiUrl}/queues/${branchId}/${doctorId}/resume`, {}, {
      headers: this.getHeaders()
    });
  }

  // Queue Information
  getWaitingTokens(): Observable<QueueToken[]> {
    const doctorId = localStorage.getItem('doctorId');
    const branchId = localStorage.getItem('branchId');
    
    return this.http.get<any>(`${this.apiUrl}/queues/${branchId}/${doctorId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const data = response.data || response;
        return data.tokens?.filter((t: any) => t.status === 'WAITING')
          .map((t: any) => this.mapToQueueToken(t)) || [];
      })
    );
  }

  getSkippedTokens(): Observable<QueueToken[]> {
    const doctorId = localStorage.getItem('doctorId');
    const branchId = localStorage.getItem('branchId');
    
    return this.http.get<any>(`${this.apiUrl}/queues/${branchId}/${doctorId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const data = response.data || response;
        return data.tokens?.filter((t: any) => t.status === 'SKIPPED')
          .map((t: any) => this.mapToQueueToken(t)) || [];
      })
    );
  }

  getCompletedTokens(date?: string): Observable<QueueToken[]> {
    const doctorId = localStorage.getItem('doctorId');
    const branchId = localStorage.getItem('branchId');
    
    return this.http.get<any>(`${this.apiUrl}/queues/${branchId}/${doctorId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const data = response.data || response;
        return data.tokens?.filter((t: any) => t.status === 'COMPLETED')
          .map((t: any) => this.mapToQueueToken(t)) || [];
      })
    );
  }

  private mapToQueueToken(data: any): QueueToken {
    return {
      id: data._id || data.id,
      tokenNumber: data.displayToken || data.tokenNumber,
      patientId: data.patientId,
      patientName: data.patientName,
      appointmentId: data.appointmentId,
      type: this.mapTokenType(data.tokenType),
      priority: this.mapPriority(data.priority),
      status: this.mapTokenStatus(data.status),
      checkinTime: data.checkedInAt ? new Date(data.checkedInAt) : new Date(),
      calledTime: data.calledAt ? new Date(data.calledAt) : undefined,
      consultationStartTime: data.consultationStartedAt ? new Date(data.consultationStartedAt) : undefined,
      consultationEndTime: data.consultationEndedAt ? new Date(data.consultationEndedAt) : undefined,
      estimatedWaitTime: data.estimatedWaitTime || 0,
      actualWaitTime: data.actualWaitTime,
      skipReason: data.skipReason,
      notes: data.notes
    };
  }

  private mapTokenType(type: string): 'appointment' | 'walk-in' | 'emergency' {
    switch (type?.toUpperCase()) {
      case 'APPOINTMENT': return 'appointment';
      case 'WALK_IN': return 'walk-in';
      case 'PRIORITY': return 'emergency';
      default: return 'appointment';
    }
  }

  private mapPriority(priority: any): 'low' | 'medium' | 'high' | 'urgent' {
    if (typeof priority === 'number') {
      if (priority >= 4) return 'urgent';
      if (priority >= 3) return 'high';
      if (priority >= 2) return 'medium';
      return 'low';
    }
    return priority?.toLowerCase() || 'medium';
  }

  private mapTokenStatus(status: string): 'waiting' | 'called' | 'in-consultation' | 'completed' | 'skipped' | 'no-show' {
    switch (status?.toUpperCase()) {
      case 'WAITING': return 'waiting';
      case 'CALLED': return 'called';
      case 'IN_CONSULTATION': return 'in-consultation';
      case 'COMPLETED': return 'completed';
      case 'SKIPPED': return 'skipped';
      case 'NO_SHOW': return 'no-show';
      default: return 'waiting';
    }
  }

  // Statistics
  getQueueStats(): Observable<QueueStats> {
    return this.http.get<QueueStats>(`${this.apiUrl}/stats`);
  }

  getDailyQueueStats(date: string): Observable<QueueStats> {
    return this.http.get<QueueStats>(`${this.apiUrl}/stats/daily/${date}`);
  }

  getWeeklyQueueStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/weekly`);
  }

  getMonthlyQueueStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/monthly`);
  }

  // Wait Time Estimation
  estimateWaitTime(position: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/estimate-wait-time/${position}`);
  }

  updateWaitTimeEstimates(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/update-wait-estimates`, {});
  }

  // Real-time Updates
  getQueueUpdates(): Observable<QueueUpdate> {
    // WebSocket implementation for real-time queue updates
    return new Observable(observer => {
      // WebSocket connection logic here
      // This would listen for queue changes, new tokens, status updates, etc.
      
      // Example WebSocket setup (pseudo-code):
      // const socket = io(`${environment.wsUrl}/doctor-queue`);
      // socket.on('queue-update', (update: QueueUpdate) => {
      //   observer.next(update);
      // });
      // 
      // return () => socket.disconnect();
    });
  }

  // Token Search and Filter
  searchTokens(query: string, filters?: {
    status?: string;
    type?: string;
    priority?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<QueueToken[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<QueueToken[]>(`${this.apiUrl}/search?${params.toString()}`);
  }

  // Queue Configuration
  getQueueSettings(): Observable<{
    maxWaitTime: number;
    consultationDuration: number;
    breakDuration: number;
    emergencySlots: number;
    autoCallNext: boolean;
  }> {
    return this.http.get(`${this.apiUrl}/settings`);
  }

  updateQueueSettings(settings: {
    maxWaitTime?: number;
    consultationDuration?: number;
    breakDuration?: number;
    emergencySlots?: number;
    autoCallNext?: boolean;
  }): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/settings`, settings);
  }

  // Integration with Appointment System
  linkTokenToAppointment(tokenId: string, appointmentId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/link-appointment`, {
      tokenId,
      appointmentId
    });
  }

  getTokenByAppointment(appointmentId: string): Observable<QueueToken | null> {
    return this.http.get<QueueToken | null>(`${this.apiUrl}/by-appointment/${appointmentId}`);
  }

  // Bulk Operations
  bulkUpdateTokens(tokenIds: string[], updates: Partial<QueueToken>): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk-update`, {
      tokenIds,
      updates
    });
  }

  // Queue History
  getQueueHistory(date: string): Observable<QueueToken[]> {
    return this.http.get<QueueToken[]>(`${this.apiUrl}/history/${date}`);
  }

  exportQueueData(dateFrom: string, dateTo: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export`, {
      params: { dateFrom, dateTo },
      responseType: 'blob'
    });
  }
}