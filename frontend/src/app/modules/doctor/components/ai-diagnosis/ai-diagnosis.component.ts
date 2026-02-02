import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DoctorAiService } from '../../services/doctor-ai.service';

@Component({
  selector: 'app-ai-diagnosis',
  templateUrl: './ai-diagnosis.component.html',
  styleUrls: ['./ai-diagnosis.component.scss']
})
export class AiDiagnosisComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  selectedFile: File | null = null;
  selectedPatientId: string = '';
  analysisType: string = 'xray';
  clinicalNotes: string = '';
  
  isAnalyzing = false;
  analysisResult: any = null;
  recentAnalyses: any[] = [];

  analysisTypes = [
    { value: 'xray', label: 'X-Ray' },
    { value: 'intraoral', label: 'Intraoral Photo' },
    { value: 'extraoral', label: 'Extraoral Photo' },
    { value: 'panoramic', label: 'Panoramic X-Ray' },
    { value: 'bitewing', label: 'Bitewing X-Ray' }
  ];

  constructor(
    private aiService: DoctorAiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRecentAnalyses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRecentAnalyses(): void {
    this.aiService.getDoctorAiAnalyses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (analyses) => {
          this.recentAnalyses = analyses.slice(0, 10);
        },
        error: (error) => {
          console.error('Error loading recent analyses:', error);
        }
      });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        this.snackBar.open('Please select a valid image file (JPEG, PNG)', 'Close', { duration: 3000 });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.snackBar.open('File size must be less than 10MB', 'Close', { duration: 3000 });
        return;
      }

      this.selectedFile = file;
    }
  }

  startAnalysis(): void {
    if (!this.selectedFile) {
      this.snackBar.open('Please select an image file', 'Close', { duration: 3000 });
      return;
    }

    if (!this.selectedPatientId) {
      this.snackBar.open('Please enter patient ID', 'Close', { duration: 3000 });
      return;
    }

    this.isAnalyzing = true;
    this.analysisResult = null;

    const analysisRequest = {
      patientId: this.selectedPatientId,
      imageFile: this.selectedFile,
      analysisType: this.analysisType as any,
      clinicalNotes: this.clinicalNotes
    };

    this.aiService.uploadImageForAnalysis(analysisRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Poll for results
          this.pollForResults(response.analysisId);
        },
        error: (error) => {
          console.error('Error starting analysis:', error);
          this.snackBar.open('Error starting AI analysis', 'Close', { duration: 3000 });
          this.isAnalyzing = false;
        }
      });
  }

  private pollForResults(analysisId: string): void {
    const pollInterval = setInterval(() => {
      this.aiService.getAnalysisResult(analysisId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            if (result.status === 'completed') {
              clearInterval(pollInterval);
              this.analysisResult = result;
              this.isAnalyzing = false;
              this.loadRecentAnalyses(); // Refresh recent analyses
              this.snackBar.open('AI analysis completed', 'Close', { duration: 3000 });
            } else if (result.status === 'failed') {
              clearInterval(pollInterval);
              this.isAnalyzing = false;
              this.snackBar.open('AI analysis failed', 'Close', { duration: 3000 });
            }
          },
          error: (error) => {
            clearInterval(pollInterval);
            console.error('Error getting analysis result:', error);
            this.isAnalyzing = false;
            this.snackBar.open('Error getting analysis result', 'Close', { duration: 3000 });
          }
        });
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (this.isAnalyzing) {
        this.isAnalyzing = false;
        this.snackBar.open('Analysis timeout - please check results later', 'Close', { duration: 5000 });
      }
    }, 300000);
  }

  resetForm(): void {
    this.selectedFile = null;
    this.selectedPatientId = '';
    this.analysisType = 'xray';
    this.clinicalNotes = '';
    this.analysisResult = null;
    
    // Reset file input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  viewAnalysis(analysis: any): void {
    this.analysisResult = analysis;
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'primary';
    if (confidence >= 0.6) return 'accent';
    return 'warn';
  }

  getUrgencyColor(urgency: string): string {
    switch (urgency?.toLowerCase()) {
      case 'urgent': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      case 'low': return '';
      default: return 'primary';
    }
  }

  getFindingIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'caries': return 'warning';
      case 'bone-loss': return 'trending_down';
      case 'impaction': return 'block';
      case 'fracture': return 'broken_image';
      case 'restoration': return 'build';
      case 'anomaly': return 'error';
      case 'pathology': return 'medical_services';
      default: return 'info';
    }
  }
}