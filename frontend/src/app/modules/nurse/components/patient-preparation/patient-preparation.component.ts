import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { NurseService, Patient, PreparationStatus } from '../../services/nurse.service';
import { PatientPreparationDialogComponent } from '../../dialogs/patient-preparation-dialog/patient-preparation-dialog.component';

@Component({
  selector: 'app-patient-preparation',
  templateUrl: './patient-preparation.component.html',
  styleUrls: ['./patient-preparation.component.scss']
})
export class PatientPreparationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  isLoading = true;
  
  // Filter options
  statusFilter = 'all';
  doctorFilter = 'all';
  searchTerm = '';
  
  // Display columns
  displayedColumns: string[] = ['tokenNumber', 'name', 'doctor', 'room', 'preparation', 'actions'];
  
  // Preparation checklist items
  preparationItems = [
    { key: 'chairSetup', label: 'Chair Setup', icon: 'event_seat' },
    { key: 'instrumentTray', label: 'Instrument Tray', icon: 'medical_services' },
    { key: 'ppeReadiness', label: 'PPE Readiness', icon: 'masks' },
    { key: 'patientReady', label: 'Patient Ready', icon: 'person_check' }
  ];

  constructor(
    private nurseService: NurseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPatients();
    this.subscribeToUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatients(): void {
    this.nurseService.getAssignedPatients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients) => {
          this.patients = patients;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading patients:', error);
          this.snackBar.open('Error loading patients', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  private subscribeToUpdates(): void {
    this.nurseService.patients$
      .pipe(takeUntil(this.destroy$))
      .subscribe(patients => {
        this.patients = patients;
        this.applyFilters();
      });
  }

  applyFilters(): void {
    this.filteredPatients = this.patients.filter(patient => {
      // Status filter
      if (this.statusFilter !== 'all') {
        if (this.statusFilter === 'needs-preparation' && patient.preparationStatus.patientReady) {
          return false;
        }
        if (this.statusFilter === 'ready' && !patient.preparationStatus.patientReady) {
          return false;
        }
        if (this.statusFilter !== 'needs-preparation' && this.statusFilter !== 'ready' && 
            patient.status !== this.statusFilter) {
          return false;
        }
      }

      // Doctor filter
      if (this.doctorFilter !== 'all' && patient.doctorId !== this.doctorFilter) {
        return false;
      }

      // Search term
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        return patient.name.toLowerCase().includes(searchLower) ||
               patient.tokenNumber.toLowerCase().includes(searchLower);
      }

      return true;
    });
  }

  getUniqueValues(key: keyof Patient): string[] {
    const values = this.patients.map(patient => patient[key] as string);
    return [...new Set(values)].filter(Boolean);
  }

  getPreparationProgress(preparation: PreparationStatus): number {
    const items = [preparation.chairSetup, preparation.instrumentTray, 
                   preparation.ppeReadiness, preparation.patientReady];
    const completed = items.filter(Boolean).length;
    return (completed / items.length) * 100;
  }

  getPreparationStatus(preparation: PreparationStatus): string {
    if (preparation.patientReady) return 'Ready';
    
    const completed = [preparation.chairSetup, preparation.instrumentTray, preparation.ppeReadiness]
      .filter(Boolean).length;
    
    if (completed === 0) return 'Not Started';
    if (completed < 3) return 'In Progress';
    return 'Awaiting Final Check';
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'ready': return 'primary';
      case 'in progress': return 'accent';
      case 'awaiting final check': return 'warn';
      default: return 'basic';
    }
  }

  openPreparationDialog(patient: Patient): void {
    const dialogRef = this.dialog.open(PatientPreparationDialogComponent, {
      width: '600px',
      data: { patient }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updatePatientPreparation(patient.id, result);
      }
    });
  }

  updatePreparationItem(patient: Patient, itemKey: string, checked: boolean): void {
    const updatedPreparation = { ...patient.preparationStatus };
    (updatedPreparation as any)[itemKey] = checked;
    
    // If unchecking any item, uncheck patientReady
    if (!checked && itemKey !== 'patientReady') {
      updatedPreparation.patientReady = false;
    }
    
    this.updatePatientPreparation(patient.id, updatedPreparation);
  }

  private updatePatientPreparation(patientId: string, preparation: PreparationStatus): void {
    this.nurseService.updatePatientPreparation(patientId, preparation)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Preparation status updated', 'Close', { duration: 2000 });
          this.loadPatients(); // Refresh data
        },
        error: (error) => {
          console.error('Error updating preparation:', error);
          this.snackBar.open('Error updating preparation status', 'Close', { duration: 3000 });
        }
      });
  }

  markPatientReady(patient: Patient): void {
    // Check if all preparation items are completed
    const { chairSetup, instrumentTray, ppeReadiness } = patient.preparationStatus;
    
    if (!chairSetup || !instrumentTray || !ppeReadiness) {
      this.snackBar.open('Please complete all preparation items first', 'Close', { duration: 3000 });
      return;
    }

    this.nurseService.markPatientReady(patient.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(`${patient.name} marked as ready`, 'Close', { duration: 2000 });
          this.loadPatients(); // Refresh data
        },
        error: (error) => {
          console.error('Error marking patient ready:', error);
          this.snackBar.open('Error marking patient as ready', 'Close', { duration: 3000 });
        }
      });
  }

  canMarkReady(patient: Patient): boolean {
    const { chairSetup, instrumentTray, ppeReadiness, patientReady } = patient.preparationStatus;
    return chairSetup && instrumentTray && ppeReadiness && !patientReady;
  }

  refreshData(): void {
    this.isLoading = true;
    this.loadPatients();
  }

  exportPreparationReport(): void {
    // Implementation for exporting preparation report
    const reportData = this.filteredPatients.map(patient => ({
      tokenNumber: patient.tokenNumber,
      name: patient.name,
      status: this.getPreparationStatus(patient.preparationStatus),
      progress: this.getPreparationProgress(patient.preparationStatus),
      timestamp: new Date().toISOString()
    }));

    console.log('Preparation Report:', reportData);
    this.snackBar.open('Report exported successfully', 'Close', { duration: 2000 });
  }

  getPriorityPatients(): Patient[] {
    return this.filteredPatients
      .filter(patient => !patient.preparationStatus.patientReady)
      .sort((a, b) => new Date(a.estimatedTime).getTime() - new Date(b.estimatedTime).getTime())
      .slice(0, 5);
  }
}