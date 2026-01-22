import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AiModule {
  id: string;
  name: string;
  type: 'diagnosis' | 'ocr' | 'chatbot' | 'prediction' | 'classification';
  version: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  description: string;
  modelPath: string;
  accuracy: number;
  confidence: number;
  lastTrained: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  isEnabled: boolean;
  enabledClinics: string[];
  configuration: {
    threshold: number;
    maxBatchSize: number;
    timeout: number;
    retryAttempts: number;
  };
  metrics: {
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
}

export interface AiRequest {
  id: string;
  moduleId: string;
  moduleName: string;
  clinicId: string;
  clinicName: string;
  userId: string;
  userName: string;
  requestType: string;
  inputData: any;
  outputData: any;
  confidence: number;
  processingTime: number;
  status: 'success' | 'failed' | 'timeout' | 'error';
  errorMessage?: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

export interface AiPerformanceMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  averageConfidence: number;
  errorRate: number;
  throughput: number;
  peakUsage: Date;
  resourceUtilization: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
  requestsByModule: { [moduleId: string]: number };
  requestsByClinic: { [clinicId: string]: number };
  hourlyDistribution: { hour: number; requests: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class AiMonitoringService {
  private readonly apiUrl = `${environment.apiUrl}/central-admin/ai-monitoring`;

  constructor(private http: HttpClient) {}

  // AI Modules Management
  getAllAiModules(): Observable<AiModule[]> {
    return this.http.get<AiModule[]>(`${this.apiUrl}/modules`);
  }

  getAiModuleById(id: string): Observable<AiModule> {
    return this.http.get<AiModule>(`${this.apiUrl}/modules/${id}`);
  }

  updateAiModule(id: string, module: Partial<AiModule>): Observable<AiModule> {
    return this.http.put<AiModule>(`${this.apiUrl}/modules/${id}`, module);
  }

  enableAiModule(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/modules/${id}/enable`, {});
  }

  disableAiModule(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/modules/${id}/disable`, {});
  }

  restartAiModule(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/modules/${id}/restart`, {});
  }

  // Module Configuration
  updateModuleConfiguration(id: string, config: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/modules/${id}/config`, config);
  }

  getModuleConfiguration(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/modules/${id}/config`);
  }

  // Clinic-specific AI Management
  enableModuleForClinic(moduleId: string, clinicId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/modules/${moduleId}/clinics/${clinicId}/enable`, {});
  }

  disableModuleForClinic(moduleId: string, clinicId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/modules/${moduleId}/clinics/${clinicId}`);
  }

  getClinicAiModules(clinicId: string): Observable<AiModule[]> {
    return this.http.get<AiModule[]>(`${this.apiUrl}/clinics/${clinicId}/modules`);
  }

  bulkUpdateClinicModules(clinicId: string, moduleIds: string[], enabled: boolean): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/clinics/${clinicId}/modules/bulk`, { moduleIds, enabled });
  }

  // AI Requests Monitoring
  getAiRequests(filters?: any): Observable<AiRequest[]> {
    return this.http.post<AiRequest[]>(`${this.apiUrl}/requests`, filters || {});
  }

  getAiRequestById(id: string): Observable<AiRequest> {
    return this.http.get<AiRequest>(`${this.apiUrl}/requests/${id}`);
  }

  getRequestsByModule(moduleId: string, limit: number = 100): Observable<AiRequest[]> {
    return this.http.get<AiRequest[]>(`${this.apiUrl}/modules/${moduleId}/requests?limit=${limit}`);
  }

  getRequestsByClinic(clinicId: string, limit: number = 100): Observable<AiRequest[]> {
    return this.http.get<AiRequest[]>(`${this.apiUrl}/clinics/${clinicId}/requests?limit=${limit}`);
  }

  // Performance Metrics
  getAiPerformanceMetrics(period: string = '24h'): Observable<AiPerformanceMetrics> {
    return this.http.get<AiPerformanceMetrics>(`${this.apiUrl}/performance?period=${period}`);
  }

  getModulePerformanceMetrics(moduleId: string, period: string = '24h'): Observable<any> {
    return this.http.get(`${this.apiUrl}/modules/${moduleId}/performance?period=${period}`);
  }

  getClinicAiUsage(clinicId: string, period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/clinics/${clinicId}/usage?period=${period}`);
  }

  // Accuracy and Quality Metrics
  getAccuracyMetrics(moduleId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/modules/${moduleId}/accuracy`);
  }

  updateAccuracyMetrics(moduleId: string, metrics: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/modules/${moduleId}/accuracy`, metrics);
  }

  getConfidenceDistribution(moduleId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/modules/${moduleId}/confidence-distribution`);
  }

  // Model Training and Updates
  getModelVersions(moduleId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/modules/${moduleId}/versions`);
  }

  deployModelVersion(moduleId: string, version: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/modules/${moduleId}/deploy/${version}`, {});
  }

  rollbackModelVersion(moduleId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/modules/${moduleId}/rollback`, {});
  }

  scheduleModelTraining(moduleId: string, config: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/modules/${moduleId}/train`, config);
  }

  getTrainingStatus(moduleId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/modules/${moduleId}/training-status`);
  }

  // Error Monitoring and Debugging
  getAiErrors(period: string = '24h'): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/errors?period=${period}`);
  }

  getModuleErrors(moduleId: string, period: string = '24h'): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/modules/${moduleId}/errors?period=${period}`);
  }

  getErrorDetails(errorId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/errors/${errorId}`);
  }

  resolveError(errorId: string, resolution: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/errors/${errorId}/resolve`, { resolution });
  }

  // Resource Monitoring
  getResourceUsage(): Observable<any> {
    return this.http.get(`${this.apiUrl}/resources`);
  }

  getModuleResourceUsage(moduleId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/modules/${moduleId}/resources`);
  }

  // Alerts and Notifications
  getAiAlerts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alerts`);
  }

  createAlert(alert: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/alerts`, alert);
  }

  updateAlert(id: string, alert: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/alerts/${id}`, alert);
  }

  deleteAlert(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/alerts/${id}`);
  }

  // Usage Analytics
  getUsageAnalytics(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/usage?period=${period}`);
  }

  getUsageTrends(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/trends`);
  }

  getUserAdoptionMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/adoption`);
  }

  // Explainability (XAI)
  getExplanation(requestId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/requests/${requestId}/explanation`);
  }

  generateExplanation(moduleId: string, inputData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/modules/${moduleId}/explain`, { inputData });
  }

  // Batch Operations
  bulkEnableModules(moduleIds: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/modules/bulk/enable`, { moduleIds });
  }

  bulkDisableModules(moduleIds: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/modules/bulk/disable`, { moduleIds });
  }

  bulkUpdateConfiguration(moduleIds: string[], config: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/modules/bulk/config`, { moduleIds, config });
  }

  // Export and Reporting
  exportAiMetrics(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/metrics?format=${format}`, { responseType: 'blob' });
  }

  exportRequestLogs(moduleId: string, format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/modules/${moduleId}/export/logs?format=${format}`, { 
      responseType: 'blob' 
    });
  }

  generateAiReport(config: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/reports/generate`, config, { responseType: 'blob' });
  }
}