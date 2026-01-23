import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LabStaffService } from '../../services/lab-staff.service';

export interface PatientVerifyDialogData {
  patientId: string;
  patientName: string;
  requestId: string;
  appointmentId?: string;
}

export interface PatientVerificationResult {
  verified: boolean;
  patientData?: any;
  verificationMethod: 'manual' | 'appointment' | 'id_check';
  notes?: string;
}

@Component({
  selector: 'app-patient-verify-dialog',
  templateUrl: './patient-verify-dialog.component.html',
  styleUrls: ['./patient-verify-dialog.component.scss']
})
export class PatientVerifyDialogComponent implements OnInit {
  verificationForm: FormGroup;
  isLoading = false;
  verificationStep = 1;
  maxSteps = 3;
  
  // Patient data from verification
  patientData: any = null;
  verificationChecks = {
    nameMatch: false,
    idMatch: false,
    appointmentMatch: false,
    consentGiven: false
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PatientVerifyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PatientVerifyDialogData,
    private labStaffService: LabStaffService,
    private snackBar: MatSnackBar
  ) {
    this.verificationForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadPatientData();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Step 1: Basic verification
      patientIdConfirm: ['', [Validators.required]],
      patientNameConfirm: ['', [Validators.required]],
      
      // Step 2: Additional checks
      dateOfBirth: [''],
      phoneNumber: [''],
      appointmentConfirm: [false],
      
      // Step 3: Final verification
      identityVerified: [false, [Validators.requiredTrue]],
      consentGiven: [false, [Validators.requiredTrue]],
      verificationNotes: ['']
    });
  }

  private loadPatientData(): void {
    this.isLoading = true;
    
    this.labStaffService.verifyPatient(this.data.patientId, this.data.appointmentId)
      .subscribe({
        next: (response) => {
          this.patientData = response.patientData;
          this.isLoading = false;
          
          // Pre-fill known data
          this.verificationForm.patchValue({
            patientIdConfirm: this.data.patientId,
            patientNameConfirm: this.data.patientName
          });
        },
        error: (error) => {
          console.error('Error loading patient data:', error);
          this.snackBar.open('Error loading patient data', 'Close', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
  }

  onNextStep(): void {
    if (this.verificationStep < this.maxSteps) {
      if (this.validateCurrentStep()) {
        this.verificationStep++;
        this.updateVerificationChecks();
      }
    }
  }

  onPreviousStep(): void {
    if (this.verificationStep > 1) {
      this.verificationStep--;
    }
  }

  onVerifyPatient(): void {
    if (this.verificationForm.valid && this.allChecksPass()) {
      const result: PatientVerificationResult = {
        verified: true,
        patientData: this.patientData,
        verificationMethod: this.getVerificationMethod(),
        notes: this.verificationForm.get('verificationNotes')?.value
      };
      
      this.dialogRef.close(result);
    } else {
      this.snackBar.open('Please complete all verification steps', 'Close', {
        duration: 3000
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close({ verified: false });
  }

  private validateCurrentStep(): boolean {
    switch (this.verificationStep) {
      case 1:
        return this.verificationForm.get('patientIdConfirm')?.valid && 
               this.verificationForm.get('patientNameConfirm')?.valid;
      case 2:
        return true; // Optional fields
      case 3:
        return this.verificationForm.get('identityVerified')?.valid && 
               this.verificationForm.get('consentGiven')?.valid;
      default:
        return false;
    }
  }

  private updateVerificationChecks(): void {
    const formValue = this.verificationForm.value;
    
    // Check name match
    this.verificationChecks.nameMatch = 
      formValue.patientNameConfirm?.toLowerCase() === this.data.patientName.toLowerCase();
    
    // Check ID match
    this.verificationChecks.idMatch = 
      formValue.patientIdConfirm === this.data.patientId;
    
    // Check appointment match
    this.verificationChecks.appointmentMatch = 
      !this.data.appointmentId || formValue.appointmentConfirm;
    
    // Check consent
    this.verificationChecks.consentGiven = formValue.consentGiven;
  }

  private allChecksPass(): boolean {
    return Object.values(this.verificationChecks).every(check => check === true);
  }

  private getVerificationMethod(): 'manual' | 'appointment' | 'id_check' {
    if (this.data.appointmentId && this.verificationForm.get('appointmentConfirm')?.value) {
      return 'appointment';
    }
    return 'manual';
  }

  // Utility methods
  getStepTitle(): string {
    switch (this.verificationStep) {
      case 1: return 'Basic Information';
      case 2: return 'Additional Verification';
      case 3: return 'Final Confirmation';
      default: return 'Verification';
    }
  }

  getStepDescription(): string {
    switch (this.verificationStep) {
      case 1: return 'Verify patient identity and basic information';
      case 2: return 'Additional checks for enhanced security';
      case 3: return 'Final confirmation and consent';
      default: return '';
    }
  }

  isStepValid(): boolean {
    return this.validateCurrentStep();
  }

  canProceed(): boolean {
    return this.isStepValid() && !this.isLoading;
  }

  getCheckIcon(check: boolean): string {
    return check ? 'check_circle' : 'radio_button_unchecked';
  }

  getCheckColor(check: boolean): string {
    return check ? 'primary' : '';
  }
}