import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReceptionistService } from '../../services/receptionist.service';

@Component({
  selector: 'app-patient-registration-dialog',
  templateUrl: './patient-registration-dialog.component.html',
  styleUrls: ['./patient-registration-dialog.component.scss']
})
export class PatientRegistrationDialogComponent implements OnInit {
  registrationForm: FormGroup;
  isSubmitting = false;

  genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
  ];

  relationships = [
    { value: 'spouse', label: 'Spouse' },
    { value: 'parent', label: 'Parent' },
    { value: 'child', label: 'Child' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'friend', label: 'Friend' },
    { value: 'other', label: 'Other' }
  ];

  constructor(
    private fb: FormBuilder,
    private receptionistService: ReceptionistService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<PatientRegistrationDialogComponent>
  ) {
    this.registrationForm = this.fb.group({
      // Personal Information
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      
      // Address Information
      street: ['', [Validators.required, Validators.maxLength(100)]],
      city: ['', [Validators.required, Validators.maxLength(50)]],
      state: ['', [Validators.required, Validators.maxLength(50)]],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5,6}$/)]],
      
      // Emergency Contact
      emergencyName: ['', [Validators.required, Validators.maxLength(100)]],
      emergencyPhone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      emergencyRelationship: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isSubmitting = true;
      
      const formValue = this.registrationForm.value;
      const patientData = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        phone: formValue.phone,
        dateOfBirth: formValue.dateOfBirth,
        gender: formValue.gender,
        address: {
          street: formValue.street,
          city: formValue.city,
          state: formValue.state,
          zipCode: formValue.zipCode
        },
        emergencyContact: {
          name: formValue.emergencyName,
          phone: formValue.emergencyPhone,
          relationship: formValue.emergencyRelationship
        }
      };

      this.receptionistService.registerPatient(patientData).subscribe({
        next: (response) => {
          if (response.success) {
            this.dialogRef.close(response.data);
            this.snackBar.open('Patient registered successfully', 'Close', { duration: 3000 });
          } else {
            this.snackBar.open(response.message || 'Error registering patient', 'Close', { duration: 3000 });
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error registering patient:', error);
          this.snackBar.open('Error registering patient', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  // Validation helpers
  getEmailError(): string {
    const email = this.registrationForm.get('email');
    if (email?.errors?.['required']) return 'Email is required';
    if (email?.errors?.['email']) return 'Please enter a valid email';
    return '';
  }

  getPhoneError(): string {
    const phone = this.registrationForm.get('phone');
    if (phone?.errors?.['required']) return 'Phone number is required';
    if (phone?.errors?.['pattern']) return 'Please enter a valid phone number';
    return '';
  }

  getEmergencyPhoneError(): string {
    const phone = this.registrationForm.get('emergencyPhone');
    if (phone?.errors?.['required']) return 'Emergency phone is required';
    if (phone?.errors?.['pattern']) return 'Please enter a valid phone number';
    return '';
  }

  getZipCodeError(): string {
    const zipCode = this.registrationForm.get('zipCode');
    if (zipCode?.errors?.['required']) return 'ZIP code is required';
    if (zipCode?.errors?.['pattern']) return 'Please enter a valid ZIP code (5-6 digits)';
    return '';
  }
}