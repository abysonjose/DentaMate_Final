import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Patient, PreparationStatus } from '../../services/nurse.service';

@Component({
  selector: 'app-patient-preparation-dialog',
  templateUrl: './patient-preparation-dialog.component.html',
  styleUrls: ['./patient-preparation-dialog.component.scss']
})
export class PatientPreparationDialogComponent implements OnInit {
  preparationForm: FormGroup;
  patient: Patient;

  preparationItems = [
    {
      key: 'chairSetup',
      label: 'Chair Setup Complete',
      icon: 'event_seat',
      description: 'Patient chair positioned and adjusted properly'
    },
    {
      key: 'instrumentTray',
      label: 'Instrument Tray Ready',
      icon: 'medical_services',
      description: 'All required instruments sterilized and arranged'
    },
    {
      key: 'ppeReadiness',
      label: 'PPE Readiness Confirmed',
      icon: 'masks',
      description: 'Personal protective equipment available and ready'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PatientPreparationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { patient: Patient }
  ) {
    this.patient = data.patient;
    this.preparationForm = this.createForm();
  }

  ngOnInit(): void {
    this.populateForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      chairSetup: [false],
      instrumentTray: [false],
      ppeReadiness: [false],
      patientReady: [false],
      notes: ['', [Validators.maxLength(500)]]
    });
  }

  private populateForm(): void {
    const preparation = this.patient.preparationStatus;
    this.preparationForm.patchValue({
      chairSetup: preparation.chairSetup,
      instrumentTray: preparation.instrumentTray,
      ppeReadiness: preparation.ppeReadiness,
      patientReady: preparation.patientReady,
      notes: preparation.notes || ''
    });

    // Watch for changes in preparation items to auto-update patientReady
    this.preparationForm.valueChanges.subscribe(values => {
      const allItemsComplete = values.chairSetup && values.instrumentTray && values.ppeReadiness;
      
      if (!allItemsComplete && values.patientReady) {
        this.preparationForm.patchValue({ patientReady: false }, { emitEvent: false });
      }
    });
  }

  getCompletionPercentage(): number {
    const values = this.preparationForm.value;
    const items = [values.chairSetup, values.instrumentTray, values.ppeReadiness, values.patientReady];
    const completed = items.filter(Boolean).length;
    return (completed / items.length) * 100;
  }

  canMarkPatientReady(): boolean {
    const values = this.preparationForm.value;
    return values.chairSetup && values.instrumentTray && values.ppeReadiness;
  }

  markAllItemsComplete(): void {
    this.preparationForm.patchValue({
      chairSetup: true,
      instrumentTray: true,
      ppeReadiness: true
    });
  }

  resetPreparation(): void {
    this.preparationForm.patchValue({
      chairSetup: false,
      instrumentTray: false,
      ppeReadiness: false,
      patientReady: false
    });
  }

  onSave(): void {
    if (this.preparationForm.valid) {
      const formValue = this.preparationForm.value;
      const preparationStatus: PreparationStatus = {
        chairSetup: formValue.chairSetup,
        instrumentTray: formValue.instrumentTray,
        ppeReadiness: formValue.ppeReadiness,
        patientReady: formValue.patientReady,
        notes: formValue.notes
      };

      this.dialogRef.close(preparationStatus);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getStatusText(): string {
    const percentage = this.getCompletionPercentage();
    if (percentage === 100) return 'Patient Ready for Consultation';
    if (percentage >= 75) return 'Almost Ready - Final Check Required';
    if (percentage >= 25) return 'Preparation In Progress';
    return 'Preparation Not Started';
  }

  getStatusColor(): string {
    const percentage = this.getCompletionPercentage();
    if (percentage === 100) return 'primary';
    if (percentage >= 75) return 'accent';
    if (percentage >= 25) return 'warn';
    return 'basic';
  }
}