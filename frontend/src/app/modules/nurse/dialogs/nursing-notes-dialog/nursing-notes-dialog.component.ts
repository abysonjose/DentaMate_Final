import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NurseService, Patient, NursingNote } from '../../services/nurse.service';

@Component({
  selector: 'app-nursing-notes-dialog',
  templateUrl: './nursing-notes-dialog.component.html',
  styleUrls: ['./nursing-notes-dialog.component.scss']
})
export class NursingNotesDialogComponent {
  notesForm: FormGroup;
  patient: Patient;

  noteTypes = [
    { value: 'vital-signs', label: 'Vital Signs' },
    { value: 'observation', label: 'General Observation' },
    { value: 'care-instruction', label: 'Care Instructions' },
    { value: 'discomfort', label: 'Patient Discomfort' }
  ];

  constructor(
    private fb: FormBuilder,
    private nurseService: NurseService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<NursingNotesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { patient: Patient }
  ) {
    this.patient = data.patient;
    this.notesForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      type: ['observation', Validators.required],
      content: ['', [Validators.required, Validators.maxLength(1000)]],
      bloodPressure: [''],
      heartRate: [''],
      temperature: [''],
      oxygenSaturation: ['']
    });
  }

  onSave(): void {
    if (this.notesForm.valid) {
      const formValue = this.notesForm.value;
      const note: Partial<NursingNote> = {
        patientId: this.patient.id,
        appointmentId: this.patient.appointmentId,
        type: formValue.type,
        content: formValue.content,
        timestamp: new Date().toISOString()
      };

      if (formValue.type === 'vital-signs') {
        note.vitalSigns = {
          bloodPressure: formValue.bloodPressure,
          heartRate: formValue.heartRate,
          temperature: formValue.temperature,
          oxygenSaturation: formValue.oxygenSaturation
        };
      }

      this.nurseService.createNursingNote(note).subscribe({
        next: () => {
          this.snackBar.open('Nursing note saved successfully', 'Close', { duration: 2000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error saving note:', error);
          this.snackBar.open('Error saving nursing note', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  isVitalSigns(): boolean {
    return this.notesForm.get('type')?.value === 'vital-signs';
  }
}