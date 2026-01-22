import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-book-appointment-dialog',
  template: `
    <div class="book-appointment-dialog">
      <h2 mat-dialog-title>Book New Appointment</h2>
      
      <mat-dialog-content>
        <form [formGroup]="appointmentForm" class="appointment-form">
          
          <!-- Doctor Selection -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select Doctor</mat-label>
            <mat-select formControlName="doctorId" (selectionChange)="onDoctorChange()">
              <mat-option *ngFor="let doctor of doctors" [value]="doctor.id">
                Dr. {{doctor.name}} - {{doctor.department}}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="appointmentForm.get('doctorId')?.hasError('required')">
              Please select a doctor
            </mat-error>
          </mat-form-field>

          <!-- Appointment Type -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Appointment Type</mat-label>
            <mat-select formControlName="type">
              <mat-option value="CONSULTATION">Consultation</mat-option>
              <mat-option value="FOLLOW_UP">Follow-up</mat-option>
              <mat-option value="ROUTINE_CHECKUP">Routine Checkup</mat-option>
              <mat-option value="EMERGENCY">Emergency</mat-option>
            </mat-select>
            <mat-error *ngIf="appointmentForm.get('type')?.hasError('required')">
              Please select appointment type
            </mat-error>
          </mat-form-field>

          <!-- Date Selection -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Preferred Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date" 
                   [min]="minDate" [max]="maxDate" (dateChange)="onDateChange()">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="appointmentForm.get('date')?.hasError('required')">
              Please select a date
            </mat-error>
          </mat-form-field>

          <!-- Time Slot Selection -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="availableSlots.length > 0">
            <mat-label>Available Time Slots</mat-label>
            <mat-select formControlName="time">
              <mat-option *ngFor="let slot of availableSlots" [value]="slot">
                {{formatTimeSlot(slot)}}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="appointmentForm.get('time')?.hasError('required')">
              Please select a time slot
            </mat-error>
          </mat-form-field>

          <!-- No Slots Available Message -->
          <div *ngIf="appointmentForm.get('date')?.value && appointmentForm.get('doctorId')?.value && availableSlots.length === 0 && !loadingSlots" 
               class="no-slots-message">
            <mat-icon color="warn">event_busy</mat-icon>
            <p>No available slots for the selected date. Please choose another date.</p>
          </div>

          <!-- Loading Slots -->
          <div *ngIf="loadingSlots" class="loading-slots">
            <mat-spinner diameter="30"></mat-spinner>
            <p>Loading available slots...</p>
          </div>

          <!-- Notes -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Additional Notes (Optional)</mat-label>
            <textarea matInput formControlName="notes" rows="3" 
                      placeholder="Any specific concerns or requirements..."></textarea>
          </mat-form-field>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                (click)="onSubmit()" 
                [disabled]="appointmentForm.invalid || submitting">
          <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
          <span *ngIf="!submitting">Book Appointment</span>
          <span *ngIf="submitting">Booking...</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .book-appointment-dialog {
      width: 100%;
      max-width: 600px;
    }

    .appointment-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px 0;
    }

    .full-width {
      width: 100%;
    }

    .no-slots-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background-color: #fff3e0;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
      
      .mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
      
      p {
        margin: 0;
        color: #e65100;
        font-weight: 500;
      }
    }

    .loading-slots {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      justify-content: center;
      
      p {
        margin: 0;
        color: #666;
      }
    }

    .mat-dialog-actions {
      padding: 20px 0 0 0;
      
      button {
        margin-left: 8px;
      }
    }

    .mat-raised-button {
      min-width: 140px;
      
      .mat-spinner {
        margin-right: 8px;
      }
    }
  `]
})
export class BookAppointmentDialogComponent implements OnInit {
  appointmentForm: FormGroup;
  doctors: any[] = [];
  availableSlots: string[] = [];
  loadingSlots = false;
  submitting = false;
  minDate = new Date();
  maxDate = new Date();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BookAppointmentDialogComponent>,
    private patientService: PatientService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Set max date to 3 months from now
    this.maxDate.setMonth(this.maxDate.getMonth() + 3);
    
    this.appointmentForm = this.fb.group({
      doctorId: ['', Validators.required],
      type: ['CONSULTATION', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadDoctors();
  }

  private loadDoctors(): void {
    // Mock doctors data - replace with actual API call
    this.doctors = [
      { id: '1', name: 'John Smith', department: 'General Dentistry' },
      { id: '2', name: 'Sarah Johnson', department: 'Orthodontics' },
      { id: '3', name: 'Michael Brown', department: 'Oral Surgery' },
      { id: '4', name: 'Emily Davis', department: 'Pediatric Dentistry' }
    ];
  }

  onDoctorChange(): void {
    this.availableSlots = [];
    this.appointmentForm.patchValue({ time: '' });
    
    if (this.appointmentForm.get('date')?.value) {
      this.loadAvailableSlots();
    }
  }

  onDateChange(): void {
    this.availableSlots = [];
    this.appointmentForm.patchValue({ time: '' });
    
    if (this.appointmentForm.get('doctorId')?.value) {
      this.loadAvailableSlots();
    }
  }

  private loadAvailableSlots(): void {
    const doctorId = this.appointmentForm.get('doctorId')?.value;
    const date = this.appointmentForm.get('date')?.value;
    
    if (!doctorId || !date) return;
    
    this.loadingSlots = true;
    const dateString = date.toISOString().split('T')[0];
    
    this.patientService.getAvailableSlots(doctorId, dateString)
      .subscribe({
        next: (slots) => {
          this.availableSlots = slots;
          this.loadingSlots = false;
        },
        error: (error) => {
          console.error('Error loading slots:', error);
          this.availableSlots = [];
          this.loadingSlots = false;
          this.snackBar.open('Error loading available slots', 'Close', { duration: 3000 });
        }
      });
  }

  formatTimeSlot(time: string): string {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  onSubmit(): void {
    if (this.appointmentForm.invalid) return;
    
    this.submitting = true;
    const formValue = this.appointmentForm.value;
    
    const appointmentData = {
      doctorId: formValue.doctorId,
      type: formValue.type,
      appointmentDate: formValue.date.toISOString().split('T')[0],
      appointmentTime: formValue.time,
      notes: formValue.notes
    };
    
    this.patientService.bookAppointment(appointmentData)
      .subscribe({
        next: (appointment) => {
          this.submitting = false;
          this.dialogRef.close(appointment);
        },
        error: (error) => {
          console.error('Error booking appointment:', error);
          this.submitting = false;
          this.snackBar.open('Error booking appointment. Please try again.', 'Close', { duration: 3000 });
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}