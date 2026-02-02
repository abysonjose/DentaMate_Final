import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReceptionistService } from '../../services/receptionist.service';
import { BookAppointmentDialogComponent } from '../../dialogs/book-appointment-dialog/book-appointment-dialog.component';

@Component({
  selector: 'app-appointment-scheduling',
  templateUrl: './appointment-scheduling.component.html',
  styleUrls: ['./appointment-scheduling.component.scss']
})
export class AppointmentSchedulingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  appointments: any[] = [];
  selectedDate = new Date();
  doctors: any[] = [];
  selectedDoctor: string = '';
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private receptionistService: ReceptionistService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
    this.loadAppointments();

    // Check if there's a specific appointment to view
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['appointmentId']) {
          this.viewAppointmentDetails(params['appointmentId']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDoctors(): void {
    this.receptionistService.getDoctors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.doctors = response.data || [];
        },
        error: (error) => {
          console.error('Error loading doctors:', error);
        }
      });
  }

  private loadAppointments(): void {
    this.isLoading = true;
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    
    this.receptionistService.getTodayAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.appointments = response.data || [];
          this.filterAppointments();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading appointments:', error);
          this.isLoading = false;
        }
      });
  }

  private filterAppointments(): void {
    if (this.selectedDoctor) {
      this.appointments = this.appointments.filter(apt => apt.doctorId === this.selectedDoctor);
    }
  }

  onDateChange(date: Date): void {
    this.selectedDate = date;
    this.loadAppointments();
  }

  onDoctorChange(): void {
    this.filterAppointments();
  }

  bookNewAppointment(): void {
    const dialogRef = this.dialog.open(BookAppointmentDialogComponent, {
      width: '700px',
      data: {
        selectedDate: this.selectedDate,
        selectedDoctor: this.selectedDoctor
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAppointments();
        this.snackBar.open('Appointment booked successfully', 'Close', { duration: 3000 });
      }
    });
  }

  viewAppointmentDetails(appointmentId: string): void {
    // Implementation for viewing appointment details
    console.log('View appointment details:', appointmentId);
  }

  rescheduleAppointment(appointment: any): void {
    // Implementation for rescheduling
    console.log('Reschedule appointment:', appointment);
  }

  cancelAppointment(appointment: any): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.receptionistService.cancelAppointment(appointment.id, 'Cancelled by reception')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadAppointments();
              this.snackBar.open('Appointment cancelled successfully', 'Close', { duration: 3000 });
            }
          },
          error: (error) => {
            console.error('Error cancelling appointment:', error);
            this.snackBar.open('Error cancelling appointment', 'Close', { duration: 3000 });
          }
        });
    }
  }

  checkInPatient(appointment: any): void {
    this.receptionistService.checkInPatient(appointment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadAppointments();
            this.snackBar.open('Patient checked in successfully', 'Close', { duration: 3000 });
          }
        },
        error: (error) => {
          console.error('Error checking in patient:', error);
          this.snackBar.open('Error checking in patient', 'Close', { duration: 3000 });
        }
      });
  }

  sendReminder(appointment: any): void {
    this.receptionistService.sendAppointmentReminder(appointment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Reminder sent successfully', 'Close', { duration: 3000 });
          }
        },
        error: (error) => {
          console.error('Error sending reminder:', error);
          this.snackBar.open('Error sending reminder', 'Close', { duration: 3000 });
        }
      });
  }

  getAppointmentStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'primary';
      case 'checked-in': return 'accent';
      case 'in-progress': return 'warn';
      case 'completed': return '';
      case 'cancelled': return 'warn';
      default: return '';
    }
  }

  getAppointmentTypeIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'consultation': return 'medical_services';
      case 'checkup': return 'health_and_safety';
      case 'cleaning': return 'cleaning_services';
      case 'surgery': return 'local_hospital';
      case 'emergency': return 'emergency';
      default: return 'event';
    }
  }
}