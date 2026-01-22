import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface QueueItem {
  id: string;
  tokenNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  appointmentId?: string;
  queueType: 'appointment' | 'walk-in' | 'emergency';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  status: 'waiting' | 'called' | 'in-consultation' | 'completed' | 'cancelled';
  checkinTime: Date;
  estimatedWaitTime: number;
  actualWaitTime?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchQueueService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin/queue`;

  constructor(private http: HttpClient) {}

  getCurrentQueue(): Observable<QueueItem[]> {
    return this.http.get<QueueItem[]>(`${this.apiUrl}/current`);
  }

  getQueueByDepartment(department: string): Observable<QueueItem[]> {
    return this.http.get<QueueItem[]>(`${this.apiUrl}/department/${encodeURIComponent(department)}`);
  }

  getQueueByDoctor(doctorId: string): Observable<QueueItem[]> {
    return this.http.get<QueueItem[]>(`${this.apiUrl}/doctor/${doctorId}`);
  }

  pauseQueue(queueId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${queueId}/pause`, {});
  }

  resumeQueue(queueId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${queueId}/resume`, {});
  }

  getQueueAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics`);
  }

  getWaitTimeAnalytics(period: string = '7d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/wait-times?period=${period}`);
  }
}