import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AiAnalysisRequest {
  patientId: string;
  imageFile?: File;
  imageUrl?: string;
  analysisType: 'xray' | 'intraoral' | 'extraoral' | 'panoramic' | 'bitewing';
  clinicalNotes?: string;
  symptoms?: string[];
}

export interface AiAnalysisResult {
  id: string;
  patientId: string;
  analysisType: string;
  imageUrl: string;
  findings: AiFinding[];
  overallAssessment: string;
  confidence: number;
  processingTime: number;
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  status: 'processing' | 'completed' | 'reviewed' | 'archived';
}

export interface AiFinding {
  id: string;
  type: 'caries' | 'bone-loss' | 'impaction' | 'fracture' | 'restoration' | 'anomaly' | 'pathology';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  location: {
    tooth?: string;
    quadrant?: string;
    region?: string;
    coordinates?: { x: number; y: number; width: number; height: number };
  };
  description: string;
  confidence: number;
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  heatmapData?: number[][];
}

export interface AiModel {
  id: string;
  name: string;
  version: string;
  description: string;
  supportedImageTypes: string[];
  accuracy: number;
  isActive: boolean;
  lastUpdated: Date;
}

export interface AiStatistics {
  totalAnalyses: number;
  accuracyRate: number;
  averageProcessingTime: number;
  findingsByType: { [key: string]: number };
  monthlyUsage: { month: string; count: number }[];
  topFindings: { type: string; count: number; accuracy: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class DoctorAiService {
  private apiUrl = `${environment.apiUrl}/doctor/ai-diagnosis`;

  constructor(private http: HttpClient) {}

  // AI Analysis
  uploadImageForAnalysis(request: AiAnalysisRequest): Observable<{ analysisId: string; estimatedTime: number }> {
    const formData = new FormData();
    
    if (request.imageFile) {
      formData.append('image', request.imageFile);
    }
    
    formData.append('patientId', request.patientId);
    formData.append('analysisType', request.analysisType);
    
    if (request.clinicalNotes) {
      formData.append('clinicalNotes', request.clinicalNotes);
    }
    
    if (request.symptoms) {
      formData.append('symptoms', JSON.stringify(request.symptoms));
    }

    return this.http.post<{ analysisId: string; estimatedTime: number }>(`${this.apiUrl}/analyze`, formData);
  }

  getAnalysisResult(analysisId: string): Observable<AiAnalysisResult> {
    return this.http.get<AiAnalysisResult>(`${this.apiUrl}/results/${analysisId}`);
  }

  getAnalysisStatus(analysisId: string): Observable<{ status: string; progress: number; estimatedTimeRemaining: number }> {
    return this.http.get<{ status: string; progress: number; estimatedTimeRemaining: number }>(`${this.apiUrl}/status/${analysisId}`);
  }

  // Patient AI History
  getPatientAiAnalyses(patientId: string, limit?: number): Observable<AiAnalysisResult[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get<AiAnalysisResult[]>(`${this.apiUrl}/patient/${patientId}${params}`);
  }

  getDoctorAiAnalyses(dateFrom?: string, dateTo?: string, status?: string): Observable<AiAnalysisResult[]> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (status) params.append('status', status);
    
    return this.http.get<AiAnalysisResult[]>(`${this.apiUrl}/doctor?${params.toString()}`);
  }

  // Analysis Review and Feedback
  reviewAnalysis(analysisId: string, review: {
    approved: boolean;
    feedback: string;
    correctedFindings?: Partial<AiFinding>[];
    clinicalNotes?: string;
  }): Observable<AiAnalysisResult> {
    return this.http.patch<AiAnalysisResult>(`${this.apiUrl}/results/${analysisId}/review`, review);
  }

  provideFeedback(analysisId: string, feedback: {
    accuracy: number; // 1-5 scale
    usefulness: number; // 1-5 scale
    comments: string;
    falsePositives?: string[];
    falseNegatives?: string[];
  }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/results/${analysisId}/feedback`, feedback);
  }

  // AI Model Information
  getAvailableModels(): Observable<AiModel[]> {
    return this.http.get<AiModel[]>(`${this.apiUrl}/models`);
  }

  getModelDetails(modelId: string): Observable<AiModel> {
    return this.http.get<AiModel>(`${this.apiUrl}/models/${modelId}`);
  }

  // Comparative Analysis
  compareAnalyses(analysisIds: string[]): Observable<{
    analyses: AiAnalysisResult[];
    comparison: {
      commonFindings: AiFinding[];
      uniqueFindings: { analysisId: string; findings: AiFinding[] }[];
      progressionAnalysis?: {
        improved: AiFinding[];
        worsened: AiFinding[];
        stable: AiFinding[];
      };
    };
  }> {
    return this.http.post(`${this.apiUrl}/compare`, { analysisIds });
  }

  // Batch Processing
  submitBatchAnalysis(requests: AiAnalysisRequest[]): Observable<{ batchId: string; analysisIds: string[] }> {
    const formData = new FormData();
    
    requests.forEach((request, index) => {
      if (request.imageFile) {
        formData.append(`images[${index}]`, request.imageFile);
      }
      formData.append(`requests[${index}]`, JSON.stringify({
        patientId: request.patientId,
        analysisType: request.analysisType,
        clinicalNotes: request.clinicalNotes,
        symptoms: request.symptoms
      }));
    });

    return this.http.post<{ batchId: string; analysisIds: string[] }>(`${this.apiUrl}/batch-analyze`, formData);
  }

  getBatchStatus(batchId: string): Observable<{
    batchId: string;
    status: string;
    totalAnalyses: number;
    completedAnalyses: number;
    failedAnalyses: number;
    estimatedTimeRemaining: number;
  }> {
    return this.http.get(`${this.apiUrl}/batch/${batchId}/status`);
  }

  // AI Statistics and Analytics
  getAiStatistics(dateFrom?: string, dateTo?: string): Observable<AiStatistics> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get<AiStatistics>(`${this.apiUrl}/statistics?${params.toString()}`);
  }

  getAccuracyTrends(period: 'week' | 'month' | 'quarter'): Observable<{
    period: string;
    data: { date: string; accuracy: number; count: number }[];
  }> {
    return this.http.get(`${this.apiUrl}/accuracy-trends/${period}`);
  }

  // Image Processing Utilities
  enhanceImage(imageFile: File, enhancement: {
    brightness?: number;
    contrast?: number;
    sharpness?: number;
    denoise?: boolean;
  }): Observable<Blob> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('enhancement', JSON.stringify(enhancement));
    
    return this.http.post(`${this.apiUrl}/enhance-image`, formData, { responseType: 'blob' });
  }

  generateHeatmap(analysisId: string, findingId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/results/${analysisId}/findings/${findingId}/heatmap`, { 
      responseType: 'blob' 
    });
  }

  // Export and Reporting
  exportAnalysisReport(analysisId: string, format: 'pdf' | 'json' | 'dicom'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/results/${analysisId}/export/${format}`, { 
      responseType: 'blob' 
    });
  }

  generatePatientAiSummary(patientId: string, dateFrom?: string, dateTo?: string): Observable<{
    patientId: string;
    totalAnalyses: number;
    findingsSummary: { type: string; count: number; trend: 'improving' | 'stable' | 'worsening' }[];
    recommendations: string[];
    riskAssessment: {
      overall: 'low' | 'medium' | 'high';
      factors: string[];
    };
  }> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get(`${this.apiUrl}/patient/${patientId}/summary?${params.toString()}`);
  }

  // Real-time Analysis Updates
  subscribeToAnalysisUpdates(analysisId: string): Observable<{
    analysisId: string;
    status: string;
    progress: number;
    currentStep: string;
    result?: AiAnalysisResult;
  }> {
    // WebSocket implementation for real-time analysis updates
    return new Observable(observer => {
      // WebSocket connection logic here
      // This would listen for analysis progress and completion updates
    });
  }

  // AI Training and Improvement
  submitTrainingData(data: {
    imageFile: File;
    correctFindings: AiFinding[];
    patientId: string;
    verified: boolean;
  }): Observable<void> {
    const formData = new FormData();
    formData.append('image', data.imageFile);
    formData.append('findings', JSON.stringify(data.correctFindings));
    formData.append('patientId', data.patientId);
    formData.append('verified', data.verified.toString());
    
    return this.http.post<void>(`${this.apiUrl}/training-data`, formData);
  }

  // Integration with Medical Records
  attachAnalysisToRecord(analysisId: string, medicalRecordId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/results/${analysisId}/attach-to-record`, { medicalRecordId });
  }

  getAnalysesForRecord(medicalRecordId: string): Observable<AiAnalysisResult[]> {
    return this.http.get<AiAnalysisResult[]>(`${this.apiUrl}/medical-record/${medicalRecordId}/analyses`);
  }
}