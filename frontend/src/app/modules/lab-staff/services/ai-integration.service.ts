import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface AiAnalysisRequest {
  id: string;
  reportId: string;
  requestId: string;
  analysisType: 'xray_analysis' | 'cbct_analysis' | 'pathology_analysis' | 'general_analysis';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  submittedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionTime?: Date;
  progress: number;
}

export interface AiAnalysisResult {
  id: string;
  requestId: string;
  analysisType: string;
  results: {
    findings: AiFinding[];
    confidence: number;
    recommendations: string[];
    annotations: AiAnnotation[];
    metadata: any;
  };
  processingTime: number;
  modelVersion: string;
  qualityScore: number;
  reviewRequired: boolean;
  completedAt: Date;
}

export interface AiFinding {
  id: string;
  type: 'anomaly' | 'normal' | 'suspicious' | 'artifact';
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  measurements?: any;
  clinicalSignificance: string;
}

export interface AiAnnotation {
  id: string;
  type: 'highlight' | 'arrow' | 'circle' | 'rectangle' | 'text';
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  label: string;
  description?: string;
  confidence: number;
}

export interface AiModelInfo {
  id: string;
  name: string;
  version: string;
  type: string;
  description: string;
  supportedImageTypes: string[];
  accuracy: number;
  lastUpdated: Date;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {
  private readonly apiUrl = `${environment.apiUrl}/ai-analysis`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  // State management
  private activeRequestsSubject = new BehaviorSubject<AiAnalysisRequest[]>([]);
  private availableModelsSubject = new BehaviorSubject<AiModelInfo[]>([]);
  
  // Public observables
  public activeRequests$ = this.activeRequestsSubject.asObservable();
  public availableModels$ = this.availableModelsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialData();
    this.startProgressPolling();
  }

  // Analysis Request Management
  submitAnalysisRequest(reportId: string, analysisType: string, priority: string = 'normal'): Observable<AiAnalysisRequest> {
    const requestData = {
      reportId,
      analysisType,
      priority
    };

    return this.http.post<AiAnalysisRequest>(`${this.apiUrl}/submit`, requestData, this.httpOptions);
  }

  getAnalysisRequest(requestId: string): Observable<AiAnalysisRequest> {
    return this.http.get<AiAnalysisRequest>(`${this.apiUrl}/requests/${requestId}`);
  }

  getActiveRequests(): Observable<AiAnalysisRequest[]> {
    return this.http.get<AiAnalysisRequest[]>(`${this.apiUrl}/requests/active`);
  }

  cancelAnalysisRequest(requestId: string, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/cancel`, {
      reason
    }, this.httpOptions);
  }

  // Analysis Results
  getAnalysisResult(requestId: string): Observable<AiAnalysisResult> {
    return this.http.get<AiAnalysisResult>(`${this.apiUrl}/results/${requestId}`);
  }

  getAnalysisHistory(filters?: any): Observable<AiAnalysisResult[]> {
    const params = filters ? { params: filters } : {};
    return this.http.get<AiAnalysisResult[]>(`${this.apiUrl}/results`, params);
  }

  approveAnalysisResult(resultId: string, notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/results/${resultId}/approve`, {
      notes
    }, this.httpOptions);
  }

  rejectAnalysisResult(resultId: string, reason: string, notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/results/${resultId}/reject`, {
      reason,
      notes
    }, this.httpOptions);
  }

  requestReanalysis(resultId: string, reason: string, newParameters?: any): Observable<AiAnalysisRequest> {
    return this.http.post<AiAnalysisRequest>(`${this.apiUrl}/results/${resultId}/reanalyze`, {
      reason,
      parameters: newParameters
    }, this.httpOptions);
  }

  // Model Management
  getAvailableModels(): Observable<AiModelInfo[]> {
    return this.http.get<AiModelInfo[]>(`${this.apiUrl}/models`);
  }

  getModelInfo(modelId: string): Observable<AiModelInfo> {
    return this.http.get<AiModelInfo>(`${this.apiUrl}/models/${modelId}`);
  }

  getModelPerformanceMetrics(modelId: string, timeRange?: string): Observable<any> {
    const params = timeRange ? { params: { timeRange } } : {};
    return this.http.get(`${this.apiUrl}/models/${modelId}/metrics`, params);
  }

  // Quality Control
  validateAnalysisQuality(resultId: string, qualityData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/quality/validate/${resultId}`, qualityData, this.httpOptions);
  }

  getQualityMetrics(filters?: any): Observable<any> {
    const params = filters ? { params: filters } : {};
    return this.http.get(`${this.apiUrl}/quality/metrics`, params);
  }

  reportQualityIssue(resultId: string, issueData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/quality/report-issue/${resultId}`, issueData, this.httpOptions);
  }

  // Batch Processing
  submitBatchAnalysis(reportIds: string[], analysisType: string, priority: string = 'normal'): Observable<AiAnalysisRequest[]> {
    const batchData = {
      reportIds,
      analysisType,
      priority
    };

    return this.http.post<AiAnalysisRequest[]>(`${this.apiUrl}/batch/submit`, batchData, this.httpOptions);
  }

  getBatchStatus(batchId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/batch/${batchId}/status`);
  }

  // System Status
  getSystemStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/status`);
  }

  getProcessingQueue(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/queue`);
  }

  getSystemMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/metrics`);
  }

  // Configuration
  getAnalysisSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/settings`);
  }

  updateAnalysisSettings(settings: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/settings`, settings, this.httpOptions);
  }

  // Private methods
  private loadInitialData(): void {
    // Load active requests
    this.getActiveRequests().subscribe({
      next: (requests) => this.activeRequestsSubject.next(requests),
      error: (error) => console.error('Error loading active requests:', error)
    });

    // Load available models
    this.getAvailableModels().subscribe({
      next: (models) => this.availableModelsSubject.next(models),
      error: (error) => console.error('Error loading models:', error)
    });
  }

  private startProgressPolling(): void {
    // Poll for progress updates every 10 seconds
    interval(10000).pipe(
      switchMap(() => this.getActiveRequests()),
      takeWhile(() => true, true) // Continue polling
    ).subscribe({
      next: (requests) => {
        this.activeRequestsSubject.next(requests);
      },
      error: (error) => console.error('Error polling progress:', error)
    });
  }

  // Utility methods
  refreshData(): void {
    this.loadInitialData();
  }

  getCurrentActiveRequests(): AiAnalysisRequest[] {
    return this.activeRequestsSubject.value;
  }

  getCurrentModels(): AiModelInfo[] {
    return this.availableModelsSubject.value;
  }

  // Helper methods
  getAnalysisTypeDisplayName(type: string): string {
    const typeMap: { [key: string]: string } = {
      'xray_analysis': 'X-Ray Analysis',
      'cbct_analysis': 'CBCT Analysis',
      'pathology_analysis': 'Pathology Analysis',
      'general_analysis': 'General Analysis'
    };
    return typeMap[type] || type;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'primary';
      case 'processing': return 'accent';
      case 'failed': return 'warn';
      case 'cancelled': return 'warn';
      case 'pending': return '';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'schedule';
      case 'processing': return 'autorenew';
      case 'completed': return 'check_circle';
      case 'failed': return 'error';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'warn';
      case 'high': return 'accent';
      case 'normal': return 'primary';
      case 'low': return '';
      default: return '';
    }
  }

  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  formatProcessingTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  isAnalysisSupported(imageType: string, modelId: string): boolean {
    const model = this.getCurrentModels().find(m => m.id === modelId);
    return model ? model.supportedImageTypes.includes(imageType) : false;
  }

  getRecommendedModel(analysisType: string): AiModelInfo | null {
    const models = this.getCurrentModels().filter(m => 
      m.isActive && m.type === analysisType
    );
    
    // Return the model with highest accuracy
    return models.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best, models[0]
    ) || null;
  }
}