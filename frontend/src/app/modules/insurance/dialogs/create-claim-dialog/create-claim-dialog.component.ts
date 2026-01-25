import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InsuranceService, DocumentType } from '../../services/insurance.service';

@Component({
  selector: 'app-create-claim-dialog',
  templateUrl: './create-claim-dialog.component.html',
  styleUrls: ['./create-claim-dialog.component.scss']
})
export class CreateClaimDialogComponent implements OnInit {
  claimForm: FormGroup;
  loading = false;
  patients: any[] = [];
  insuranceProviders: string[] = [
    'Blue Cross Blue Shield',
    'Aetna',
    'Cigna',
    'UnitedHealthcare',
    'Humana',
    'MetLife',
    'Delta Dental',
    'Guardian',
    'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateClaimDialogComponent>,
    private insuranceService: InsuranceService,
    private snackBar: MatSnackBar
  ) {
    this.claimForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadPatients();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      patientId: ['', Validators.required],
      insuranceProvider: ['', Validators.required],
      policyNumber: ['', Validators.required],
      treatmentDate: ['', Validators.required],
      treatmentDescription: ['', Validators.required],
      billedAmount: ['', [Validators.required, Validators.min(0.01)]],
      diagnosisCode: [''],
      procedureCode: [''],
      notes: ['']
    });
  }

  private loadPatients(): void {
    // Mock patient data - in real implementation, this would come from a patient service
    this.patients = [
      { id: '1', name: 'John Doe', phone: '(555) 123-4567' },
      { id: '2', name: 'Jane Smith', phone: '(555) 234-5678' },
      { id: '3', name: 'Bob Johnson', phone: '(555) 345-6789' }
    ];
  }

  onPatientSelected(patientId: string): void {
    if (patientId) {
      // Load patient insurance information
      this.insuranceService.getPatientInsurance(patientId).subscribe({
        next: (insuranceList) => {
          if (insuranceList.length > 0) {
            const activeInsurance = insuranceList.find(ins => ins.isActive);
            if (activeInsurance) {
              this.claimForm.patchValue({
                insuranceProvider: activeInsurance.insuranceProvider,
                policyNumber: activeInsurance.policyNumber
              });
            }
          }
        },
        error: (error) => {
          console.error('Error loading patient insurance:', error);
        }
      });
    }
  }

  onSubmit(): void {
    if (this.claimForm.valid) {
      this.loading = true;
      
      const claimData = {
        ...this.claimForm.value,
        status: 'DRAFT',
        submissionDate: new Date(),
        createdBy: 'current-user-id' // This should come from auth service
      };

      this.insuranceService.createClaim(claimData).subscribe({
        next: (claim) => {
          this.snackBar.open('Claim created successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close(claim);
        },
        error: (error) => {
          console.error('Error creating claim:', error);
          this.snackBar.open('Error creating claim. Please try again.', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.claimForm.controls).forEach(key => {
      const control = this.claimForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.claimForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (control?.hasError('min')) {
      return `${fieldName} must be greater than 0`;
    }
    return '';
  }
}