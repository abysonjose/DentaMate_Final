import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DoctorPatientService } from '../../services/doctor-patient.service';

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss']
})
export class PatientProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  patientId: string | null = null;
  patient: any = null;
  medicalHistory: any[] = [];
  prescriptions: any[] = [];
  reports: any[] = [];
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private patientService: DoctorPatientService
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.patientId = params['patientId'];
        if (this.patientId) {
          this.loadPatientData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatientData(): void {
    if (!this.patientId) return;
    
    this.isLoading = true;

    // Load patient details
    this.patientService.getPatientDetails(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.patient = response.data;
        },
        error: (error) => {
          console.error('Error loading patient details:', error);
        }
      });

    // Load medical history
    this.patientService.getMedicalHistory(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.medicalHistory = response.data || [];
        },
        error: (error) => {
          console.error('Error loading medical history:', error);
        }
      });

    // Load prescriptions
    this.patientService.getPrescriptions(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.prescriptions = response.data || [];
        },
        error: (error) => {
          console.error('Error loading prescriptions:', error);
        }
      });

    // Load reports
    this.patientService.getReports(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.reports = response.data || [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading reports:', error);
          this.isLoading = false;
        }
      });
  }

  getConditionSeverity(condition: string): string {
    // Simple logic to determine condition severity
    const severityKeywords = {
      'critical': ['emergency', 'critical', 'severe', 'acute'],
      'moderate': ['moderate', 'chronic', 'persistent'],
      'mild': ['mild', 'minor', 'slight']
    };

    const conditionLower = condition.toLowerCase();
    
    if (severityKeywords.critical.some(keyword => conditionLower.includes(keyword))) {
      return 'critical';
    }
    if (severityKeywords.moderate.some(keyword => conditionLower.includes(keyword))) {
      return 'moderate';
    }
    return 'mild';
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'warn';
      case 'moderate': return 'accent';
      case 'mild': return 'primary';
      default: return 'primary';
    }
  }

  getReportTypeColor(type: string): string {
    switch (type?.toLowerCase()) {
      case 'lab': return 'primary';
      case 'xray': return 'accent';
      case 'ct': return 'warn';
      case 'mri': return 'primary';
      default: return 'primary';
    }
  }

  getReportIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'lab': return 'science';
      case 'xray': return 'medical_services';
      case 'ct': return 'scanner';
      case 'mri': return 'psychology';
      default: return 'description';
    }
  }

  viewReport(reportId: string): void {
    // Implementation for viewing report details
    console.log('View report:', reportId);
  }
}