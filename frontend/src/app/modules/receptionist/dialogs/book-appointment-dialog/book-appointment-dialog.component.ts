import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ReceptionistService } from '../../services/receptionist.service';

@Component({
  selector: 'app-book-appointment-dialog',
  templateUrl: './book-appointment-dialog.component.html',
  styleUrls: ['./book-appointment-dialog.component.scss']
})
export class BookAppointmentDialogComponent implements OnInit {
  appointmentForm: FormGroup;
  isSubmitting = false;
  
  doctors: any[] = [];
  patients: any[] = [];
  availableSlots: any[] = [];
  
  appointmentTypes = [
    { value: 'consultation', label: 'Consultation' },
    { value: 'checkup', label: 'Regular Checkup' },
    { value: 'cleaning', label: 'Dental Cleaning' },
    { value: 'filling', label: 'Dental Filling' },
    { value: 'extraction', label: 'Tooth Extraction' },
    { value: 'surgery', label: 'Oral Surgery' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'follow-up', label: 'Follow-up' }
  ];

  priorities = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  constructor(
    private fb: FormBuilder,
    private receptionistService: ReceptionistService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<BookAppointmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { selectedDate?: Date; selectedDoctor?: string }
  ) {
    const defaultDate = this.data?.selectedDate || new Date();
    
    this.appointmentForm = this.fb.group({
      patientId: ['', Validators.required],
      patientSearch: [''],
      doctorId: [this.data?.selectedDoctor || '', Validators.required],
      appointmentDate: [defaultDate, Validators.required],
      appointmentTime: ['', Validators.required],
      appointmentType: ['consultation', Validators.required],
      priority: ['normal', Validators.required],
      reason: ['', [Validators.required, Validators.maxLength(200)]],
      notes: ['', Validators.maxLength(500)],
      durationMinutes: [30, [Validators.required, Validators.min(15), Validators.max(180)]]
    });
  }

  ngOnInit(): void {
    this.loadDoctors();
    this.setupPatientSearch();
    
    // Load available slots when doctor or date changes
    this.appointmentForm.get('doctorId')?.valueChanges.subscribe(() => {
      this.loadAvailableSlots();
    });
    
    this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(() => {
      this.loadAvailableSlots();
    });

    // Load initial slots if doctor is pre-selected
    if (this.data?.selectedDoctor) {
      this.loadAvailableSlots();
    }
  }

  private loadDoctors(): void {
    this.receptionistService.getDoctors().subscribe({
      next: (response) => {
        this.doctors = response.data || [];
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
      }
    });
  }

  private setupPatientSearch(): void {
    this.appointmentForm.get('patientSearch')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (query && query.length >= 2) {
            return this.receptionistService.searchPatients(query);
          }
          return of({ data: [] });
        })
      )
      .subscribe({
        next: (response) => {
          this.patients = response.data || [];
        },
        error: (error) => {
          console.error('Error searching patients:', error);
        }
      });
  }

  private loadAvailableSlots(): void {
    const doctorId = this.appointmentForm.get('doctorId')?.value;
    const date = this.appointmentForm.get('appointmentDate')?.value;
    
    if (doctorId && date) {
      const dateStr = date.toISOString().split('T')[0];
      this.receptionistService.getAvailableSlots(doctorId, dateStr).subscribe({
        next: (response) => {
          this.availableSlots = response.data || [];
        },
        error: (error) => {
          console.error('Error loading available slots:', error);
          this.availableSlots = [];
        }
      });
    }
  }

  onPatientSelected(patient: any): void {
    this.appointmentForm.patchValue({
      patientId: patient.id,
      patientSearch: `${patient.firstName} ${patient.lastName} (${patient.phone})`
    });
  }

  onSubmit(): void {
    if (this.appointmentForm.valid) {
      this.isSubmitting = true;
      
      const formValue = this.appointmentForm.value;
      const appointmentDateTime = new Date(formValue.appointmentDate);
      const [hours, minutes] = formValue.appointmentTime.split(':');
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

      const appointmentData = {
        patientId: formValue.patientId,
        doctorId: formValue.doctorId,
        appointmentDateTime: appointmentDateTime.toISOString(),
        appointmentType: formValue.appointmentType,
        reason: formValue.reason,
        notes: formValue.notes,
        priority: formValue.priority,
        durationMinutes: formValue.durationMinutes
      };

      this.receptionistService.bookAppointment(appointmentData).subscribe({
        next: (response) => {
          if (response.success) {
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Error booking appointment', 'Close', { duration: 3000 });
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error booking appointment:', error);
          this.snackBar.open('Error booking appointment', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getReasonCharacterCount(): number {
    return this.appointmentForm.get('reason')?.value?.length || 0;
  }

  getNotesCharacterCount(): number {
    return this.appointmentForm.get('notes')?.value?.length || 0;
  }
}