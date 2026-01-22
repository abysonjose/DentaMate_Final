import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DoctorPrescriptionService, Medication, Prescription, DrugInteraction, AllergyAlert } from '../../services/doctor-prescription.service';

interface DialogData {
  patientId: string;
  patientName: string;
  existingPrescriptions: Prescription[];
}

@Component({
  selector: 'app-prescription-dialog',
  templateUrl: './prescription-dialog.component.html',
  styleUrls: ['./prescription-dialog.component.scss']
})
export class PrescriptionDialogComponent implements OnInit {
  prescriptionForm: FormGroup;
  searchResults: Medication[] = [];
  drugInteractions: DrugInteraction[] = [];
  allergyAlerts: AllergyAlert[] = [];
  isLoading = false;
  isSaving = false;

  frequencyOptions = [
    'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
    'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
    'As needed', 'Before meals', 'After meals', 'At bedtime'
  ];

  durationOptions = [
    '3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '30 days',
    '2 months', '3 months', '6 months', 'Until further notice'
  ];

  constructor(
    private fb: FormBuilder,
    private prescriptionService: DoctorPrescriptionService,
    private dialogRef: MatDialogRef<PrescriptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.prescriptionForm = this.createForm();
  }

  ngOnInit(): void {
    this.setupMedicationSearch();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      medications: this.fb.array([this.createMedicationForm()]),
      notes: [''],
      pharmacyInstructions: [''],
      followUpRequired: [false],
      followUpDate: ['']
    });
  }

  private createMedicationForm(): FormGroup {
    return this.fb.group({
      medicationId: ['', Validators.required],
      medicationName: ['', Validators.required],
      dosage: ['', Validators.required],
      frequency: ['', Validators.required],
      duration: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      instructions: [''],
      substitutionAllowed: [true],
      refillsAllowed: [0, [Validators.min(0), Validators.max(5)]]
    });
  }

  get medications(): FormArray {
    return this.prescriptionForm.get('medications') as FormArray;
  }

  private setupMedicationSearch(): void {
    // Setup search for each medication form
    this.medications.controls.forEach((control, index) => {
      const medicationNameControl = control.get('medicationName');
      if (medicationNameControl) {
        medicationNameControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(query => {
            if (query && query.length >= 2) {
              return this.prescriptionService.searchMedications(query);
            }
            return [];
          })
        ).subscribe(results => {
          this.searchResults = results;
        });
      }
    });
  }

  addMedication(): void {
    const medicationForm = this.createMedicationForm();
    this.medications.push(medicationForm);
    
    // Setup search for the new medication form
    setTimeout(() => {
      this.setupMedicationSearch();
    });
  }

  removeMedication(index: number): void {
    if (this.medications.length > 1) {
      this.medications.removeAt(index);
      this.checkInteractions();
    }
  }

  selectMedication(medication: Medication, index: number): void {
    const medicationControl = this.medications.at(index);
    medicationControl.patchValue({
      medicationId: medication.id,
      medicationName: medication.name
    });
    
    this.searchResults = [];
    this.checkInteractions();
  }

  private checkInteractions(): void {
    const medicationIds = this.medications.controls
      .map(control => control.get('medicationId')?.value)
      .filter(id => id);

    if (medicationIds.length > 1) {
      this.prescriptionService.checkDrugInteractions(medicationIds)
        .subscribe({
          next: (interactions) => {
            this.drugInteractions = interactions;
          },
          error: (error) => console.error('Error checking interactions:', error)
        });
    }

    if (medicationIds.length > 0) {
      this.prescriptionService.checkPatientAllergies(this.data.patientId, medicationIds)
        .subscribe({
          next: (allergies) => {
            this.allergyAlerts = allergies;
          },
          error: (error) => console.error('Error checking allergies:', error)
        });
    }
  }

  validatePrescription(): void {
    if (this.prescriptionForm.valid) {
      const prescriptionData = this.preparePrescriptionData();
      
      this.prescriptionService.validatePrescription(prescriptionData)
        .subscribe({
          next: (validation) => {
            if (validation.isValid) {
              this.savePrescription();
            } else {
              // Show validation errors
              console.log('Validation errors:', validation.errors);
              console.log('Validation warnings:', validation.warnings);
            }
          },
          error: (error) => console.error('Error validating prescription:', error)
        });
    }
  }

  private preparePrescriptionData(): Partial<Prescription> {
    const formValue = this.prescriptionForm.value;
    
    return {
      patientId: this.data.patientId,
      prescriptionDate: new Date(),
      medications: formValue.medications.map((med: any) => ({
        medicationId: med.medicationId,
        medicationName: med.medicationName,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantity: med.quantity,
        instructions: med.instructions,
        substitutionAllowed: med.substitutionAllowed,
        refillsAllowed: med.refillsAllowed,
        refillsRemaining: med.refillsAllowed,
        status: 'active'
      })),
      notes: formValue.notes,
      pharmacyInstructions: formValue.pharmacyInstructions,
      followUpRequired: formValue.followUpRequired,
      followUpDate: formValue.followUpDate,
      status: 'draft',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    };
  }

  private savePrescription(): void {
    this.isSaving = true;
    const prescriptionData = this.preparePrescriptionData();

    this.prescriptionService.createPrescription(prescriptionData)
      .subscribe({
        next: (prescription) => {
          this.isSaving = false;
          this.dialogRef.close(prescription);
        },
        error: (error) => {
          console.error('Error saving prescription:', error);
          this.isSaving = false;
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.prescriptionForm.valid) {
      this.validatePrescription();
    } else {
      // Mark all fields as touched to show validation errors
      this.prescriptionForm.markAllAsTouched();
    }
  }

  getInteractionSeverityColor(severity: string): string {
    switch (severity) {
      case 'contraindicated': return 'warn';
      case 'major': return 'warn';
      case 'moderate': return 'accent';
      case 'minor': return 'primary';
      default: return 'primary';
    }
  }

  getAllergySeverityColor(severity: string): string {
    switch (severity) {
      case 'life-threatening': return 'warn';
      case 'severe': return 'warn';
      case 'moderate': return 'accent';
      case 'mild': return 'primary';
      default: return 'primary';
    }
  }
}