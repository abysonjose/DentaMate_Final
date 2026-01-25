import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SupportStaffIntegrationService } from '../../../shared/services/support-staff-integration.service';

export interface TenantSupportStaffMetrics {
  tenantId: string;
  tenantName: string;
  totalBranches: number;
  totalSupportStaff: number;
  staffByRole: {
    housekeeping: number;
    security: number;
    attendant: number;
  };
  averageUtilization: number;
  totalTasksCompleted: number;
  averageTaskCompletionTime: number;
  qualityScore: number;
  costPerBranch: number;
  period: string;
}

export interface CrossBranchAnalytics {
  tenantId: string;
  period: string;
  branches: {
    branchId: string;
    branchName: string;
    staffCount: number;
    utilization: number;
    efficiency: number;
    qualityScore: number;
    costEfficiency: number;
    incidentCount: number;
  }[];
  benchmarks: {
    averageUtilization: number;
    averageEfficiency: number;
    averageQualityScore: number;
    averageCostEfficiency: number;
  };
}

export interface SupportStaffTrends {
  tenantId: string;
  timeframe: string;
  dataPoints: {
    date: Date;
    staffCount: number;
    utilization: number;
    taskCompletion: number;
    qualityScore: number;
    costs: number;
    incidents: number;
  }[];
  predictions: {
    nextPeriodUtilization: number;
    staffingNeeds: number;
    budgetProjection: number;
  };
}

export interface SupportStaffBenchmarking {
  tenantId: string;
  industryBenchmarks: {
    averageStaffPerBed: number;
    averageUtilization: number;
    averageQualityScore: number;
    averageCostPerStaff: number;
  };
  tenantPerformance: {
    staffPerBed: number;
    utilization: number;
    qualityScore: number;
    costPerStaff: number;
  };
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SupportStaffAnalyticsService {

  constructor(
    private http: HttpClient,
    private supportStaffIntegration: SupportStaffIntegrationService
  ) {}

  // Tenant-wide Analytics
  getTenantSupportStaffMetrics(tenantId: string, period: string): Observable<TenantSupportStaffMetrics> {
    return this.http.get<TenantSupportStaffMetrics>(`/api/central-admin/support-staff/metrics/${tenantId}`, {
      params: { period }
    });
  }

  getCrossBranchAnalytics(tenantId: string, period: string): Observable<CrossBranchAnalytics> {
    return this.http.get<CrossBranchAnalytics>(`/api/central-admin/support-staff/cross-branch/${tenantId}`, {
      params: { period }
    });
  }

  getSupportStaffTrends(tenantId: string, timeframe: string): Observable<SupportStaffTrends> {
    return this.http.get<SupportStaffTrends>(`/api/central-admin/support-staff/trends/${tenantId}`, {
      params: { timeframe }
    });
  }

  // Benchmarking and Comparisons
  getSupportStaffBenchmarking(tenantId: string): Observable<SupportStaffBenchmarking> {
    return this.http.get<SupportStaffBenchmarking>(`/api/central-admin/support-staff/benchmarking/${tenantId}`);
  }

  compareTenantPerformance(tenantIds: string[], period: string): Observable<any> {
    return this.http.post('/api/central-admin/support-staff/compare', {
      tenantIds,
      period
    });
  }

  // Resource Optimization
  getStaffingRecommendations(tenantId: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/recommendations/${tenantId}`);
  }

  getResourceUtilizationReport(tenantId: string, period: string): Observable<any> {
    return this.supportStaffIntegration.getSupportStaffUtilizationReport(tenantId, period);
  }

  optimizeStaffAllocation(tenantId: string, parameters: {
    targetUtilization: number;
    budgetConstraints: number;
    qualityThreshold: number;
  }): Observable<any> {
    return this.http.post(`/api/central-admin/support-staff/optimize/${tenantId}`, parameters);
  }

  // Cost Analysis
  getSupportStaffCostAnalysis(tenantId: string, period: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/cost-analysis/${tenantId}`, {
      params: { period }
    });
  }

  getBudgetVarianceReport(tenantId: string, period: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/budget-variance/${tenantId}`, {
      params: { period }
    });
  }

  // Quality and Performance Analytics
  getQualityMetricsAcrossBranches(tenantId: string, period: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/quality-metrics/${tenantId}`, {
      params: { period }
    });
  }

  getIncidentAnalytics(tenantId: string, period: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/incident-analytics/${tenantId}`, {
      params: { period }
    });
  }

  // Predictive Analytics
  getPredictiveStaffingModel(tenantId: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/predictive-model/${tenantId}`);
  }

  forecastStaffingNeeds(tenantId: string, forecastPeriod: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/forecast/${tenantId}`, {
      params: { forecastPeriod }
    });
  }

  // Compliance and Audit Analytics
  getComplianceAnalytics(tenantId: string, period: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/compliance-analytics/${tenantId}`, {
      params: { period }
    });
  }

  getAuditTrailAnalytics(tenantId: string, period: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/audit-trail/${tenantId}`, {
      params: { period }
    });
  }

  // Training and Development Analytics
  getTrainingEffectivenessAnalytics(tenantId: string, period: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/training-effectiveness/${tenantId}`, {
      params: { period }
    });
  }

  getSkillGapAnalysis(tenantId: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/skill-gap-analysis/${tenantId}`);
  }

  // Custom Reports and Dashboards
  generateCustomReport(tenantId: string, reportConfig: {
    reportType: string;
    metrics: string[];
    filters: any;
    groupBy: string[];
    period: string;
  }): Observable<any> {
    return this.http.post(`/api/central-admin/support-staff/custom-report/${tenantId}`, reportConfig);
  }

  getDashboardData(tenantId: string, dashboardType: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/dashboard/${tenantId}`, {
      params: { dashboardType }
    });
  }

  // Export and Integration
  exportAnalyticsData(tenantId: string, exportConfig: {
    format: 'CSV' | 'EXCEL' | 'PDF';
    dataType: string;
    period: string;
    includeCharts: boolean;
  }): Observable<Blob> {
    return this.http.post(`/api/central-admin/support-staff/export/${tenantId}`, exportConfig, {
      responseType: 'blob'
    });
  }

  scheduleAutomatedReport(tenantId: string, reportConfig: {
    reportType: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    recipients: string[];
    format: string;
  }): Observable<any> {
    return this.http.post(`/api/central-admin/support-staff/schedule-report/${tenantId}`, reportConfig);
  }

  // Real-time Monitoring
  getRealTimeMetrics(tenantId: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/real-time/${tenantId}`);
  }

  getAlertConfiguration(tenantId: string): Observable<any> {
    return this.http.get(`/api/central-admin/support-staff/alerts/${tenantId}`);
  }

  updateAlertConfiguration(tenantId: string, alertConfig: any): Observable<any> {
    return this.http.put(`/api/central-admin/support-staff/alerts/${tenantId}`, alertConfig);
  }

  // System-wide Analytics (across all tenants)
  getSystemWideMetrics(period: string): Observable<any> {
    return this.http.get('/api/central-admin/support-staff/system-wide', {
      params: { period }
    });
  }

  getTenantRankings(metric: string, period: string): Observable<any> {
    return this.http.get('/api/central-admin/support-staff/tenant-rankings', {
      params: { metric, period }
    });
  }
}