import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DoctorPatientService, PatientProfile, MedicalRecord } from '../../services/doctor-patient.service';
import { DoctorPrescriptionService, Prescription } from '../../services/doctor-prescription.service';
import { DoctorAppointmentService, Appointment } from '../../services/doctor-appointment.service';
import { PrescriptionDialogComponent } from '../../dialogs/prescription-dialog/prescription-dialog.component';
import { LabRequestDialogComponent } from '../../dialogs/lab-request-dialog/lab-request-dialog.component';

interface ConsultationData {
  chiefComplaint: string;
  symptoms: string[];
  clinicalFindings: string;
  diagnosis: string;
  treatmentPlan: string;
  notes: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  prescriptionRequired: boolean;
  labTestsRequired: boolean;
}

@Component({
  selector: 'app-consultation-workspace',
  templateUrl: './consultation-workspace.component.html',
  styleUrls: ['./consultation-workspace.component.scss']
})
export class ConsultationWorkspaceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  patientId: string = '';
  patient: PatientProfile | null = null;
  currentAppointment: Appointment | null = null;
  medicalHistory: MedicalRecord[] = [];
  activePrescriptions: Prescription[] = [];
  
  consultationData: ConsultationData = {
    chiefComplaint: '',
    symptoms: [],
    clinicalFindings: '',
    diagnosis: '',
    treatmentPlan: '',
    notes: '',
    followUpRequired: false,
    prescriptionRequired: false,
    labTestsRequired: false
  };

  availableSymptoms = [
    'Tooth pain', 'Gum bleeding', 'Sensitivity', 'Swelling', 'Bad breath',
    'Jaw pain', 'Difficulty chewing', 'Loose tooth', 'Cracked tooth',
    'Mouth sores', 'Dry mouth', 'Metallic taste'
  ];

  isLoading = true;
  isSaving = false;
  consultationStarted = false;
  consultationCompleted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: DoctorPatientService,
    private prescriptionService: DoctorPrescriptionService,
    private appointmentService: DoctorAppointmentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.patientId = params['patientId'];
      this.loadPatientData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatientData(): void {
    this.isLoading = true;

    // Load patient profile
    this.patientService.getPatientProfile(this.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          this.patient = patient;
        },
        error: (error) => {
          console.error('Error loading patient profile:', error);
          this.snackBar.open('Error loading patient data', 'Close', { duration: 3000 });
        }
      });

    // Load medical history
    this.patientService.getPatientMedicalHistory(this.patientId, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.medicalHistory = history;
        },
        error: (error) => console.error('Error loading medical history:', error)
      });

    // Load active prescriptions
    this.prescriptionService.getPatientPrescriptions(this.patientId, 'active')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prescriptions) => {
          this.activePrescriptions = prescriptions;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading prescriptions:', error);
          this.isLoading = false;
        }
      });

    // Get current appointment if exists
    this.appointmentService.getCurrentConsultation()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointment) => {
          if (appointment && appointment.patientId === this.patientId) {
            this.currentAppointment = appointment;
            this.consultationStarted = appointment.status === 'in-progress';
          }
        }
      });
  }

  // Consultation Management
  startConsultation(): void {
    if (!this.currentAppointment) return;

    this.appointmentService.startConsultation(this.currentAppointment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointment) => {
          this.currentAppointment = appointment;
          this.consultationStarted = true;
          this.snackBar.open('Consultation started', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error starting consultation:', error);
          this.snackBar.open('Error starting consultation', 'Close', { duration: 3000 });
        }
      });
  }

  saveConsultationNotes(): void {
    if (!this.currentAppointment) return;

    this.isSaving = true;
    this.appointmentService.updateConsultationNotes(
      this.currentAppointment.id, 
      this.consultationData.notes
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('Notes saved', 'Close', { duration: 2000 });
      },
      error: (error) => {
        console.error('Error saving notes:', error);
        this.isSaving = false;
        this.snackBar.open('Error saving notes', 'Close', { duration: 3000 });
      }
    });
  }

  completeConsultation(): void {
    if (!this.currentAppointment || !this.validateConsultationData()) return;

    this.isSaving = true;
    this.appointmentService.completeConsultation(this.currentAppointment.id, {
      consultationNotes: this.consultationData.notes,
      diagnosis: this.consultationData.diagnosis,
      followUpRequired: this.consultationData.followUpRequired,
      followUpDate: this.consultationData.followUpDate,
      prescriptionRequired: this.consultationData.prescriptionRequired,
      labTestsRequired: this.consultationData.labTestsRequired
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (appointment) => {
        this.currentAppointment = appointment;
        this.consultationCompleted = true;
        this.isSaving = false;
        
        // Create medical record
        this.createMedicalRecord();
        
        this.snackBar.open('Consultation completed successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error completing consultation:', error);
        this.isSaving = false;
        this.snackBar.open('Error completing consultation', 'Close', { duration: 3000 });
      }
    });
  }

  private validateConsultationData(): boolean {
    if (!this.consultationData.chiefComplaint.trim()) {
      this.snackBar.open('Chief complaint is required', 'Close', { duration: 3000 });
      return false;
    }
    
    if (!this.consultationData.diagnosis.trim()) {
      this.snackBar.open('Diagnosis is required', 'Close', { duration: 3000 });
      return false;
    }

    if (this.consultationData.followUpRequired && !this.consultationData.followUpDate) {
      this.snackBar.open('Follow-up date is required', 'Close', { duration: 3000 });
      return false;
    }

    return true;
  }

  private createMedicalRecord(): void {
    const record: Partial<MedicalRecord> = {
      patientId: this.patientId,
      visitDate: new Date(),
      appointmentType: this.currentAppointment?.type || 'consultation',
      chiefComplaint: this.consultationData.chiefComplaint,
      symptoms: this.consultationData.symptoms,
      clinicalFindings: this.consultationData.clinicalFindings,
      diagnosis: this.consultationData.diagnosis,
      treatmentPlan: this.consultationData.treatmentPlan,
      followUpRequired: this.consultationData.followUpRequired,
      followUpDate: this.consultationData.followUpDate,
      notes: this.consultationData.notes,
      prescriptions: [],
      labRequests: [],
      attachments: []
    };

    this.patientService.createMedicalRecord(this.patientId, record)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdRecord) => {
          this.medicalHistory.unshift(createdRecord);
        },
        error: (error) => console.error('Error creating medical record:', error)
      });
  }

  // Symptom Management
  addSymptom(symptom: string): void {
    if (!this.consultationData.symptoms.includes(symptom)) {
      this.consultationData.symptoms.push(symptom);
    }
  }

  removeSymptom(symptom: string): void {
    const index = this.consultationData.symptoms.indexOf(symptom);
    if (index > -1) {
      this.consultationData.symptoms.splice(index, 1);
    }
  }

  addCustomSymptom(symptom: string): void {
    if (symptom.trim() && !this.consultationData.symptoms.includes(symptom.trim())) {
      this.consultationData.symptoms.push(symptom.trim());
    }
  }

  // Dialog Actions
  openPrescriptionDialog(): void {
    const dialogRef = this.dialog.open(PrescriptionDialogComponent, {
      width: '800px',
      data: {
        patientId: this.patientId,
        patientName: this.getPatientFullName(),
        existingPrescriptions: this.activePrescriptions
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.consultationData.prescriptionRequired = true;
        // Refresh prescriptions
        this.loadActivePrescriptions();
      }
    });
  }

  openLabRequestDialog(): void {
    const dialogRef = this.dialog.open(LabRequestDialogComponent, {
      width: '600px',
      data: {
        patientId: this.patientId,
        patientName: this.getPatientFullName()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.consultationData.labTestsRequired = true;
      }
    });
  }

  private loadActivePrescriptions(): void {
    this.prescriptionService.getPatientPrescriptions(this.patientId, 'active')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prescriptions) => {
          this.activePrescriptions = prescriptions;
        },
        error: (error) => console.error('Error loading prescriptions:', error)
      });
  }

  // Utility Methods
  getPatientFullName(): string {
    if (!this.patient) return '';
    return `${this.patient.personalInfo.firstName} ${this.patient.personalInfo.lastName}`;
  }

  getPatientAge(): number {
    if (!this.patient) return 0;
    const today = new Date();
    const birthDate = new Date(this.patient.personalInfo.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  // Navigation
  goToPatientProfile(): void {
    this.router.navigate(['/doctor/patient', this.patientId]);
  }

  goBack(): void {
    this.router.navigate(['/doctor/dashboard']);
  }

  // Auto-save functionality
  private setupAutoSave(): void {
    // Auto-save notes every 30 seconds
    setInterval(() => {
      if (this.consultationStarted && !this.consultationCompleted && this.consultationData.notes.trim()) {
        this.saveConsultationNotes();
      }
    }, 30000);
  }
}