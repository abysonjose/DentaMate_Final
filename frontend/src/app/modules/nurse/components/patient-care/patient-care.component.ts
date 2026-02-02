import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NurseService } from '../../services/nurse.service';
import { VitalsRecordDialogComponent } from '../../dialogs/vitals-record-dialog/vitals-record-dialog.component';
import { CareNotesDialogComponent } from '../../dialogs/care-notes-dialog/care-notes-dialog.component';

@Component({
  selector: 'app-patient-care',
  templateUrl: './patient-care.component.html',
  styleUrls: ['./patient-care.component.scss']
})
export class PatientCareComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  patientId: string | null = null;
  patient: any = null;
  careHistory: any[] = [];
  vitalsHistory: any[] = [];
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private nurseService: NurseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.patientId = params['patientId'];
        if (this.patientId) {
          this.loadPatientData();
          
          // Auto-open vitals dialog if action is vitals
          if (params['action'] === 'vitals') {
            setTimeout(() => this.recordVitals(), 500);
          }
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
    this.nurseService.getPatientDetails(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.patient = response.data;
        },
        error: (error) => {
          console.error('Error loading patient details:', error);
          this.snackBar.open('Error loading patient details', 'Close', { duration: 3000 });
        }
      });

    // Load care history
    this.nurseService.getPatientCareHistory(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.careHistory = response.data || [];
        },
        error: (error) => {
          console.error('Error loading care history:', error);
        }
      });

    // Load vitals history
    this.nurseService.getPatientVitalsHistory(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.vitalsHistory = response.data || [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading vitals history:', error);
          this.isLoading = false;
        }
      });
  }

  recordVitals(): void {
    const dialogRef = this.dialog.open(VitalsRecordDialogComponent, {
      width: '600px',
      data: { 
        patientId: this.patientId,
        patientName: this.patient?.firstName + ' ' + this.patient?.lastName
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPatientData(); // Refresh data
        this.snackBar.open('Vitals recorded successfully', 'Close', { duration: 3000 });
      }
    });
  }

  addCareNotes(): void {
    const dialogRef = this.dialog.open(CareNotesDialogComponent, {
      width: '600px',
      data: { 
        patientId: this.patientId,
        patientName: this.patient?.firstName + ' ' + this.patient?.lastName
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPatientData(); // Refresh data
        this.snackBar.open('Care notes added successfully', 'Close', { duration: 3000 });
      }
    });
  }

  getVitalStatus(vital: any): string {
    // Simple logic to determine vital status based on normal ranges
    if (vital.type === 'blood_pressure') {
      const [systolic, diastolic] = vital.value.split('/').map(Number);
      if (systolic > 140 || diastolic > 90) return 'high';
      if (systolic < 90 || diastolic < 60) return 'low';
      return 'normal';
    }
    
    if (vital.type === 'heart_rate') {
      const rate = Number(vital.value);
      if (rate > 100) return 'high';
      if (rate < 60) return 'low';
      return 'normal';
    }
    
    if (vital.type === 'temperature') {
      const temp = Number(vital.value);
      if (temp > 37.5) return 'high';
      if (temp < 36.0) return 'low';
      return 'normal';
    }
    
    return 'normal';
  }

  getVitalStatusColor(status: string): string {
    switch (status) {
      case 'high': return 'warn';
      case 'low': return 'accent';
      default: return 'primary';
    }
  }

  getVitalIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'blood_pressure': return 'favorite';
      case 'heart_rate': return 'monitor_heart';
      case 'temperature': return 'device_thermostat';
      case 'respiratory_rate': return 'air';
      case 'oxygen_saturation': return 'bloodtype';
      case 'weight': return 'monitor_weight';
      case 'height': return 'height';
      default: return 'health_and_safety';
    }
  }

  getCareNoteTypeColor(type: string): string {
    switch (type?.toLowerCase()) {
      case 'incident': return 'warn';
      case 'urgent': return 'accent';
      default: return 'primary';
    }
  }

  getCareNoteIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'observation': return 'visibility';
      case 'medication': return 'medication';
      case 'procedure': return 'healing';
      case 'assessment': return 'assignment';
      case 'education': return 'school';
      case 'discharge': return 'exit_to_app';
      case 'incident': return 'warning';
      default: return 'note';
    }
  }
}