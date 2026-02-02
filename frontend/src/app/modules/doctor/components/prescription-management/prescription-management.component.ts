import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DoctorPrescriptionService } from '../../services/doctor-prescription.service';
import { PrescriptionDialogComponent } from '../../dialogs/prescription-dialog/prescription-dialog.component';

@Component({
  selector: 'app-prescription-management',
  templateUrl: './prescription-management.component.html',
  styleUrls: ['./prescription-management.component.scss']
})
export class PrescriptionManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  prescriptions: any[] = [];
  recentPrescriptions: any[] = [];
  isLoading = false;

  displayedColumns = ['date', 'patient', 'medications', 'status', 'actions'];

  constructor(
    private prescriptionService: DoctorPrescriptionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPrescriptions(): void {
    this.isLoading = true;

    // Load recent prescriptions
    this.prescriptionService.getRecentPrescriptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.prescriptions = response.data || [];
          this.recentPrescriptions = this.prescriptions.slice(0, 10);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading prescriptions:', error);
          this.isLoading = false;
        }
      });
  }

  createNewPrescription(): void {
    const dialogRef = this.dialog.open(PrescriptionDialogComponent, {
      width: '700px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPrescriptions(); // Refresh data
        this.snackBar.open('Prescription created successfully', 'Close', { duration: 3000 });
      }
    });
  }

  viewPrescription(prescription: any): void {
    const dialogRef = this.dialog.open(PrescriptionDialogComponent, {
      width: '700px',
      data: { mode: 'view', prescription }
    });
  }

  editPrescription(prescription: any): void {
    const dialogRef = this.dialog.open(PrescriptionDialogComponent, {
      width: '700px',
      data: { mode: 'edit', prescription }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPrescriptions(); // Refresh data
        this.snackBar.open('Prescription updated successfully', 'Close', { duration: 3000 });
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'primary';
      case 'completed': return '';
      case 'cancelled': return 'warn';
      default: return 'primary';
    }
  }

  getMedicationSummary(medications: any[]): string {
    if (!medications || medications.length === 0) return 'No medications';
    if (medications.length === 1) return medications[0].name;
    return `${medications[0].name} + ${medications.length - 1} more`;
  }
}