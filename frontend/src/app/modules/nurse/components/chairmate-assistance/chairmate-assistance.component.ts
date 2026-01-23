import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { NurseService, Patient, AssistanceActivity } from '../../services/nurse.service';

@Component({
  selector: 'app-chairmate-assistance',
  templateUrl: './chairmate-assistance.component.html',
  styleUrls: ['./chairmate-assistance.component.scss']
})
export class ChairmateAssistanceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  activePatients: Patient[] = [];
  assistanceHistory: AssistanceActivity[] = [];
  isLoading = true;

  assistanceTypes = [
    { value: 'chairside-support', label: 'Chairside Support', icon: 'support' },
    { value: 'instrument-handling', label: 'Instrument Handling', icon: 'medical_services' },
    { value: 'post-procedure', label: 'Post-Procedure Care', icon: 'healing' }
  ];

  constructor(
    private nurseService: NurseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    // Load active patients (in consultation)
    this.nurseService.getAssignedPatients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients) => {
          this.activePatients = patients.filter(p => p.status === 'in-consultation');
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading patients:', error);
          this.isLoading = false;
        }
      });
  }

  logAssistance(patient: Patient, type: string, description: string): void {
    const activity: Partial<AssistanceActivity> = {
      patientId: patient.id,
      appointmentId: patient.appointmentId,
      type: type as any,
      description,
      timestamp: new Date().toISOString(),
      duration: 0 // Will be calculated on backend
    };

    this.nurseService.logAssistanceActivity(activity)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Assistance activity logged', 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error logging assistance:', error);
          this.snackBar.open('Error logging assistance', 'Close', { duration: 3000 });
        }
      });
  }

  refreshData(): void {
    this.isLoading = true;
    this.loadData();
  }
}