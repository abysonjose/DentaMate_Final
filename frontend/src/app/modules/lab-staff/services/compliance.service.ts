import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'safety' | 'quality' | 'regulatory' | 'documentation' | 'equipment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  checkpoints: ComplianceCheckpoint[];
  applicableTestTypes: string[];
  regulatoryReference?: string;
}

export interface ComplianceCheckpoint {
  id: string;
  name: string;
  description: string;
  checkType: 'manual' | 'automatic' | 'document_review';
  isRequired: boolean;
  acceptanceCriteria: string;
  evidenceRequired: boolean;
  evidenceTypes: string[];
}

export interface ComplianceAudit {
  id: string;
  auditType: 'routine' | 'incident_based' | 'regulatory' | 'internal';
  requestId?: string;
  reportId?: string;
  staffId: string;
  staffName: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  overallScore: number;
  checkResults: ComplianceCheckResult[];
  findings: ComplianceFinding[];
  recommendations: string[];
  auditTrail: AuditTrailEntry[];
}

export interface ComplianceCheckResult {
  checkpointId: string;
  checkpointName: string;
  status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  score: number;
  evidence?: ComplianceEvidence[];
  notes?: string;
  checkedBy: string;
  checkedAt: Date;
}

export interface ComplianceEvidence {
  id: string;
  type: 'document' | 'image' | 'signature' | 'timestamp' | 'measurement';
  fileName?: string;
  fileUrl?: string;
  value?: string;
  metadata?: any;
  uploadedAt: Date;
}

export interface ComplianceFinding {
  id: string;
  type: 'violation' | 'improvement' | 'observation' | 'best_practice';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  ruleId?: string;
  checkpointId?: string;
  evidence?: ComplianceEvidence[];
  correctiveAction?: string;
  dueDate?: Date;
  assignedTo?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}

export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  action: string;
  performedBy: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface ComplianceMetrics {
  overallComplianceScore: number;
  totalAudits: number;
  passedAudits: number;
  failedAudits: number;
  criticalFindings: number;
  openFindings: number;
  averageAuditTime: number;
  complianceTrend: ComplianceTrendData[];
  categoryScores: { [category: string]: number };
}

export interface ComplianceTrendData {
  date: Date;
  score: number;
  auditsCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ComplianceService {
  private readonly apiUrl = `${environment.apiUrl}/compliance`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  // State management
  private complianceRulesSubject = new BehaviorSubject<ComplianceRule[]>([]);
  private activeAuditsSubject = new BehaviorSubject<ComplianceAudit[]>([]);
  private metricsSubject = new BehaviorSubject<ComplianceMetrics | null>(null);
  
  // Public observables
  public complianceRules$ = this.complianceRulesSubject.asObservable();
  public activeAudits$ = this.activeAuditsSubject.asObservable();
  public metrics$ = this.metricsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  // Compliance Rules Management
  getComplianceRules(): Observable<ComplianceRule[]> {
    return this.http.get<ComplianceRule[]>(`${this.apiUrl}/rules`);
  }

  getComplianceRule(ruleId: string): Observable<ComplianceRule> {
    return this.http.get<ComplianceRule>(`${this.apiUrl}/rules/${ruleId}`);
  }

  getRulesForTestType(testType: string): Observable<ComplianceRule[]> {
    return this.http.get<ComplianceRule[]>(`${this.apiUrl}/rules/test-type/${testType}`);
  }

  // Audit Management
  startAudit(auditData: any): Observable<ComplianceAudit> {
    return this.http.post<ComplianceAudit>(`${this.apiUrl}/audits/start`, auditData, this.httpOptions);
  }

  getAudit(auditId: string): Observable<ComplianceAudit> {
    return this.http.get<ComplianceAudit>(`${this.apiUrl}/audits/${auditId}`);
  }

  getActiveAudits(): Observable<ComplianceAudit[]> {
    return this.http.get<ComplianceAudit[]>(`${this.apiUrl}/audits/active`);
  }

  getAuditHistory(filters?: any): Observable<ComplianceAudit[]> {
    const params = filters ? { params: filters } : {};
    return this.http.get<ComplianceAudit[]>(`${this.apiUrl}/audits/history`, params);
  }

  updateAuditCheckpoint(auditId: string, checkpointId: string, result: any): Observable<ComplianceAudit> {
    return this.http.put<ComplianceAudit>(
      `${this.apiUrl}/audits/${auditId}/checkpoints/${checkpointId}`, 
      result, 
      this.httpOptions
    );
  }

  completeAudit(auditId: string, summary: any): Observable<ComplianceAudit> {
    return this.http.post<ComplianceAudit>(
      `${this.apiUrl}/audits/${auditId}/complete`, 
      summary, 
      this.httpOptions
    );
  }

  cancelAudit(auditId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/audits/${auditId}/cancel`, {
      reason
    }, this.httpOptions);
  }

  // Evidence Management
  uploadEvidence(auditId: string, checkpointId: string, files: File[], metadata?: any): Observable<ComplianceEvidence[]> {
    const formData = new FormData();
    
    files.forEach(file => formData.append('files', file));
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.http.post<ComplianceEvidence[]>(
      `${this.apiUrl}/audits/${auditId}/checkpoints/${checkpointId}/evidence`, 
      formData
    );
  }

  getEvidence(evidenceId: string): Observable<ComplianceEvidence> {
    return this.http.get<ComplianceEvidence>(`${this.apiUrl}/evidence/${evidenceId}`);
  }

  downloadEvidence(evidenceId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/evidence/${evidenceId}/download`, {
      responseType: 'blob'
    });
  }

  deleteEvidence(evidenceId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/evidence/${evidenceId}`);
  }

  // Findings Management
  createFinding(auditId: string, findingData: any): Observable<ComplianceFinding> {
    return this.http.post<ComplianceFinding>(
      `${this.apiUrl}/audits/${auditId}/findings`, 
      findingData, 
      this.httpOptions
    );
  }

  updateFinding(findingId: string, updateData: any): Observable<ComplianceFinding> {
    return this.http.put<ComplianceFinding>(
      `${this.apiUrl}/findings/${findingId}`, 
      updateData, 
      this.httpOptions
    );
  }

  resolveFinding(findingId: string, resolution: any): Observable<ComplianceFinding> {
    return this.http.post<ComplianceFinding>(
      `${this.apiUrl}/findings/${findingId}/resolve`, 
      resolution, 
      this.httpOptions
    );
  }

  getFindings(filters?: any): Observable<ComplianceFinding[]> {
    const params = filters ? { params: filters } : {};
    return this.http.get<ComplianceFinding[]>(`${this.apiUrl}/findings`, params);
  }

  getOpenFindings(): Observable<ComplianceFinding[]> {
    return this.http.get<ComplianceFinding[]>(`${this.apiUrl}/findings/open`);
  }

  // Metrics and Reporting
  getComplianceMetrics(timeRange?: string): Observable<ComplianceMetrics> {
    const params = timeRange ? { params: { timeRange } } : {};
    return this.http.get<ComplianceMetrics>(`${this.apiUrl}/metrics`, params);
  }

  generateComplianceReport(reportType: string, filters?: any): Observable<any> {
    const requestData = { reportType, filters };
    return this.http.post(`${this.apiUrl}/reports/generate`, requestData, this.httpOptions);
  }

  getComplianceReport(reportId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/reports/${reportId}`, {
      responseType: 'blob'
    });
  }

  // Regulatory Compliance
  getRegulatoryRequirements(jurisdiction?: string): Observable<any[]> {
    const params = jurisdiction ? { params: { jurisdiction } } : {};
    return this.http.get<any[]>(`${this.apiUrl}/regulatory/requirements`, params);
  }

  checkRegulatoryCompliance(auditId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/regulatory/check/${auditId}`, {}, this.httpOptions);
  }

  // Training and Certification
  getTrainingRequirements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/training/requirements`);
  }

  recordTrainingCompletion(trainingData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/training/complete`, trainingData, this.httpOptions);
  }

  getCertificationStatus(staffId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/certification/status/${staffId}`);
  }

  // Audit Trail
  getAuditTrail(auditId: string): Observable<AuditTrailEntry[]> {
    return this.http.get<AuditTrailEntry[]>(`${this.apiUrl}/audits/${auditId}/trail`);
  }

  addAuditTrailEntry(auditId: string, entry: any): Observable<AuditTrailEntry> {
    return this.http.post<AuditTrailEntry>(
      `${this.apiUrl}/audits/${auditId}/trail`, 
      entry, 
      this.httpOptions
    );
  }

  // Private methods
  private loadInitialData(): void {
    // Load compliance rules
    this.getComplianceRules().subscribe({
      next: (rules) => this.complianceRulesSubject.next(rules),
      error: (error) => console.error('Error loading compliance rules:', error)
    });

    // Load active audits
    this.getActiveAudits().subscribe({
      next: (audits) => this.activeAuditsSubject.next(audits),
      error: (error) => console.error('Error loading active audits:', error)
    });

    // Load metrics
    this.getComplianceMetrics().subscribe({
      next: (metrics) => this.metricsSubject.next(metrics),
      error: (error) => console.error('Error loading compliance metrics:', error)
    });
  }

  // Utility methods
  refreshData(): void {
    this.loadInitialData();
  }

  getCurrentRules(): ComplianceRule[] {
    return this.complianceRulesSubject.value;
  }

  getCurrentActiveAudits(): ComplianceAudit[] {
    return this.activeAuditsSubject.value;
  }

  getCurrentMetrics(): ComplianceMetrics | null {
    return this.metricsSubject.value;
  }

  // Helper methods
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      case 'low': return '';
      default: return '';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'help';
      default: return 'help';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pass': return 'primary';
      case 'completed': return 'primary';
      case 'resolved': return 'primary';
      case 'fail': return 'warn';
      case 'failed': return 'warn';
      case 'warning': return 'accent';
      case 'in_progress': return 'accent';
      case 'open': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pass': return 'check_circle';
      case 'completed': return 'check_circle';
      case 'resolved': return 'check_circle';
      case 'fail': return 'cancel';
      case 'failed': return 'cancel';
      case 'warning': return 'warning';
      case 'in_progress': return 'hourglass_empty';
      case 'open': return 'error';
      default: return 'help';
    }
  }

  calculateComplianceScore(checkResults: ComplianceCheckResult[]): number {
    if (checkResults.length === 0) return 0;
    
    const totalScore = checkResults.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / checkResults.length);
  }

  formatAuditDuration(startedAt: Date, completedAt?: Date): string {
    const end = completedAt || new Date();
    const duration = end.getTime() - startedAt.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  isAuditOverdue(audit: ComplianceAudit): boolean {
    if (audit.status === 'completed') return false;
    
    const now = new Date();
    const startedAt = new Date(audit.startedAt);
    const hoursSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
    
    // Consider audit overdue if it's been more than 24 hours
    return hoursSinceStart > 24;
  }
}