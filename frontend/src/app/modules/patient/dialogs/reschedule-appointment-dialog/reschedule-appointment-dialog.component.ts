import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PatientService, Appointment } from '../../services/patient.service';

@Component({
  selector: 'app-reschedule-appointment-dialog',
  template: `
    <div class="reschedule-dialog">
      <h2 mat-dialog-title>Reschedule Appointment</h2>
      
      <mat-dialog-content>
        <!-- Current Appointment Info -->
        <div class="current-appointment">
          <h3>Current Appointment</h3>
          <div class="appointment-info">
            <div class="info-row">
              <mat-icon>event</mat-icon>
              <span>{{formatDate(appointment.appointmentDate)}} at {{formatTime(appointment.appointmentTime)}}</span>
            </div>
            <div class="info-row">
              <mat-icon>person</mat-icon>
              <span>Dr. {{appointment.doctorName}} - {{appointment.department}}</span>
            </div>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Reschedule Form -->
        <form [formGroup]="rescheduleForm" class="reschedule-form">
          <h3>Select New Date & Time</h3>
          
          <!-- Date Selection -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>New Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date" 
                   [min]="minDate" [max]="maxDate" (dateChange)="onDateChange()">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="rescheduleForm.get('date')?.hasError('required')">
              Please select a new date
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
            <mat-error *ngIf="rescheduleForm.get('time')?.hasError('required')">
              Please select a time slot
            </mat-error>
          </mat-form-field>

          <!-- No Slots Available Message -->
          <div *ngIf="rescheduleForm.get('date')?.value && availableSlots.length === 0 && !loadingSlots" 
               class="no-slots-message">
            <mat-icon color="warn">event_busy</mat-icon>
            <p>No available slots for the selected date. Please choose another date.</p>
          </div>

          <!-- Loading Slots -->
          <div *ngIf="loadingSlots" class="loading-slots">
            <mat-spinner diameter="30"></mat-spinner>
            <p>Loading available slots...</p>
          </div>

          <!-- Reason -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Reason for Rescheduling (Optional)</mat-label>
            <textarea matInput formControlName="reason" rows="2" 
                      placeholder="Please let us know why you need to reschedule..."></textarea>
          </mat-form-field>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                (click)="onSubmit()" 
                [disabled]="rescheduleForm.invalid || submitting">
          <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
          <span *ngIf="!submitting">Reschedule</span>
          <span *ngIf="submitting">Rescheduling...</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .reschedule-dialog {
      width: 100%;
      max-width: 500px;
    }

    .current-appointment {
      margin-bottom: 20px;
      
      h3 {
        margin: 0 0 12px 0;
        color: #333;
        font-weight: 500;
      }
      
      .appointment-info {
        background-color: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid #2196f3;
        
        .info-row {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          
          &:last-child {
            margin-bottom: 0;
          }
          
          .mat-icon {
            margin-right: 12px;
            color: #666;
            font-size: 20px;
            width: 20px;
            height: 20px;
          }
          
          span {
            color: #333;
            font-weight: 500;
          }
        }
      }
    }

    .mat-divider {
      margin: 20px 0;
    }

    .reschedule-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      
      h3 {
        margin: 0 0 8px 0;
        color: #333;
        font-weight: 500;
      }
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
      min-width: 120px;
      
      .mat-spinner {
        margin-right: 8px;
      }
    }
  `]
})
export class RescheduleAppointmentDialogComponent implements OnInit {
  rescheduleForm: FormGroup;
  appointment: Appointment;
  availableSlots: string[] = [];
  loadingSlots = false;
  submitting = false;
  minDate = new Date();
  maxDate = new Date();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RescheduleAppointmentDialogComponent>,
    private patientService: PatientService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { appointment: Appointment }
  ) {
    this.appointment = data.appointment;
    
    // Set max date to 3 months from now
    this.maxDate.setMonth(this.maxDate.getMonth() + 3);
    
    this.rescheduleForm = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required],
      reason: ['']
    });
  }

  ngOnInit(): void {
    // Set minimum date to tomorrow
    this.minDate.setDate(this.minDate.getDate() + 1);
  }

  onDateChange(): void {
    this.availableSlots = [];
    this.rescheduleForm.patchValue({ time: '' });
    this.loadAvailableSlots();
  }

  private loadAvailableSlots(): void {
    const date = this.rescheduleForm.get('date')?.value;
    
    if (!date) return;
    
    this.loadingSlots = true;
    const dateString = date.toISOString().split('T')[0];
    
    this.patientService.getAvailableSlots(this.appointment.doctorId, dateString)
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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
    if (this.rescheduleForm.invalid) return;
    
    this.submitting = true;
    const formValue = this.rescheduleForm.value;
    
    const newDateTime = `${formValue.date.toISOString().split('T')[0]}T${formValue.time}`;
    
    this.patientService.rescheduleAppointment(this.appointment.id, newDateTime)
      .subscribe({
        next: (updatedAppointment) => {
          this.submitting = false;
          this.dialogRef.close(updatedAppointment);
        },
        error: (error) => {
          console.error('Error rescheduling appointment:', error);
          this.submitting = false;
          this.snackBar.open('Error rescheduling appointment. Please try again.', 'Close', { duration: 3000 });
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}