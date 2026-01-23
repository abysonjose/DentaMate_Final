import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CheckInService, CheckInRequest, CheckInResponse, PendingCheckIn } from '../../services/check-in.service';
import { PatientRegistrationService, PatientSearchResult } from '../../services/patient-registration.service';
import { AppointmentService } from '../../services/appointment.service';
import { CheckInConfirmationDialogComponent } from '../../dialogs/check-in-confirmation-dialog/check-in-confirmation-dialog.component';

@Component({
  selector: 'app-check-in',
  templateUrl: './check-in.component.html',
  styleUrls: ['./check-in.component.scss']
})
export class CheckInComponent implements OnInit, OnDestroy {
  @ViewChild('qrScanner', { static: false }) qrScanner!: ElementRef;
  @ViewChild('patientSearch', { static: false }) patientSearchInput!: ElementRef;

  private destroy$ = new Subject<void>();

  // Forms
  manualCheckInForm: FormGroup;
  qrCheckInForm: FormGroup;

  // Data
  pendingCheckIns: PendingCheckIn[] = [];
  patientSearchResults: PatientSearchResult[] = [];
  selectedPatient: PatientSearchResult | null = null;
  patientAppointments: any[] = [];

  // UI State
  activeTab = 0;
  loading = false;
  qrScannerActive = false;
  searchLoading = false;

  // Check-in methods
  checkInMethods = [
    { value: 'manual', label: 'Manual Check-In', icon: 'person' },
    { value: 'qr', label: 'QR Code Scan', icon: 'qr_code_scanner' },
    { value: 'nfc', label: 'NFC Card', icon: 'nfc' }
  ];

  constructor(
    private fb: FormBuilder,
    private checkInService: CheckInService,
    private patientService: PatientRegistrationService,
    private appointmentService: AppointmentService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadPendingCheckIns();
    this.setupPatientSearch();
    this.subscribeToUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopQRScanner();
  }

  private initializeForms(): void {
    this.manualCheckInForm = this.fb.group({
      patientSearch: ['', Validators.required],
      appointmentId: [''],
      notes: ['']
    });

    this.qrCheckInForm = this.fb.group({
      qrData: ['', Validators.required]
    });
  }

  private setupPatientSearch(): void {
    this.manualCheckInForm.get('patientSearch')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        if (query && query.length >= 2) {
          this.searchPatients(query);
        } else {
          this.patientSearchResults = [];
        }
      });
  }

  private loadPendingCheckIns(): void {
    this.checkInService.getPendingCheckIns()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (checkIns) => {
          this.pendingCheckIns = checkIns;
        },
        error: (error) => {
          console.error('Error loading pending check-ins:', error);
          this.showError('Failed to load pending check-ins');
        }
      });
  }

  private subscribeToUpdates(): void {
    this.checkInService.pendingCheckIns$
      .pipe(takeUntil(this.destroy$))
      .subscribe(checkIns => {
        this.pendingCheckIns = checkIns;
      });
  }

  // Patient Search
  searchPatients(query: string): void {
    this.searchLoading = true;
    this.patientService.searchPatients(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.patientSearchResults = results;
          this.searchLoading = false;
        },
        error: (error) => {
          console.error('Error searching patients:', error);
          this.searchLoading = false;
          this.showError('Failed to search patients');
        }
      });
  }

  selectPatient(patient: PatientSearchResult): void {
    this.selectedPatient = patient;
    this.manualCheckInForm.patchValue({
      patientSearch: `${patient.fullName} (${patient.registrationId})`
    });
    this.patientSearchResults = [];
    this.loadPatientAppointments(patient.id);
  }

  private loadPatientAppointments(patientId: string): void {
    this.appointmentService.getPatientTodayAppointments(patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointments) => {
          this.patientAppointments = appointments;
        },
        error: (error) => {
          console.error('Error loading patient appointments:', error);
        }
      });
  }

  // Manual Check-In
  performManualCheckIn(): void {
    if (!this.selectedPatient) {
      this.showError('Please select a patient');
      return;
    }

    const formValue = this.manualCheckInForm.value;
    const request: CheckInRequest = {
      patientId: this.selectedPatient.id,
      appointmentId: formValue.appointmentId || undefined,
      checkInMethod: 'manual',
      branchId: this.getCurrentBranchId(),
      notes: formValue.notes
    };

    this.executeCheckIn(request);
  }

  // QR Code Check-In
  startQRScanner(): void {
    this.qrScannerActive = true;
    // Initialize QR scanner
    // Implementation would depend on your QR scanning library
    this.initializeQRScanner();
  }

  stopQRScanner(): void {
    this.qrScannerActive = false;
    // Stop QR scanner
  }

  private initializeQRScanner(): void {
    // QR scanner initialization logic
    // This would use a library like @zxing/ngx-scanner or similar
  }

  onQRCodeScanned(qrData: string): void {
    this.qrCheckInForm.patchValue({ qrData });
    this.performQRCheckIn();
  }

  performQRCheckIn(): void {
    const qrData = this.qrCheckInForm.value.qrData;
    if (!qrData) {
      this.showError('Please scan a QR code');
      return;
    }

    this.loading = true;
    this.checkInService.checkInWithQRCode(qrData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.handleCheckInResponse(response);
          this.qrCheckInForm.reset();
          this.stopQRScanner();
        },
        error: (error) => {
          console.error('QR check-in error:', error);
          this.showError('QR code check-in failed');
          this.loading = false;
        }
      });
  }

  // NFC Check-In
  performNFCCheckIn(nfcData: string): void {
    this.loading = true;
    this.checkInService.checkInWithNFC(nfcData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.handleCheckInResponse(response);
        },
        error: (error) => {
          console.error('NFC check-in error:', error);
          this.showError('NFC check-in failed');
          this.loading = false;
        }
      });
  }

  private executeCheckIn(request: CheckInRequest): void {
    this.loading = true;
    this.checkInService.checkInPatient(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.handleCheckInResponse(response);
          this.resetManualForm();
        },
        error: (error) => {
          console.error('Check-in error:', error);
          this.showError('Check-in failed');
          this.loading = false;
        }
      });
  }

  private handleCheckInResponse(response: CheckInResponse): void {
    this.loading = false;
    
    if (response.success) {
      this.showCheckInConfirmation(response);
      this.loadPendingCheckIns();
    } else {
      this.showError(response.message);
    }
  }

  private showCheckInConfirmation(response: CheckInResponse): void {
    const dialogRef = this.dialog.open(CheckInConfirmationDialogComponent, {
      width: '400px',
      data: response,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.sendNotification) {
        this.sendCheckInNotification(response.checkInId, result.notificationMethod);
      }
    });
  }

  private sendCheckInNotification(checkInId: string, method: string): void {
    this.checkInService.sendCheckInConfirmation(checkInId, method)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.showSuccess('Notification sent successfully');
          } else {
            this.showError('Failed to send notification');
          }
        },
        error: (error) => {
          console.error('Notification error:', error);
          this.showError('Failed to send notification');
        }
      });
  }

  // Pending Check-Ins Management
  updateCheckInStatus(checkInId: string, status: string): void {
    this.checkInService.updateCheckInStatus(checkInId, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCheckIn) => {
          this.showSuccess('Check-in status updated');
          this.loadPendingCheckIns();
        },
        error: (error) => {
          console.error('Status update error:', error);
          this.showError('Failed to update status');
        }
      });
  }

  cancelCheckIn(checkInId: string): void {
    const reason = 'Cancelled by receptionist';
    this.checkInService.cancelCheckIn(checkInId, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.showSuccess('Check-in cancelled');
            this.loadPendingCheckIns();
          } else {
            this.showError(result.message);
          }
        },
        error: (error) => {
          console.error('Cancel error:', error);
          this.showError('Failed to cancel check-in');
        }
      });
  }

  // Utility Methods
  private resetManualForm(): void {
    this.manualCheckInForm.reset();
    this.selectedPatient = null;
    this.patientAppointments = [];
    this.patientSearchResults = [];
  }

  private getCurrentBranchId(): string {
    // Get current branch ID from context
    return localStorage.getItem('currentBranchId') || '';
  }

  onTabChange(index: number): void {
    this.activeTab = index;
    if (index !== 1) {
      this.stopQRScanner();
    }
  }

  refreshPendingCheckIns(): void {
    this.loadPendingCheckIns();
  }

  // Validation
  validateCheckInEligibility(patientId: string, appointmentId?: string): void {
    this.checkInService.validateCheckInEligibility(patientId, appointmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result.eligible) {
            this.showError(result.reason || 'Patient not eligible for check-in');
          }
        },
        error: (error) => {
          console.error('Validation error:', error);
        }
      });
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

  // Template Helper Methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'primary';
      case 'processing': return 'accent';
      case 'failed': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'processing': return 'hourglass_empty';
      case 'failed': return 'error';
      default: return 'pending';
    }
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  }
}