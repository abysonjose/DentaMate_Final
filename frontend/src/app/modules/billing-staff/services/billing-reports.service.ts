import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DailyBillingReport {
  date: Date;
  billsGenerated: number;
  totalRevenue: number;
  paymentsReceived: number;
  pendingPayments: number;
  paymentModeBreakdown: PaymentModeBreakdown[];
  topServices: ServiceRevenue[];
}

export interface PaymentModeBreakdown {
  paymentMode: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface ServiceRevenue {
  serviceName: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface PendingPaymentReport {
  totalPendingAmount: number;
  totalPendingBills: number;
  overdueAmount: number;
  overdueBills: number;
  pendingPayments: PendingPaymentItem[];
}

export interface PendingPaymentItem {
  billId: string;
  billNumber: string;
  patientName: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BillingAnalytics {
  totalRevenue: number;
  averageBillAmount: number;
  totalBills: number;
  collectionRate: number;
  revenueGrowth: number;
  monthlyTrend: MonthlyTrend[];
  paymentModeDistribution: PaymentModeBreakdown[];
  serviceWiseRevenue: ServiceRevenue[];
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  bills: number;
  averageAmount: number;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  paymentMode?: string;
  serviceCategory?: string;
  staffId?: string;
  patientId?: string;
}

export interface ExportOptions {
  format: 'PDF' | 'CSV' | 'EXCEL';
  includeCharts?: boolean;
  includeDetails?: boolean;
  template?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillingReportsService {
  private apiUrl = `${environment.apiUrl}/billing/reports`;

  constructor(private http: HttpClient) {}

  // Daily Reports
  getDailyBillingReport(date?: Date): Observable<DailyBillingReport> {
    const params = date ? new HttpParams().set('date', date.toISOString()) : new HttpParams();
    return this.http.get<DailyBillingReport>(`${this.apiUrl}/daily`, { params });
  }

  getDailyReportRange(startDate: Date, endDate: Date): Observable<DailyBillingReport[]> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get<DailyBillingReport[]>(`${this.apiUrl}/daily/range`, { params });
  }

  // Payment Mode Reports
  getPaymentModeWiseReport(filters?: ReportFilters): Observable<PaymentModeBreakdown[]> {
    let params = new HttpParams();
    if (filters) {
      params = this.buildFilterParams(params, filters);
    }
    return this.http.get<PaymentModeBreakdown[]>(`${this.apiUrl}/payment-mode-wise`, { params });
  }

  getPaymentModeComparison(startDate: Date, endDate: Date): Observable<any> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get(`${this.apiUrl}/payment-mode-comparison`, { params });
  }

  // Pending Payment Reports
  getPendingPaymentReport(): Observable<PendingPaymentReport> {
    return this.http.get<PendingPaymentReport>(`${this.apiUrl}/pending-payments`);
  }

  getOverduePaymentReport(): Observable<PendingPaymentItem[]> {
    return this.http.get<PendingPaymentItem[]>(`${this.apiUrl}/overdue-payments`);
  }

  getAgingReport(): Observable<any> {
    return this.http.get(`${this.apiUrl}/aging-analysis`);
  }

  // Revenue and Analytics Reports
  getBillingAnalytics(filters?: ReportFilters): Observable<BillingAnalytics> {
    let params = new HttpParams();
    if (filters) {
      params = this.buildFilterParams(params, filters);
    }
    return this.http.get<BillingAnalytics>(`${this.apiUrl}/analytics`, { params });
  }

  getRevenueReport(startDate: Date, endDate: Date): Observable<any> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get(`${this.apiUrl}/revenue`, { params });
  }

  getMonthlyRevenueReport(year: number): Observable<MonthlyTrend[]> {
    const params = new HttpParams().set('year', year.toString());
    return this.http.get<MonthlyTrend[]>(`${this.apiUrl}/monthly-revenue`, { params });
  }

  // Service-wise Reports
  getServiceWiseReport(filters?: ReportFilters): Observable<ServiceRevenue[]> {
    let params = new HttpParams();
    if (filters) {
      params = this.buildFilterParams(params, filters);
    }
    return this.http.get<ServiceRevenue[]>(`${this.apiUrl}/service-wise`, { params });
  }

  getTopServicesReport(limit: number = 10): Observable<ServiceRevenue[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ServiceRevenue[]>(`${this.apiUrl}/top-services`, { params });
  }

  // Staff Performance Reports
  getStaffPerformanceReport(filters?: ReportFilters): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      params = this.buildFilterParams(params, filters);
    }
    return this.http.get(`${this.apiUrl}/staff-performance`, { params });
  }

  getBillingStaffReport(staffId: string, startDate: Date, endDate: Date): Observable<any> {
    const params = new HttpParams()
      .set('staffId', staffId)
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());
    return this.http.get(`${this.apiUrl}/staff/${staffId}`, { params });
  }

  // Export Reports
  exportDailyReport(date: Date, options: ExportOptions): Observable<Blob> {
    const params = new HttpParams()
      .set('date', date.toISOString())
      .set('format', options.format);
    
    return this.http.get(`${this.apiUrl}/export/daily`, {
      params,
      responseType: 'blob'
    });
  }

  exportPaymentModeReport(filters: ReportFilters, options: ExportOptions): Observable<Blob> {
    let params = this.buildFilterParams(new HttpParams(), filters);
    params = params.set('format', options.format);
    
    return this.http.get(`${this.apiUrl}/export/payment-mode-wise`, {
      params,
      responseType: 'blob'
    });
  }

  exportPendingPaymentReport(options: ExportOptions): Observable<Blob> {
    const params = new HttpParams().set('format', options.format);
    
    return this.http.get(`${this.apiUrl}/export/pending-payments`, {
      params,
      responseType: 'blob'
    });
  }

  exportCustomReport(reportType: string, filters: ReportFilters, options: ExportOptions): Observable<Blob> {
    let params = this.buildFilterParams(new HttpParams(), filters);
    params = params.set('reportType', reportType).set('format', options.format);
    
    return this.http.get(`${this.apiUrl}/export/custom`, {
      params,
      responseType: 'blob'
    });
  }

  // Report Scheduling
  scheduleReport(reportConfig: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/schedule`, reportConfig);
  }

  getScheduledReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/scheduled`);
  }

  // Utility Methods
  private buildFilterParams(params: HttpParams, filters: ReportFilters): HttpParams {
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ReportFilters];
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          params = params.set(key, value.toISOString());
        } else {
          params = params.set(key, value.toString());
        }
      }
    });
    return params;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  getPaymentModeColor(mode: string): string {
    const colors = {
      'CASH': '#4caf50',
      'UPI': '#2196f3',
      'CARD': '#ff9800',
      'WALLET': '#9c27b0',
      'BANK_TRANSFER': '#607d8b'
    };
    return colors[mode as keyof typeof colors] || '#9e9e9e';
  }

  getPriorityColor(priority: string): string {
    const colors = {
      'HIGH': '#f44336',
      'MEDIUM': '#ff9800',
      'LOW': '#4caf50'
    };
    return colors[priority as keyof typeof colors] || '#9e9e9e';
  }

  downloadReport(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  generateReportFilename(reportType: string, format: string, date?: Date): string {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return `${reportType}-report-${dateStr}.${format.toLowerCase()}`;
  }

  validateDateRange(startDate: Date, endDate: Date): string[] {
    const errors: string[] = [];

    if (startDate > endDate) {
      errors.push('Start date cannot be after end date');
    }

    const maxRange = 365; // days
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxRange) {
      errors.push(`Date range cannot exceed ${maxRange} days`);
    }

    return errors;
  }

  getDefaultDateRange(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    return { startDate, endDate };
  }
}