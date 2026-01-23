import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LabStaffService, DiagnosticReport } from '../../services/lab-staff.service';

interface HistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  testType?: string;
  status?: string;
  patientName?: string;
  doctorName?: string;
}

@Component({
  selector: 'app-diagnostic-history',
  templateUrl: './diagnostic-history.component.html',
  styleUrls: ['./diagnostic-history.component.scss']
})
export class DiagnosticHistoryComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  // Table configuration
  displayedColumns: string[] = [
    'reportId',
    'patientName',
    'testType',
    'status',
    'uploadedAt',
    'doctorName',
    'filesCount',
    'aiProcessing',
    'actions'
  ];

  dataSource = new MatTableDataSource<DiagnosticReport>();
  loading = true;
  totalReports = 0;

  // Filters
  filterForm: FormGroup;
  
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'validated', label: 'Validated' },
    { value: 'finalized', label: 'Finalized' }
  ];

  testTypeOptions = [
    { value: '', label: 'All Tests' },
    { value: 'xray', label: 'X-Ray' },
    { value: 'cbct', label: 'CBCT' },
    { value: 'mri', label: 'MRI' },
    { value: 'ct_scan', label: 'CT Scan' },
    { value: 'ultrasound', label: 'Ultrasound' },
    { value: 'blood_test', label: 'Blood Test' },
    { value: 'urine_test', label: 'Urine Test' },
    { value: 'biopsy', label: 'Biopsy' }
  ];

  // Statistics
  statistics = {
    totalReports: 0,
    draftReports: 0,
    submittedReports: 0,
    finalizedReports: 0,
    averageProcessingTime: 0,
    aiProcessedReports: 0
  };

  constructor(
    private fb: FormBuilder,
    private labStaffService: LabStaffService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.createFilterForm();
  }

  ngOnInit(): void {
    this.loadReports();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private createFilterForm(): FormGroup {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.fb.group({
      dateFrom: [thirtyDaysAgo.toISOString().split('T')[0]],
      dateTo: [today.toISOString().split('T')[0]],
      testType: [''],
      status: [''],
      patientName: [''],
      doctorName: ['']
    });
  }

  private loadReports(): void {
    this.loading = true;
    const filters = this.buildFilters();

    this.labStaffService.getReports(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reports) => {
          this.dataSource.data = reports;
          this.totalReports = reports.length;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading reports:', error);
          this.snackBar.open('Error loading diagnostic history', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private loadStatistics(): void {
    this.labStaffService.getPerformanceStats('month')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = {
            totalReports: stats.totalReports || 0,
            draftReports: stats.draftReports || 0,
            submittedReports: stats.submittedReports || 0,
            finalizedReports: stats.finalizedReports || 0,
            averageProcessingTime: stats.averageProcessingTime || 0,
            aiProcessedReports: stats.aiProcessedReports || 0
          };
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
        }
      });
  }

  private buildFilters(): HistoryFilters {
    const formValue = this.filterForm.value;
    const filters: HistoryFilters = {};

    if (formValue.dateFrom) {
      filters.dateFrom = formValue.dateFrom;
    }

    if (formValue.dateTo) {
      filters.dateTo = formValue.dateTo;
    }

    if (formValue.testType) {
      filters.testType = formValue.testType;
    }

    if (formValue.status) {
      filters.status = formValue.status;
    }

    if (formValue.patientName?.trim()) {
      filters.patientName = formValue.patientName.trim();
    }

    if (formValue.doctorName?.trim()) {
      filters.doctorName = formValue.doctorName.trim();
    }

    return filters;
  }

  onFilterChange(): void {
    this.loadReports();
  }

  clearFilters(): void {
    this.filterForm.reset();
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    this.filterForm.patchValue({
      dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
      testType: '',
      status: '',
      patientName: '',
      doctorName: ''
    });
    
    this.loadReports();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Report Actions
  viewReport(report: DiagnosticReport): void {
    // Open report details dialog or navigate to detailed view
    console.log('View report:', report);
    this.snackBar.open('Report viewer would open here', 'Close', { duration: 2000 });
  }

  downloadReport(report: DiagnosticReport): void {
    // Implement report download
    console.log('Download report:', report);
    this.snackBar.open('Report download would start here', 'Close', { duration: 2000 });
  }

  viewAiResults(report: DiagnosticReport): void {
    if (report.aiProcessingStatus === 'completed' && report.aiResults) {
      // Open AI results dialog
      console.log('View AI results:', report.aiResults);
      this.snackBar.open('AI results viewer would open here', 'Close', { duration: 2000 });
    }
  }

  shareReport(report: DiagnosticReport): void {
    // Implement report sharing functionality
    console.log('Share report:', report);
    this.snackBar.open('Report sharing options would appear here', 'Close', { duration: 2000 });
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'finalized': return 'success';
      case 'validated': return 'primary';
      case 'submitted': return 'accent';
      case 'draft': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'finalized': return 'check_circle';
      case 'validated': return 'verified';
      case 'submitted': return 'send';
      case 'draft': return 'edit';
      default: return 'help';
    }
  }

  getTestTypeIcon(testType: string): string {
    switch (testType) {
      case 'xray': return 'medical_services';
      case 'cbct': return 'scanner';
      case 'mri': return 'mri';
      case 'ct_scan': return 'scanner';
      case 'ultrasound': return 'waves';
      case 'blood_test': return 'bloodtype';
      case 'urine_test': return 'science';
      case 'biopsy': return 'biotech';
      default: return 'medical_services';
    }
  }

  getAiStatusColor(status?: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'primary';
      case 'pending': return 'accent';
      case 'failed': return 'warn';
      default: return '';
    }
  }

  getAiStatusIcon(status?: string): string {
    switch (status) {
      case 'completed': return 'psychology';
      case 'processing': return 'refresh';
      case 'pending': return 'schedule';
      case 'failed': return 'error';
      default: return 'help';
    }
  }

  formatFileCount(files: any[]): string {
    if (!files || files.length === 0) {
      return '0 files';
    }
    
    const imageCount = files.filter(f => f.type === 'image').length;
    const pdfCount = files.filter(f => f.type === 'pdf').length;
    const dicomCount = files.filter(f => f.type === 'dicom').length;
    
    const parts = [];
    if (imageCount > 0) parts.push(`${imageCount} img`);
    if (pdfCount > 0) parts.push(`${pdfCount} pdf`);
    if (dicomCount > 0) parts.push(`${dicomCount} dcm`);
    
    return parts.join(', ') || `${files.length} files`;
  }

  formatProcessingTime(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  exportData(): void {
    // Implement data export functionality
    const filters = this.buildFilters();
    console.log('Export data with filters:', filters);
    this.snackBar.open('Data export would start here', 'Close', { duration: 2000 });
  }

  refreshData(): void {
    this.loadReports();
    this.loadStatistics();
  }

  // Statistics calculations
  getCompletionRate(): number {
    if (this.statistics.totalReports === 0) return 0;
    return Math.round((this.statistics.finalizedReports / this.statistics.totalReports) * 100);
  }

  getAiProcessingRate(): number {
    if (this.statistics.totalReports === 0) return 0;
    return Math.round((this.statistics.aiProcessedReports / this.statistics.totalReports) * 100);
  }
}