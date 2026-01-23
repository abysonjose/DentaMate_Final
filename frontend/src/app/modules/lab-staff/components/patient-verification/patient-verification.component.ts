import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LabStaffService, DiagnosticRequest } from '../../services/lab-staff.service';
import { PatientVerifyDialogComponent } from '../../dialogs/patient-verify-dialog/patient-verify-dialog.component';

interface PatientInfo {
  id: string;
  name: string;
  dateOfBirth: Date;
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
}

interface VerificationResult {
  verified: boolean;
  verificationMethod: 'id_card' | 'biometric' | 'phone_verification' | 'emergency_contact';
  verifiedBy: string;
  verifiedAt: Date;
  notes: string;
}

@Component({
  selector: 'app-patient-verification',
  templateUrl: './patient-verification.component.html',
  styleUrls: ['./patient-verification.component.scss']
})
export class PatientVerificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  verificationForm: FormGroup;
  searchForm: FormGroup;
  
  // Patient search and selection
  searchResults: DiagnosticRequest[] = [];
  selectedRequest: DiagnosticRequest | null = null;
  patientInfo: PatientInfo | null = null;
  
  // Verification state
  isSearching = false;
  isVerifying = false;
  verificationResult: VerificationResult | null = null;
  
  // Verification methods
  verificationMethods = [
    { value: 'id_card', label: 'Government ID Card', icon: 'badge' },
    { value: 'biometric', label: 'Biometric Verification', icon: 'fingerprint' },
    { value: 'phone_verification', label: 'Phone Verification', icon: 'phone' },
    { value: 'emergency_contact', label: 'Emergency Contact', icon: 'contact_phone' }
  ];

  constructor(
    private fb: FormBuilder,
    private labStaffService: LabStaffService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.searchForm = this.createSearchForm();
    this.verificationForm = this.createVerificationForm();
  }

  ngOnInit(): void {
    this.loadPendingVerifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createSearchForm(): FormGroup {
    return this.fb.group({
      searchType: ['patient_name', Validators.required],
      searchValue: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  private createVerificationForm(): FormGroup {
    return this.fb.group({
      verificationMethod: ['', Validators.required],
      idNumber: [''],
      phoneNumber: [''],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      biometricData: [''],
      verificationNotes: ['', [Validators.required, Validators.maxLength(500)]],
      consentGiven: [false, Validators.requiredTrue]
    });
  }

  private loadPendingVerifications(): void {
    this.labStaffService.getDiagnosticRequests({ 
      status: 'received',
      needsVerification: true 
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.searchResults = requests;
        },
        error: (error) => {
          console.error('Error loading pending verifications:', error);
          this.snackBar.open('Error loading pending verifications', 'Close', { duration: 3000 });
        }
      });
  }

  searchPatients(): void {
    if (!this.searchForm.valid) {
      return;
    }

    this.isSearching = true;
    const { searchType, searchValue } = this.searchForm.value;

    const searchParams = {
      [searchType]: searchValue,
      status: 'received'
    };

    this.labStaffService.getDiagnosticRequests(searchParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.searchResults = requests;
          this.isSearching = false;
          
          if (requests.length === 0) {
            this.snackBar.open('No patients found matching your search', 'Close', { duration: 3000 });
          }
        },
        error: (error) => {
          console.error('Error searching patients:', error);
          this.snackBar.open('Error searching patients', 'Close', { duration: 3000 });
          this.isSearching = false;
        }
      });
  }

  selectPatient(request: DiagnosticRequest): void {
    this.selectedRequest = request;
    this.verificationResult = null;
    this.verificationForm.reset();
    this.loadPatientInfo(request.patientId);
  }

  private loadPatientInfo(patientId: string): void {
    this.labStaffService.getPatientInfo(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patientInfo) => {
          this.patientInfo = patientInfo;
        },
        error: (error) => {
          console.error('Error loading patient info:', error);
          this.snackBar.open('Error loading patient information', 'Close', { duration: 3000 });
        }
      });
  }

  onVerificationMethodChange(): void {
    const method = this.verificationForm.get('verificationMethod')?.value;
    
    // Reset method-specific fields
    this.verificationForm.patchValue({
      idNumber: '',
      phoneNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      biometricData: ''
    });

    // Set validators based on method
    const idNumberControl = this.verificationForm.get('idNumber');
    const phoneNumberControl = this.verificationForm.get('phoneNumber');
    const emergencyContactNameControl = this.verificationForm.get('emergencyContactName');
    const emergencyContactPhoneControl = this.verificationForm.get('emergencyContactPhone');

    // Clear existing validators
    idNumberControl?.clearValidators();
    phoneNumberControl?.clearValidators();
    emergencyContactNameControl?.clearValidators();
    emergencyContactPhoneControl?.clearValidators();

    // Set method-specific validators
    switch (method) {
      case 'id_card':
        idNumberControl?.setValidators([Validators.required, Validators.minLength(5)]);
        break;
      case 'phone_verification':
        phoneNumberControl?.setValidators([Validators.required, Validators.pattern(/^\+?[\d\s-()]+$/)]);
        break;
      case 'emergency_contact':
        emergencyContactNameControl?.setValidators([Validators.required]);
        emergencyContactPhoneControl?.setValidators([Validators.required, Validators.pattern(/^\+?[\d\s-()]+$/)]);
        break;
    }

    // Update validity
    idNumberControl?.updateValueAndValidity();
    phoneNumberControl?.updateValueAndValidity();
    emergencyContactNameControl?.updateValueAndValidity();
    emergencyContactPhoneControl?.updateValueAndValidity();
  }

  openVerificationDialog(): void {
    if (!this.selectedRequest || !this.patientInfo) {
      this.snackBar.open('Please select a patient first', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(PatientVerifyDialogComponent, {
      width: '800px',
      data: {
        request: this.selectedRequest,
        patientInfo: this.patientInfo,
        verificationMethods: this.verificationMethods
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.verified) {
        this.verificationResult = result;
        this.onVerificationSuccess();
      }
    });
  }

  verifyPatient(): void {
    if (!this.verificationForm.valid || !this.selectedRequest) {
      this.snackBar.open('Please complete all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isVerifying = true;
    const verificationData = {
      ...this.verificationForm.value,
      requestId: this.selectedRequest.id,
      patientId: this.selectedRequest.patientId
    };

    this.labStaffService.verifyPatient(this.selectedRequest.patientId, this.selectedRequest.appointmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.verificationResult = {
            verified: true,
            verificationMethod: verificationData.verificationMethod,
            verifiedBy: 'current_user', // This should come from auth service
            verifiedAt: new Date(),
            notes: verificationData.verificationNotes
          };
          this.onVerificationSuccess();
          this.isVerifying = false;
        },
        error: (error) => {
          console.error('Verification error:', error);
          this.snackBar.open('Verification failed', 'Close', { duration: 3000 });
          this.isVerifying = false;
        }
      });
  }

  private onVerificationSuccess(): void {
    this.snackBar.open('Patient verified successfully', 'Close', { duration: 3000 });
    
    // Update request status
    if (this.selectedRequest) {
      this.labStaffService.updateRequestStatus(this.selectedRequest.id, 'in_progress', 'Patient verified')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadPendingVerifications();
          },
          error: (error) => {
            console.error('Error updating request status:', error);
          }
        });
    }
  }

  clearSelection(): void {
    this.selectedRequest = null;
    this.patientInfo = null;
    this.verificationResult = null;
    this.verificationForm.reset();
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.searchResults = [];
    this.clearSelection();
    this.loadPendingVerifications();
  }

  // Utility methods
  getVerificationMethodIcon(method: string): string {
    const methodObj = this.verificationMethods.find(m => m.value === method);
    return methodObj?.icon || 'verified_user';
  }

  getVerificationMethodLabel(method: string): string {
    const methodObj = this.verificationMethods.find(m => m.value === method);
    return methodObj?.label || method;
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'emergency': return 'warn';
      case 'urgent': return 'accent';
      case 'routine': return 'primary';
      default: return '';
    }
  }

  getTestTypeIcon(testType: string): string {
    switch (testType) {
      case 'xray': return 'medical_services';
      case 'cbct': return 'scanner';
      case 'mri': return 'mri';
      case 'ct_scan': return 'scanner';
      case 'ultrasound': return 'waves';
      case 'blood_test': return 'bloodtype';
      case 'urine_test': return 'science';
      case 'biopsy': return 'biotech';
      default: return 'medical_services';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}