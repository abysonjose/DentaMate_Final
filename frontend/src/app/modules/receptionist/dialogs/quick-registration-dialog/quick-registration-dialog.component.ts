import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PatientRegistrationService, Patient } from '../../services/patient-registration.service';
import { ReceptionistService } from '../../services/receptionist.service';

@Component({
  selector: 'app-quick-registration-dialog',
  templateUrl: './quick-registration-dialog.component.html',
  styleUrls: ['./quick-registration-dialog.component.scss']
})
export class QuickRegistrationDialogComponent implements OnInit {
  registrationForm: FormGroup;
  loading = false;
  duplicateCheck = false;
  duplicatePatients: any[] = [];

  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<QuickRegistrationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private patientService: PatientRegistrationService,
    private receptionistService: ReceptionistService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Auto-focus on first name field
    setTimeout(() => {
      const firstNameInput = document.getElementById('firstName');
      if (firstNameInput) {
        firstNameInput.focus();
      }
    }, 100);
  }

  private initializeForm(): void {
    this.registrationForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      email: ['', [Validators.email]],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      address: this.fb.group({
        street: [''],
        city: [''],
        state: [''],
        zipCode: [''],
        country: ['']
      }),
      emergencyContact: this.fb.group({
        name: ['', Validators.required],
        relationship: ['', Validators.required],
        phoneNumber: ['', [Validators.required, Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]]
      })
    });

    // Watch for phone number changes to check duplicates
    this.registrationForm.get('phoneNumber')?.valueChanges.subscribe(phoneNumber => {
      if (phoneNumber && this.patientService.validatePhoneNumber(phoneNumber)) {
        this.checkForDuplicates(phoneNumber);
      }
    });
  }

  private checkForDuplicates(phoneNumber: string): void {
    this.duplicateCheck = true;
    const email = this.registrationForm.get('email')?.value;
    
    this.patientService.checkDuplicatePatient(phoneNumber, email).subscribe({
      next: (result) => {
        this.duplicateCheck = false;
        if (result.isDuplicate) {
          this.duplicatePatients = result.existingPatients;
          this.showWarning('Patient with this phone number already exists');
        } else {
          this.duplicatePatients = [];
        }
      },
      error: (error) => {
        this.duplicateCheck = false;
        console.error('Duplicate check error:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.registerPatient();
    } else {
      this.markFormGroupTouched();
    }
  }

  private registerPatient(): void {
    this.loading = true;
    const formValue = this.registrationForm.value;
    
    const patientData = {
      ...formValue,
      branchId: this.getCurrentBranchId(),
      status: 'active' as const
    };

    this.patientService.quickRegisterPatient(patientData).subscribe({
      next: (patient) => {
        this.loading = false;
        this.logActivity(patient);
        this.showSuccess('Patient registered successfully');
        this.dialogRef.close(patient);
      },
      error: (error) => {
        this.loading = false;
        console.error('Registration error:', error);
        this.showError('Failed to register patient');
      }
    });
  }

  private logActivity(patient: Patient): void {
    this.receptionistService.logActivity({
      type: 'registration',
      description: `Registered new patient: ${patient.firstName} ${patient.lastName}`,
      icon: 'person_add',
      userId: this.getCurrentUserId()
    }).subscribe();
  }

  selectExistingPatient(patient: any): void {
    this.dialogRef.close(patient);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Form Validation Helpers
  getFieldError(fieldName: string): string {
    const field = this.registrationForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        return `Please enter a valid ${this.getFieldLabel(fieldName).toLowerCase()}`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      phoneNumber: 'Phone Number',
      email: 'Email',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender'
    };
    return labels[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registrationForm.controls).forEach(key => {
      const control = this.registrationForm.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(nestedKey => {
          control.get(nestedKey)?.markAsTouched();
        });
      }
    });
  }

  // Utility Methods
  private getCurrentBranchId(): string {
    return localStorage.getItem('currentBranchId') || '';
  }

  private getCurrentUserId(): string {
    return localStorage.getItem('currentUserId') || '';
  }

  // Auto-fill helpers
  onPhoneNumberInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    this.registrationForm.patchValue({ phoneNumber: value });
  }

  onNameInput(event: any, field: string): void {
    const value = event.target.value.replace(/[^a-zA-Z\s]/g, '');
    this.registrationForm.patchValue({ [field]: value });
  }

  // Date validation
  maxDate = new Date();
  minDate = new Date(new Date().getFullYear() - 150, 0, 1);

  // Quick fill for common relationships
  commonRelationships = [
    'Spouse',
    'Parent',
    'Child',
    'Sibling',
    'Friend',
    'Guardian',
    'Other'
  ];

  // Keyboard shortcuts
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          this.onSubmit();
          break;
        case 'escape':
          event.preventDefault();
          this.onCancel();
          break;
      }
    }
  }

  // Notification Methods
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showWarning(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['warning-snackbar']
    });
  }
}