import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { NurseService, Patient } from '../../services/nurse.service';

@Component({
  selector: 'app-medical-records-view',
  templateUrl: './medical-records-view.component.html',
  styleUrls: ['./medical-records-view.component.scss']
})
export class MedicalRecordsViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  patients: Patient[] = [];
  selectedPatient: Patient | null = null;
  medicalRecord: any = null;
  isLoading = true;

  constructor(private nurseService: NurseService) {}

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
    this.loadMedicalRecord(patient.id);
  }

  private loadMedicalRecord(patientId: string): void {
    this.nurseService.getPatientMedicalRecord(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (record) => {
          this.medicalRecord = record;
        },
        error: (error) => {
          console.error('Error loading medical record:', error);
        }
      });
  }
}