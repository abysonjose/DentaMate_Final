import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface AiAnalysisRequest {
  reportId: string;
  analysisType: 'XRAY_ANALYSIS' | 'CAVITY_DETECTION' | 'BONE_LOSS' | 'GENERAL_DIAGNOSIS';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  parameters?: any;
}

export interface AiAnalysisResult {
  id: string;
  reportId: string;
  analysisType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  results?: any;
  confidence: number;
  processingTime: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface AiModelInfo {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  lastUpdated: Date;
  supportedTypes: string[];
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AiIntegrationService {
  private apiUrl = `${environment.apiUrl}/ai-diagnosis`;
  private analysisSubject = new BehaviorSubject<AiAnalysisResult[]>([]);
  public analyses$ = this.analysisSubject.asObservable();

  constructor(private http: HttpClient) {}

  // AI Analysis Management
  requestAnalysis(request: AiAnalysisRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/analyze`, {
      ...request,
      requestedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getAnalysisStatus(analysisId: string): Observable<AiAnalysisResult> {
    return this.http.get<AiAnalysisResult>(`${this.apiUrl}/analysis/${analysisId}/status`);
  }

  getAnalysisResult(analysisId: string): Observable<AiAnalysisResult> {
    return this.http.get<AiAnalysisResult>(`${this.apiUrl}/analysis/${analysisId}/result`);
  }

  cancelAnalysis(analysisId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/analysis/${analysisId}`, {
      body: {
        cancelledBy: this.getCurrentUserId(),
        timestamp: new Date()
      }
    });
  }

  // Batch Analysis
  requestBatchAnalysis(requests: AiAnalysisRequest[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/analyze/batch`, {
      requests,
      requestedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  getBatchAnalysisStatus(batchId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/batch/${batchId}/status`);
  }

  // Real-time Progress Monitoring
  monitorAnalysisProgress(analysisId: string): Observable<AiAnalysisResult> {
    return interval(2000).pipe(
      switchMap(() => this.getAnalysisStatus(analysisId)),
      takeWhile(result => result.status === 'PROCESSING' || result.status === 'PENDING', true)
    );
  }

  // AI Model Management
  getAvailableModels(): Observable<AiModelInfo[]> {
    return this.http.get<AiModelInfo[]>(`${this.apiUrl}/models`);
  }

  getModelDetails(modelId: string): Observable<AiModelInfo> {
    return this.http.get<AiModelInfo>(`${this.apiUrl}/models/${modelId}`);
  }

  // Analysis History
  getAnalysisHistory(filters?: any): Observable<AiAnalysisResult[]> {
    return this.http.get<AiAnalysisResult[]>(`${this.apiUrl}/analysis/history`, {
      params: filters || {}
    });
  }

  getReportAnalysisHistory(reportId: string): Observable<AiAnalysisResult[]> {
    return this.http.get<AiAnalysisResult[]>(`${this.apiUrl}/reports/${reportId}/analyses`);
  }

  // Quality Assessment
  assessAnalysisQuality(analysisId: string, feedback: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/analysis/${analysisId}/quality`, {
      ...feedback,
      assessedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  reportAnalysisIssue(analysisId: string, issue: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/analysis/${analysisId}/issues`, {
      ...issue,
      reportedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  // Confidence Thresholds
  getConfidenceThresholds(): Observable<any> {
    return this.http.get(`${this.apiUrl}/confidence/thresholds`);
  }

  updateConfidenceThreshold(analysisType: string, threshold: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/confidence/thresholds`, {
      analysisType,
      threshold,
      updatedBy: this.getCurrentUserId()
    });
  }

  // Explainable AI (XAI)
  getAnalysisExplanation(analysisId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/analysis/${analysisId}/explanation`);
  }

  generateHeatmap(analysisId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/analysis/${analysisId}/heatmap`, {
      responseType: 'blob'
    });
  }

  // Performance Metrics
  getAiPerformanceMetrics(dateRange?: { start: Date, end: Date }): Observable<any> {
    const params = dateRange ? {
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString()
    } : {};

    return this.http.get(`${this.apiUrl}/metrics/performance`, { params });
  }

  getModelAccuracyTrends(modelId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/models/${modelId}/accuracy-trends`);
  }

  // Integration with Lab Workflow
  integrateWithWorkflow(analysisId: string, workflowId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/integration/workflow`, {
      analysisId,
      workflowId,
      integratedBy: this.getCurrentUserId()
    });
  }

  // Automated Analysis Rules
  getAutomationRules(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/automation/rules`);
  }

  createAutomationRule(rule: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/automation/rules`, {
      ...rule,
      createdBy: this.getCurrentUserId()
    });
  }

  updateAutomationRule(ruleId: string, rule: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/automation/rules/${ruleId}`, {
      ...rule,
      updatedBy: this.getCurrentUserId()
    });
  }

  // Data Preprocessing
  preprocessImage(imageData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/preprocess/image`, imageData);
  }

  validateImageQuality(imageData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate/image-quality`, imageData);
  }

  // Model Training Support
  submitTrainingData(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/training/data`, {
      ...data,
      submittedBy: this.getCurrentUserId()
    });
  }

  getTrainingDataStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/training/status`);
  }

  // Error Handling and Retry
  retryFailedAnalysis(analysisId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/analysis/${analysisId}/retry`, {
      retriedBy: this.getCurrentUserId(),
      timestamp: new Date()
    });
  }

  // System Health
  getAiSystemHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/health`);
  }

  getProcessingQueue(): Observable<any> {
    return this.http.get(`${this.apiUrl}/queue/status`);
  }

  // Utility Methods
  private getCurrentUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  // Analysis Type Helpers
  getAnalysisTypeInfo(type: string): any {
    const types = {
      'XRAY_ANALYSIS': {
        name: 'X-Ray Analysis',
        description: 'General X-ray image analysis',
        estimatedTime: '2-5 minutes',
        icon: 'medical_services'
      },
      'CAVITY_DETECTION': {
        name: 'Cavity Detection',
        description: 'Automated cavity detection in dental X-rays',
        estimatedTime: '1-3 minutes',
        icon: 'search'
      },
      'BONE_LOSS': {
        name: 'Bone Loss Analysis',
        description: 'Periodontal bone loss assessment',
        estimatedTime: '3-7 minutes',
        icon: 'analytics'
      },
      'GENERAL_DIAGNOSIS': {
        name: 'General Diagnosis',
        description: 'Comprehensive diagnostic analysis',
        estimatedTime: '5-10 minutes',
        icon: 'psychology'
      }
    };

    return types[type as keyof typeof types] || {
      name: type,
      description: 'AI analysis',
      estimatedTime: 'Variable',
      icon: 'smart_toy'
    };
  }

  // Format Analysis Results
  formatAnalysisResults(results: any): any {
    // Format results for display in UI
    return {
      ...results,
      formattedConfidence: `${(results.confidence * 100).toFixed(1)}%`,
      formattedProcessingTime: this.formatProcessingTime(results.processingTime),
      riskLevel: this.calculateRiskLevel(results.confidence, results.findings)
    };
  }

  private formatProcessingTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  private calculateRiskLevel(confidence: number, findings: any[]): string {
    if (confidence < 0.5) return 'LOW';
    if (confidence < 0.8) return 'MEDIUM';
    return 'HIGH';
  }
}