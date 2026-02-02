import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface CashierDashboardData {
  summary: {
    totalInvoicesGenerated: number;
    totalPaymentsReceived: number;
    totalAmountCollected: number;
    pendingPayments: number;
    overduePayments: number;
  };
  recentActivities: CashierActivity[];
  paymentMethodBreakdown: {
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  dailyCollections: {
    date: string;
    amount: number;
    count: number;
  }[];
}

export interface CashierActivity {
  id: string;
  type: 'bill_generated' | 'payment_received' | 'invoice_paid';
  description: string;
  amount?: number;
  patientName: string;
  timestamp: Date;
  invoiceNumber?: string;
  paymentMethod?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CashierService {
  private apiUrl = `${environment.apiUrl}/cashier`;

  constructor(private http: HttpClient) {}

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

  getDashboardData(): Observable<CashierDashboardData> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapToDashboardData(response.data || response))
    );
  }

  private mapToDashboardData(data: any): CashierDashboardData {
    return {
      summary: {
        totalInvoicesGenerated: data.summary?.totalInvoicesGenerated || 0,
        totalPaymentsReceived: data.summary?.totalPaymentsReceived || 0,
        totalAmountCollected: data.summary?.totalAmountCollected || 0,
        pendingPayments: data.summary?.pendingPayments || 0,
        overduePayments: data.summary?.overduePayments || 0
      },
      recentActivities: (data.recentActivities || []).map((activity: any) => this.mapToActivity(activity)),
      paymentMethodBreakdown: data.paymentMethodBreakdown || [],
      dailyCollections: data.dailyCollections || []
    };
  }

  private mapToActivity(data: any): CashierActivity {
    return {
      id: data.id,
      type: data.type,
      description: data.description,
      amount: data.amount,
      patientName: data.patientName,
      timestamp: new Date(data.timestamp || data.createdAt),
      invoiceNumber: data.invoiceNumber,
      paymentMethod: data.paymentMethod
    };
  }

  // Quick Stats
  getQuickStats(): Observable<{
    todayCollections: number;
    pendingAmount: number;
    overdueAmount: number;
    totalInvoices: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/quick-stats`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Recent Activities
  getRecentActivities(limit: number = 10): Observable<CashierActivity[]> {
    return this.http.get<any>(`${this.apiUrl}/activities?limit=${limit}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const activities = response.data || response;
        return activities.map((activity: any) => this.mapToActivity(activity));
      })
    );
  }

  // Payment Method Statistics
  getPaymentMethodStats(dateFrom?: string, dateTo?: string): Observable<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }[]> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get<any>(`${this.apiUrl}/payment-method-stats?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Daily Collections
  getDailyCollections(dateFrom?: string, dateTo?: string): Observable<{
    date: string;
    amount: number;
    count: number;
  }[]> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get<any>(`${this.apiUrl}/daily-collections?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Export Data
  exportDashboardData(format: 'pdf' | 'excel' = 'pdf'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/dashboard?format=${format}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // Notifications
  getCashierNotifications(): Observable<{
    id: string;
    type: 'overdue_payment' | 'large_payment' | 'payment_failed';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
    timestamp: Date;
    read: boolean;
  }[]> {
    return this.http.get<any>(`${this.apiUrl}/notifications`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const notifications = response.data || response;
        return notifications.map((notification: any) => ({
          ...notification,
          timestamp: new Date(notification.timestamp || notification.createdAt)
        }));
      })
    );
  }

  // Mark Notification as Read
  markNotificationAsRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/${notificationId}/read`, {}, {
      headers: this.getHeaders()
    });
  }

  // Performance Metrics
  getPerformanceMetrics(period: 'today' | 'week' | 'month' = 'today'): Observable<{
    totalTransactions: number;
    averageTransactionAmount: number;
    successRate: number;
    processingTime: number;
    customerSatisfaction: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/performance?period=${period}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }
}