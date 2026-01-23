import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs';
import { AppointmentService, CreateAppointmentRequest, AppointmentSlot, Doctor } from '../../services/appointment.service';
import { PatientRegistrationService, PatientSearchResult } from '../../services/patient-registration.service';
import { ReceptionistService } from '../../services/receptionist.service';

@Component({
  selector: 'app-appointment-booking-dialog',
  templateUrl: './appointment-booking-dialog.component.html',
  styleUrls: ['./appointment-booking-dialog.component.scss']
})
export class AppointmentBookingDialogComponent implements OnInit {
  bookingForm: FormGroup;
  loading = false;
  slotsLoading = false;
  doctorsLoading = false;

  // Data
  patientSearchResults: PatientSearchResult[] = [];
  selectedPatient: PatientSearchResult | null = null;
  availableDoctors: Doctor[] = [];
  availableSlots: AppointmentSlot[] = [];
  
  // Options
  appointmentTypes = [
    { value: 'consultation', label: 'Consultation' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'procedure', label: 'Procedure' }
  ];

  priorities = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  durations = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  // Date constraints
  minDate = new Date();
  maxDate = new Date(new Date().setMonth(new Date().getMonth() + 3));

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AppointmentBookingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private appointmentService: AppointmentService,
    private patientService: PatientRegistrationService,
    private receptionistService: ReceptionistService,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadAvailableDoctors();
    this.setupPatientSearch();
    this.setupFormWatchers();
    
    // Pre-fill if patient data is provided
    if (this.data?.patient) {
      this.selectPatient(this.data.patient);
    }
  }

  private initializeForm(): void {
    this.bookingForm = this.fb.group({
      patientSearch: ['', Validators.required],
      doctorId: ['', Validators.required],
      appointmentDate: ['', Validators.required],
      startTime: ['', Validators.required],
      duration: [30, Validators.required],
      type: ['consultation', Validators.required],
      priority: ['normal', Validators.required],
      notes: [''],
      symptoms: ['']
    });
  }

  private setupPatientSearch(): void {
    this.bookingForm.get('patientSearch')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        if (query && typeof query === 'string' && query.length >= 2) {
          this.searchPatients(query);
        } else {
          this.patientSearchResults = [];
        }
      });
  }

  private setupFormWatchers(): void {
    // Watch for doctor and date changes to load available slots
    this.bookingForm.get('doctorId')?.valueChanges.subscribe(() => {
      this.loadAvailableSlots();
    });

    this.bookingForm.get('appointmentDate')?.valueChanges.subscribe(() => {
      this.loadAvailableSlots();
    });

    this.bookingForm.get('duration')?.valueChanges.subscribe(() => {
      this.loadAvailableSlots();
    });
  }

  private loadAvailableDoctors(): void {
    this.doctorsLoading = true;
    this.appointmentService.getAvailableDoctors().subscribe({
      next: (doctors) => {
        this.availableDoctors = doctors;
        this.doctorsLoading = false;
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
        this.doctorsLoading = false;
        this.showError('Failed to load available doctors');
      }
    });
  }

  private searchPatients(query: string): void {
    this.patientService.searchPatients(query).subscribe({
      next: (results) => {
        this.patientSearchResults = results;
      },
      error: (error) => {
        console.error('Error searching patients:', error);
        this.showError('Failed to search patients');
      }
    });
  }

  selectPatient(patient: PatientSearchResult): void {
    this.selectedPatient = patient;
    this.bookingForm.patchValue({
      patientSearch: `${patient.fullName} (${patient.registrationId})`
    });
    this.patientSearchResults = [];
  }

  private loadAvailableSlots(): void {
    const doctorId = this.bookingForm.get('doctorId')?.value;
    const appointmentDate = this.bookingForm.get('appointmentDate')?.value;
    const duration = this.bookingForm.get('duration')?.value;

    if (doctorId && appointmentDate && duration) {
      this.slotsLoading = true;
      this.appointmentService.getAvailableSlots(doctorId, appointmentDate, duration).subscribe({
        next: (slots) => {
          this.availableSlots = slots;
          this.slotsLoading = false;
        },
        error: (error) => {
          console.error('Error loading slots:', error);
          this.slotsLoading = false;
          this.showError('Failed to load available slots');
        }
      });
    }
  }

  selectTimeSlot(slot: AppointmentSlot): void {
    this.bookingForm.patchValue({
      startTime: slot.startTime
    });
  }

  onSubmit(): void {
    if (!this.selectedPatient) {
      this.showError('Please select a patient');
      return;
    }

    if (this.bookingForm.valid) {
      this.bookAppointment();
    } else {
      this.markFormGroupTouched();
    }
  }

  private bookAppointment(): void {
    this.loading = true;
    const formValue = this.bookingForm.value;

    const appointmentRequest: CreateAppointmentRequest = {
      patientId: this.selectedPatient!.id,
      doctorId: formValue.doctorId,
      appointmentDate: formValue.appointmentDate,
      startTime: formValue.startTime,
      duration: formValue.duration,
      type: formValue.type,
      priority: formValue.priority,
      notes: formValue.notes,
      symptoms: formValue.symptoms
    };

    this.appointmentService.createAppointment(appointmentRequest).subscribe({
      next: (appointment) => {
        this.loading = false;
        this.logActivity(appointment);
        this.showSuccess('Appointment booked successfully');
        this.dialogRef.close(appointment);
      },
      error: (error) => {
        this.loading = false;
        console.error('Booking error:', error);
        this.showError('Failed to book appointment');
      }
    });
  }

  private logActivity(appointment: any): void {
    this.receptionistService.logActivity({
      type: 'appointment',
      description: `Booked appointment for ${this.selectedPatient?.fullName} with Dr. ${this.getDoctorName(appointment.doctorId)}`,
      icon: 'event',
      userId: this.getCurrentUserId()
    }).subscribe();
  }

  // Quick booking for next available slot
  bookNextAvailable(): void {
    if (!this.selectedPatient) {
      this.showError('Please select a patient first');
      return;
    }

    const doctorId = this.bookingForm.get('doctorId')?.value;
    if (!doctorId) {
      this.showError('Please select a doctor first');
      return;
    }

    this.loading = true;
    this.appointmentService.quickBookAppointment(
      this.selectedPatient.id,
      doctorId,
      this.bookingForm.get('appointmentDate')?.value
    ).subscribe({
      next: (result) => {
        this.loading = false;
        if (result.appointment) {
          this.logActivity(result.appointment);
          this.showSuccess('Appointment booked for next available slot');
          this.dialogRef.close(result.appointment);
        } else {
          this.availableSlots = result.availableSlots;
          this.showWarning('No immediate slots available. Please select from available times.');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Quick booking error:', error);
        this.showError('Failed to book next available slot');
      }
    });
  }

  // Emergency appointment booking
  bookEmergencyAppointment(): void {
    if (!this.selectedPatient) {
      this.showError('Please select a patient first');
      return;
    }

    const symptoms = this.bookingForm.get('symptoms')?.value;
    if (!symptoms) {
      this.showError('Please describe symptoms for emergency appointment');
      return;
    }

    this.loading = true;
    this.appointmentService.createEmergencyAppointment(
      this.selectedPatient.id,
      symptoms,
      'high'
    ).subscribe({
      next: (result) => {
        this.loading = false;
        this.logActivity(result.appointment);
        this.showSuccess(`Emergency appointment created. Estimated wait: ${result.estimatedWaitTime} minutes`);
        this.dialogRef.close(result.appointment);
      },
      error: (error) => {
        this.loading = false;
        console.error('Emergency booking error:', error);
        this.showError('Failed to create emergency appointment');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Form validation helpers
  getFieldError(fieldName: string): string {
    const field = this.bookingForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      patientSearch: 'Patient',
      doctorId: 'Doctor',
      appointmentDate: 'Date',
      startTime: 'Time',
      duration: 'Duration',
      type: 'Type',
      priority: 'Priority'
    };
    return labels[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.bookingForm.controls).forEach(key => {
      this.bookingForm.get(key)?.markAsTouched();
    });
  }

  // Utility methods
  private getCurrentUserId(): string {
    return localStorage.getItem('currentUserId') || '';
  }

  private getDoctorName(doctorId: string): string {
    const doctor = this.availableDoctors.find(d => d.id === doctorId);
    return doctor?.name || 'Unknown Doctor';
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  isSlotSelected(slot: AppointmentSlot): boolean {
    return this.bookingForm.get('startTime')?.value === slot.startTime;
  }

  // Keyboard shortcuts
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          this.onSubmit();
          break;
        case 'q':
          event.preventDefault();
          this.bookNextAvailable();
          break;
        case 'e':
          event.preventDefault();
          this.bookEmergencyAppointment();
          break;
      }
    }
  }

  // Notification methods
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