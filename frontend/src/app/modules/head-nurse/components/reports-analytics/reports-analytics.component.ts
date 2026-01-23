import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { HeadNurseService } from '../../services/head-nurse.service';

interface ReportData {
  nursingWorkload: any;
  patientTurnaround: any;
  shiftEfficiency: any;
  complianceMetrics: any;
}

@Component({
  selector: 'app-reports-analytics',
  templateUrl: './reports-analytics.component.html',
  styleUrls: ['./reports-analytics.component.scss']
})
export class ReportsAnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  reportForm: FormGroup;
  reportData: ReportData = {
    nursingWorkload: null,
    patientTurnaround: null,
    shiftEfficiency: null,
    complianceMetrics: null
  };
  
  isLoading = false;
  
  reportTypes = [
    {
      id: 'nursing_workload',
      title: 'Nursing Workload Report',
      description: 'Analyze nursing staff workload distribution and efficiency',
      icon: 'people'
    },
    {
      id: 'patient_turnaround',
      title: 'Patient Turnaround Report',
      description: 'Track patient preparation to consultation time metrics',
      icon: 'timeline'
    },
    {
      id: 'shift_efficiency',
      title: 'Shift Efficiency Report',
      description: 'Monitor shift performance and productivity metrics',
      icon: 'schedule'
    },
    {
      id: 'compliance_metrics',
      title: 'Compliance Metrics Report',
      description: 'Review compliance tracking and protocol adherence',
      icon: 'fact_check'
    }
  ];

  dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' }
  ];

  constructor(
    private headNurseService: HeadNurseService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.reportForm = this.fb.group({
      reportType: ['nursing_workload'],
      dateRange: ['week'],
      startDate: [new Date()],
      endDate: [new Date()]
    });
  }

  ngOnInit(): void {
    this.generateReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generateReport(): void {
    if (this.reportForm.valid) {
      this.isLoading = true;
      const formValue = this.reportForm.value;
      
      const { startDate, endDate } = this.getDateRange(formValue.dateRange, formValue.startDate, formValue.endDate);
      
      switch (formValue.reportType) {
        case 'nursing_workload':
          this.generateNursingWorkloadReport(startDate, endDate);
          break;
        case 'patient_turnaround':
          this.generatePatientTurnaroundReport(startDate, endDate);
          break;
        case 'shift_efficiency':
          this.generateShiftEfficiencyReport(startDate, endDate);
          break;
        case 'compliance_metrics':
          this.generateComplianceMetricsReport(startDate, endDate);
          break;
      }
    }
  }

  private getDateRange(range: string, customStart: Date, customEnd: Date): { startDate: Date, endDate: Date } {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = new Date(today);

    switch (range) {
      case 'today':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case 'custom':
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
    }

    return { startDate, endDate };
  }

  private generateNursingWorkloadReport(startDate: Date, endDate: Date): void {
    this.headNurseService.getNursingWorkloadReport(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reportData.nursingWorkload = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.snackBar.open('Failed to generate nursing workload report', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  private generatePatientTurnaroundReport(startDate: Date, endDate: Date): void {
    this.headNurseService.getPatientTurnaroundReport(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reportData.patientTurnaround = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.snackBar.open('Failed to generate patient turnaround report', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  private generateShiftEfficiencyReport(startDate: Date, endDate: Date): void {
    // Mock data for shift efficiency
    this.reportData.shiftEfficiency = {
      averageShiftProductivity: 85,
      totalShifts: 14,
      efficientShifts: 12,
      shiftMetrics: [
        { date: '2024-01-15', productivity: 88, patientsHandled: 45, avgTurnaround: 22 },
        { date: '2024-01-16', productivity: 92, patientsHandled: 52, avgTurnaround: 18 },
        { date: '2024-01-17', productivity: 78, patientsHandled: 38, avgTurnaround: 28 }
      ]
    };
    this.isLoading = false;
  }

  private generateComplianceMetricsReport(startDate: Date, endDate: Date): void {
    // Mock data for compliance metrics
    this.reportData.complianceMetrics = {
      overallComplianceRate: 94,
      totalChecklists: 28,
      completedChecklists: 26,
      categoryBreakdown: [
        { category: 'PPE Usage', rate: 98, completed: 7, total: 7 },
        { category: 'Sterilization', rate: 95, completed: 6, total: 7 },
        { category: 'Waste Disposal', rate: 92, completed: 6, total: 7 },
        { category: 'Room Preparation', rate: 90, completed: 6, total: 7 }
      ]
    };
    this.isLoading = false;
  }

  downloadReport(): void {
    const reportType = this.reportForm.get('reportType')?.value;
    const reportInfo = this.reportTypes.find(r => r.id === reportType);
    
    // Mock download functionality
    this.snackBar.open(`Downloading ${reportInfo?.title}...`, 'Close', { duration: 2000 });
  }

  exportToPDF(): void {
    const reportType = this.reportForm.get('reportType')?.value;
    const reportInfo = this.reportTypes.find(r => r.id === reportType);
    
    // Mock PDF export functionality
    this.snackBar.open(`Exporting ${reportInfo?.title} to PDF...`, 'Close', { duration: 2000 });
  }

  getCurrentReportInfo() {
    const reportType = this.reportForm.get('reportType')?.value;
    return this.reportTypes.find(r => r.id === reportType);
  }

  getCurrentReportData() {
    const reportType = this.reportForm.get('reportType')?.value;
    return this.reportData[reportType as keyof ReportData];
  }

  isCustomDateRange(): boolean {
    return this.reportForm.get('dateRange')?.value === 'custom';
  }
}