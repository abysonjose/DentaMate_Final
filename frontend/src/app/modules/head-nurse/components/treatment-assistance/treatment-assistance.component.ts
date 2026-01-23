import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { HeadNurseService, TreatmentAssistance } from '../../services/head-nurse.service';
import { TreatmentNotesDialogComponent } from '../../dialogs/treatment-notes-dialog/treatment-notes-dialog.component';

@Component({
  selector: 'app-treatment-assistance',
  templateUrl: './treatment-assistance.component.html',
  styleUrls: ['./treatment-assistance.component.scss']
})
export class TreatmentAssistanceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  treatmentRecords: TreatmentAssistance[] = [];
  filteredRecords: TreatmentAssistance[] = [];
  
  displayedColumns: string[] = ['timestamp', 'patientName', 'doctorName', 'nurseName', 'roomNumber', 'assistanceType', 'status', 'actions'];
  
  filterOptions = {
    status: 'all',
    assistanceType: 'all',
    searchTerm: '',
    dateRange: 'today'
  };

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ];

  assistanceTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'chairside_assistance', label: 'Chairside Assistance' },
    { value: 'patient_preparation', label: 'Patient Preparation' },
    { value: 'sterilization', label: 'Sterilization' },
    { value: 'post_procedure_care', label: 'Post-Procedure Care' },
    { value: 'equipment_setup', label: 'Equipment Setup' }
  ];

  dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  assistanceMetrics = {
    totalRecords: 0,
    pendingAssistance: 0,
    inProgressAssistance: 0,
    completedToday: 0,
    avgResponseTime: '5 min'
  };

  constructor(
    private headNurseService: HeadNurseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTreatmentRecords();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTreatmentRecords(): void {
    this.headNurseService.getTreatmentAssistanceRecords()
      .pipe(takeUntil(this.destroy$))
      .subscribe(records => {
        this.treatmentRecords = records;
        this.updateMetrics();
        this.applyFilters();
      });
  }

  private updateMetrics(): void {
    this.assistanceMetrics.totalRecords = this.treatmentRecords.length;
    this.assistanceMetrics.pendingAssistance = this.treatmentRecords.filter(r => r.status === 'pending').length;
    this.assistanceMetrics.inProgressAssistance = this.treatmentRecords.filter(r => r.status === 'in_progress').length;
    
    // Calculate completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.assistanceMetrics.completedToday = this.treatmentRecords.filter(r => 
      r.status === 'completed' && new Date(r.timestamp) >= today
    ).length;
  }

  applyFilters(): void {
    this.filteredRecords = this.treatmentRecords.filter(record => {
      const matchesStatus = this.filterOptions.status === 'all' || record.status === this.filterOptions.status;
      const matchesType = this.filterOptions.assistanceType === 'all' || record.assistanceType === this.filterOptions.assistanceType;
      const matchesSearch = !this.filterOptions.searchTerm || 
        record.patientName.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase()) ||
        record.doctorName.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase()) ||
        record.nurseName.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase());
      
      const matchesDateRange = this.matchesDateRange(record);
      
      return matchesStatus && matchesType && matchesSearch && matchesDateRange;
    });
  }

  private matchesDateRange(record: TreatmentAssistance): boolean {
    const recordDate = new Date(record.timestamp);
    const today = new Date();
    
    switch (this.filterOptions.dateRange) {
      case 'today':
        return recordDate.toDateString() === today.toDateString();
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return recordDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return recordDate >= monthAgo;
      default:
        return true;
    }
  }

  addTreatmentNotes(record: TreatmentAssistance): void {
    const dialogRef = this.dialog.open(TreatmentNotesDialogComponent, {
      width: '600px',
      data: { record }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.headNurseService.updateTreatmentAssistanceRecord(record.id, {
          notes: result.notes,
          status: result.status
        }).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Treatment notes updated successfully', 'Close', { duration: 3000 });
            this.loadTreatmentRecords();
          },
          error: (error) => {
            this.snackBar.open('Failed to update treatment notes', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  updateRecordStatus(record: TreatmentAssistance, newStatus: string): void {
    this.headNurseService.updateTreatmentAssistanceRecord(record.id, { status: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Status updated successfully', 'Close', { duration: 3000 });
          this.loadTreatmentRecords();
        },
        error: (error) => {
          this.snackBar.open('Failed to update status', 'Close', { duration: 3000 });
        }
      });
  }

  getStatusColor(status: string): string {
    const colors = {
      'pending': 'accent',
      'in_progress': 'primary',
      'completed': 'primary'
    };
    return colors[status] || 'basic';
  }

  getStatusIcon(status: string): string {
    const icons = {
      'pending': 'schedule',
      'in_progress': 'play_circle',
      'completed': 'check_circle'
    };
    return icons[status] || 'help';
  }

  getAssistanceTypeIcon(type: string): string {
    const icons = {
      'chairside_assistance': 'medical_services',
      'patient_preparation': 'person_pin',
      'sterilization': 'cleaning_services',
      'post_procedure_care': 'healing',
      'equipment_setup': 'build'
    };
    return icons[type] || 'help_outline';
  }

  canUpdateStatus(record: TreatmentAssistance): boolean {
    return record.status !== 'completed';
  }

  refreshData(): void {
    this.loadTreatmentRecords();
  }
}