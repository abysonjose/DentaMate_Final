import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AnalyticsData {
  period: string;
  metrics: {
    totalRevenue: number;
    totalUsers: number;
    totalClinics: number;
    totalAppointments: number;
    averageSessionDuration: number;
    userGrowthRate: number;
    revenueGrowthRate: number;
    churnRate: number;
    customerLifetimeValue: number;
  };
  charts: {
    revenueByMonth: { month: string; revenue: number }[];
    usersByRole: { role: string; count: number }[];
    appointmentsByStatus: { status: string; count: number }[];
    clinicsByPlan: { plan: string; count: number }[];
    geographicDistribution: { region: string; clinics: number; users: number }[];
  };
}

export interface PerformanceMetrics {
  systemUptime: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkLatency: number;
}

export interface UserBehaviorAnalytics {
  mostUsedFeatures: { feature: string; usage: number }[];
  userJourney: { step: string; completionRate: number }[];
  sessionAnalytics: {
    averageDuration: number;
    bounceRate: number;
    pagesPerSession: number;
  };
  deviceAnalytics: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  browserAnalytics: { browser: string; percentage: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly apiUrl = `${environment.apiUrl}/central-admin/analytics`;

  constructor(private http: HttpClient) {}

  // Dashboard Analytics
  getDashboardAnalytics(period: string = '30d'): Observable<AnalyticsData> {
    return this.http.get<AnalyticsData>(`${this.apiUrl}/dashboard?period=${period}`);
  }

  // Revenue Analytics
  getRevenueAnalytics(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/revenue?period=${period}`);
  }

  getRevenueByClinic(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/revenue/by-clinic?period=${period}`);
  }

  getRevenueByPlan(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/revenue/by-plan?period=${period}`);
  }

  getRevenueForecasting(months: number = 6): Observable<any> {
    return this.http.get(`${this.apiUrl}/revenue/forecast?months=${months}`);
  }

  // User Analytics
  getUserAnalytics(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/users?period=${period}`);
  }

  getUserGrowthTrends(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/growth`);
  }

  getUserRetentionAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/retention`);
  }

  getUserBehaviorAnalytics(): Observable<UserBehaviorAnalytics> {
    return this.http.get<UserBehaviorAnalytics>(`${this.apiUrl}/users/behavior`);
  }

  // Clinic Performance Analytics
  getClinicPerformanceAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/clinics/performance`);
  }

  getClinicUtilizationRates(): Observable<any> {
    return this.http.get(`${this.apiUrl}/clinics/utilization`);
  }

  getTopPerformingClinics(limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/clinics/top-performing?limit=${limit}`);
  }

  // Appointment Analytics
  getAppointmentAnalytics(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/appointments?period=${period}`);
  }

  getAppointmentTrends(): Observable<any> {
    return this.http.get(`${this.apiUrl}/appointments/trends`);
  }

  getWaitTimeAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/appointments/wait-times`);
  }

  getNoShowAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/appointments/no-shows`);
  }

  // AI System Analytics
  getAiUsageAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ai/usage`);
  }

  getAiAccuracyMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ai/accuracy`);
  }

  getAiPerformanceMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ai/performance`);
  }

  // System Performance Analytics
  getSystemPerformanceMetrics(): Observable<PerformanceMetrics> {
    return this.http.get<PerformanceMetrics>(`${this.apiUrl}/system/performance`);
  }

  getSystemHealthMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/health`);
  }

  getErrorAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/errors`);
  }

  // Geographic Analytics
  getGeographicAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/geographic`);
  }

  getRegionalPerformance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/geographic/performance`);
  }

  // Subscription Analytics
  getSubscriptionAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/subscriptions`);
  }

  getChurnAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/subscriptions/churn`);
  }

  getLifetimeValueAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/subscriptions/ltv`);
  }

  // Predictive Analytics
  getPredictiveAnalytics(type: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/predictive/${type}`);
  }

  getUserChurnPrediction(): Observable<any> {
    return this.http.get(`${this.apiUrl}/predictive/user-churn`);
  }

  getRevenueForecasting(): Observable<any> {
    return this.http.get(`${this.apiUrl}/predictive/revenue-forecast`);
  }

  getCapacityPrediction(): Observable<any> {
    return this.http.get(`${this.apiUrl}/predictive/capacity`);
  }

  // Custom Reports
  generateCustomReport(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/custom`, config);
  }

  getReportTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reports/templates`);
  }

  saveReportTemplate(template: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/templates`, template);
  }

  // Export Analytics
  exportAnalyticsData(type: string, format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/${type}?format=${format}`, { 
      responseType: 'blob' 
    });
  }

  // Real-time Analytics
  getRealTimeMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/realtime`);
  }

  // Comparative Analytics
  getComparativeAnalytics(period1: string, period2: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/comparative?period1=${period1}&period2=${period2}`);
  }

  // Benchmark Analytics
  getBenchmarkAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/benchmarks`);
  }

  getIndustryBenchmarks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/benchmarks/industry`);
  }
}