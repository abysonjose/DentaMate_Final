import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { NurseService, Patient, NursingNote } from '../../services/nurse.service';
import { NursingNotesDialogComponent } from '../../dialogs/nursing-notes-dialog/nursing-notes-dialog.component';

@Component({
  selector: 'app-nursing-notes',
  templateUrl: './nursing-notes.component.html',
  styleUrls: ['./nursing-notes.component.scss']
})
export class NursingNotesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  patients: Patient[] = [];
  selectedPatient: Patient | null = null;
  nursingNotes: NursingNote[] = [];
  isLoading = true;

  constructor(
    private nurseService: NurseService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadPatients();
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
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading patients:', error);
          this.isLoading = false;
        }
      });
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient = patient;
    this.loadNursingNotes(patient.id);
  }

  private loadNursingNotes(patientId: string): void {
    this.nurseService.getNursingNotes(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.nursingNotes = notes;
        },
        error: (error) => {
          console.error('Error loading nursing notes:', error);
        }
      });
  }

  openNotesDialog(): void {
    if (!this.selectedPatient) return;

    const dialogRef = this.dialog.open(NursingNotesDialogComponent, {
      width: '600px',
      data: { patient: this.selectedPatient }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.selectedPatient) {
        this.loadNursingNotes(this.selectedPatient.id);
      }
    });
  }
}