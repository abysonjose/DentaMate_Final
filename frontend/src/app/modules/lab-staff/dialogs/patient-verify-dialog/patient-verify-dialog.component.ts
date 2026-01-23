import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LabStaffService } from '../../services/lab-staff.service';
import { DiagnosticService } from '../../services/diagnostic.service';

export interface PatientVerifyDialogData {
  patientId: string;
  patientName: string;
  appointmentId: string;
}

@Component({
  selector: 'app-patient-verify-dialog',
  templateUrl: './patient-verify-dialog.component.html',
  styleUrls: ['./patient-verify-dialog.component.scss']
})
export class PatientVerifyDialogComponent implements OnInit {
  verificationForm: FormGroup;
  patientDetails: any = null;
  isLoading = false;
  isVerifying = false;
  verificationMethods = [
    { value: 'ID_CARD', label: 'Government ID Card', icon: 'badge' },
    { value: 'INSURANCE_CARD', label: 'Insurance Card', icon: 'credit_card' },
    { value: 'APPOINTMENT_CONFIRMATION', label: 'Appointment Confirmation', icon: 'confirmation_number' },
    { value: 'BIOMETRIC', label: 'Biometric Verification', icon: 'fingerprint' },
    { value: 'VERBAL_CONFIRMATION', label: 'Verbal Confirmation', icon: 'record_voice_over' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PatientVerifyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PatientVerifyDialogData,
    private labStaffService: LabStaffService,
    private diagnosticService: DiagnosticService,
    private snackBar: MatSnackBar
  ) {
    this.verificationForm = this.fb.group({
      verificationMethod: ['', Validators.required],
      idNumber: [''],
      dateOfBirth: [''],
      phoneNumber: [''],
      address: [''],
      emergencyContact: [''],
      verificationNotes: ['', [Validators.required, Validators.minLength(10)]],
      confirmIdentity: [false, Validators.requiredTrue],
      confirmAppointment: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    this.loadPatientDetails();
    this.setupFormValidation();
  }

  private loadPatientDetails(): void {
    this.isLoading = true;
    this.labStaffService.getPatientDetails(this.data.patientId)
      .subscribe({
        next: (details) => {
          this.patientDetails = details;
          this.prefillForm(details);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading patient details:', error);
          this.snackBar.open('Error loading patient details', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  private prefillForm(details: any): void {
    // Pre-fill form with known patient information for verification
    this.verificationForm.patchValue({
      dateOfBirth: details.dateOfBirth ? new Date(details.dateOfBirth) : null,
      phoneNumber: details.phoneNumber || '',
      address: details.address || '',
      emergencyContact: details.emergencyContact || ''
    });
  }

  private setupFormValidation(): void {
    // Dynamic validation based on verification method
    this.verificationForm.get('verificationMethod')?.valueChanges.subscribe(method => {
      this.updateValidationRules(method);
    });
  }

  private updateValidationRules(method: string): void {
    const idNumberControl = this.verificationForm.get('idNumber');
    const dobControl = this.verificationForm.get('dateOfBirth');
    const phoneControl = this.verificationForm.get('phoneNumber');

    // Clear existing validators
    idNumberControl?.clearValidators();
    dobControl?.clearValidators();
    phoneControl?.clearValidators();

    // Set validators based on verification method
    switch (method) {
      case 'ID_CARD':
        idNumberControl?.setValidators([Validators.required, Validators.minLength(5)]);
        dobControl?.setValidators([Validators.required]);
        break;
      case 'INSURANCE_CARD':
        idNumberControl?.setValidators([Validators.required]);
        dobControl?.setValidators([Validators.required]);
        break;
      case 'APPOINTMENT_CONFIRMATION':
        phoneControl?.setValidators([Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]);
        break;
      case 'VERBAL_CONFIRMATION':
        dobControl?.setValidators([Validators.required]);
        phoneControl?.setValidators([Validators.required]);
        break;
    }

    // Update form validation
    idNumberControl?.updateValueAndValidity();
    dobControl?.updateValueAndValidity();
    phoneControl?.updateValueAndValidity();
  }

  verifyPatient(): void {
    if (this.verificationForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isVerifying = true;
    const formValue = this.verificationForm.value;

    const verificationData = {
      method: formValue.verificationMethod,
      idNumber: formValue.idNumber,
      dateOfBirth: formValue.dateOfBirth,
      phoneNumber: formValue.phoneNumber,
      address: formValue.address,
      emergencyContact: formValue.emergencyContact,
      notes: formValue.verificationNotes,
      appointmentId: this.data.appointmentId,
      verifiedAt: new Date()
    };

    this.diagnosticService.verifyPatientIdentity(this.data.patientId, verificationData)
      .subscribe({
        next: (result) => {
          if (result.verified) {
            this.snackBar.open('Patient verified successfully', 'Close', { duration: 3000 });
            this.dialogRef.close({
              verified: true,
              verificationData: verificationData
            });
          } else {
            this.snackBar.open('Patient verification failed', 'Close', { duration: 3000 });
            this.isVerifying = false;
          }
        },
        error: (error) => {
          console.error('Verification error:', error);
          this.snackBar.open('Verification failed. Please try again.', 'Close', { duration: 3000 });
          this.isVerifying = false;
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.verificationForm.controls).forEach(key => {
      const control = this.verificationForm.get(key);
      control?.markAsTouched();
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  getVerificationMethodIcon(method: string): string {
    const methodObj = this.verificationMethods.find(m => m.value === method);
    return methodObj?.icon || 'verified_user';
  }

  isFieldRequired(fieldName: string): boolean {
    const control = this.verificationForm.get(fieldName);
    return control?.hasError('required') && control?.touched || false;
  }

  formatPatientInfo(info: any): string {
    if (!info) return 'N/A';
    if (typeof info === 'string') return info;
    if (info instanceof Date) return info.toLocaleDateString();
    return JSON.stringify(info);
  }

  // Security check for sensitive operations
  performSecurityCheck(): void {
    // Additional security verification if needed
    // This could include biometric verification, supervisor approval, etc.
  }

  // Audit trail logging
  private logVerificationAttempt(success: boolean, method: string): void {
    this.labStaffService.logActivity('PATIENT_VERIFICATION', {
      patientId: this.data.patientId,
      appointmentId: this.data.appointmentId,
      method: method,
      success: success,
      timestamp: new Date()
    }).subscribe();
  }

  // Helper method to validate date of birth
  validateDateOfBirth(): boolean {
    const enteredDOB = this.verificationForm.get('dateOfBirth')?.value;
    const patientDOB = this.patientDetails?.dateOfBirth;
    
    if (!enteredDOB || !patientDOB) return false;
    
    const entered = new Date(enteredDOB);
    const patient = new Date(patientDOB);
    
    return entered.getTime() === patient.getTime();
  }

  // Helper method to validate phone number
  validatePhoneNumber(): boolean {
    const enteredPhone = this.verificationForm.get('phoneNumber')?.value;
    const patientPhone = this.patientDetails?.phoneNumber;
    
    if (!enteredPhone || !patientPhone) return false;
    
    // Remove formatting and compare
    const cleanEntered = enteredPhone.replace(/\D/g, '');
    const cleanPatient = patientPhone.replace(/\D/g, '');
    
    return cleanEntered === cleanPatient;
  }
}