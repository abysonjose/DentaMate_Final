import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NurseService } from '../../services/nurse.service';

@Component({
  selector: 'app-vitals-record-dialog',
  templateUrl: './vitals-record-dialog.component.html',
  styleUrls: ['./vitals-record-dialog.component.scss']
})
export class VitalsRecordDialogComponent implements OnInit {
  vitalsForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private nurseService: NurseService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<VitalsRecordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { patientId: string; patientName: string }
  ) {
    this.vitalsForm = this.fb.group({
      bloodPressureSystolic: ['', [Validators.min(70), Validators.max(250)]],
      bloodPressureDiastolic: ['', [Validators.min(40), Validators.max(150)]],
      heartRate: ['', [Validators.min(30), Validators.max(200)]],
      temperature: ['', [Validators.min(35), Validators.max(42)]],
      respiratoryRate: ['', [Validators.min(8), Validators.max(40)]],
      oxygenSaturation: ['', [Validators.min(70), Validators.max(100)]],
      weight: ['', [Validators.min(1), Validators.max(300)]],
      height: ['', [Validators.min(50), Validators.max(250)]],
      notes: ['']
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.vitalsForm.valid) {
      this.isSubmitting = true;
      
      const vitalsData = {
        patientId: this.data.patientId,
        vitals: this.vitalsForm.value,
        notes: this.vitalsForm.get('notes')?.value
      };

      // Remove empty values
      Object.keys(vitalsData.vitals).forEach(key => {
        if (!vitalsData.vitals[key]) {
          delete vitalsData.vitals[key];
        }
      });

      this.nurseService.recordVitals(vitalsData).subscribe({
        next: (response) => {
          if (response.success) {
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Error recording vitals', 'Close', { duration: 3000 });
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error recording vitals:', error);
          this.snackBar.open('Error recording vitals', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  // Validation helpers
  getBloodPressureError(): string {
    const systolic = this.vitalsForm.get('bloodPressureSystolic');
    const diastolic = this.vitalsForm.get('bloodPressureDiastolic');
    
    if (systolic?.errors?.['min'] || diastolic?.errors?.['min']) {
      return 'Blood pressure values too low';
    }
    if (systolic?.errors?.['max'] || diastolic?.errors?.['max']) {
      return 'Blood pressure values too high';
    }
    return '';
  }

  getHeartRateError(): string {
    const heartRate = this.vitalsForm.get('heartRate');
    if (heartRate?.errors?.['min']) return 'Heart rate too low';
    if (heartRate?.errors?.['max']) return 'Heart rate too high';
    return '';
  }

  getTemperatureError(): string {
    const temperature = this.vitalsForm.get('temperature');
    if (temperature?.errors?.['min']) return 'Temperature too low';
    if (temperature?.errors?.['max']) return 'Temperature too high';
    return '';
  }
}