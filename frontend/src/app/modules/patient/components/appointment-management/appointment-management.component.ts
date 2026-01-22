import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { PatientService, Appointment } from '../../services/patient.service';
import { BookAppointmentDialogComponent } from '../../dialogs/book-appointment-dialog/book-appointment-dialog.component';
import { RescheduleAppointmentDialogComponent } from '../../dialogs/reschedule-appointment-dialog/reschedule-appointment-dialog.component';

@Component({
  selector: 'app-appointment-management',
  templateUrl: './appointment-management.component.html',
  styleUrls: ['./appointment-management.component.scss']
})
export class AppointmentManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  selectedTab = 0;
  
  displayedColumns: string[] = ['date', 'time', 'doctor', 'department', 'status', 'actions'];
  
  tabs = [
    { label: 'All Appointments', filter: 'all' },
    { label: 'Upcoming', filter: 'upcoming' },
    { label: 'Past', filter: 'past' },
    { label: 'Cancelled', filter: 'cancelled' }
  ];

  constructor(
    private patientService: PatientService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAppointments(): void {
    this.loading = true;
    
    this.patientService.getAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointments) => {
          this.appointments = appointments.sort((a, b) => 
            new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
          );
          this.filterAppointments();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading appointments:', error);
          this.snackBar.open('Error loading appointments', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
    this.filterAppointments();
  }

  private filterAppointments(): void {
    const filter = this.tabs[this.selectedTab].filter;
    const now = new Date();
    
    switch (filter) {
      case 'upcoming':
        this.filteredAppointments = this.appointments.filter(apt => 
          new Date(apt.appointmentDate) >= now && 
          apt.status !== 'CANCELLED' && 
          apt.status !== 'COMPLETED'
        );
        break;
      case 'past':
        this.filteredAppointments = this.appointments.filter(apt => 
          new Date(apt.appointmentDate) < now || 
          apt.status === 'COMPLETED'
        );
        break;
      case 'cancelled':
        this.filteredAppointments = this.appointments.filter(apt => 
          apt.status === 'CANCELLED'
        );
        break;
      default:
        this.filteredAppointments = [...this.appointments];
    }
  }

  bookNewAppointment(): void {
    const dialogRef = this.dialog.open(BookAppointmentDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAppointments();
        this.snackBar.open('Appointment booked successfully!', 'Close', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  rescheduleAppointment(appointment: Appointment): void {
    if (!this.canReschedule(appointment)) {
      this.snackBar.open('This appointment cannot be rescheduled', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(RescheduleAppointmentDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { appointment }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAppointments();
        this.snackBar.open('Appointment rescheduled successfully!', 'Close', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  cancelAppointment(appointment: Appointment): void {
    if (!this.canCancel(appointment)) {
      this.snackBar.open('This appointment cannot be cancelled', 'Close', { duration: 3000 });
      return;
    }

    const confirmMessage = `Are you sure you want to cancel your appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime}?`;
    
    if (confirm(confirmMessage)) {
      this.patientService.cancelAppointment(appointment.id, 'Cancelled by patient')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadAppointments();
            this.snackBar.open('Appointment cancelled successfully', 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          },
          error: (error) => {
            console.error('Error cancelling appointment:', error);
            this.snackBar.open('Error cancelling appointment', 'Close', { duration: 3000 });
          }
        });
    }
  }

  checkIn(appointment: Appointment): void {
    this.patientService.checkIn(appointment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokenStatus) => {
          this.snackBar.open(`Checked in successfully! Token: ${tokenStatus.tokenNumber}`, 'View Queue', { 
            duration: 5000,
            panelClass: ['success-snackbar']
          }).onAction().subscribe(() => {
            // Navigate to queue status
            // this.router.navigate(['/patient/queue-status']);
          });
        },
        error: (error) => {
          console.error('Error checking in:', error);
          this.snackBar.open('Error checking in. Please try again.', 'Close', { duration: 3000 });
        }
      });
  }

  canReschedule(appointment: Appointment): boolean {
    const appointmentDate = new Date(appointment.appointmentDate);
    const now = new Date();
    const hoursDiff = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED' && hoursDiff > 24;
  }

  canCancel(appointment: Appointment): boolean {
    const appointmentDate = new Date(appointment.appointmentDate);
    const now = new Date();
    const hoursDiff = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return (appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED') && hoursDiff > 2;
  }

  canCheckIn(appointment: Appointment): boolean {
    const appointmentDate = new Date(appointment.appointmentDate);
    const now = new Date();
    const daysDiff = Math.floor((appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff === 0 && (appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'CONFIRMED':
      case 'SCHEDULED':
        return 'primary';
      case 'COMPLETED':
        return 'accent';
      case 'CANCELLED':
        return 'warn';
      case 'NO_SHOW':
        return 'warn';
      default:
        return 'primary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'CONFIRMED':
        return 'check_circle';
      case 'SCHEDULED':
        return 'schedule';
      case 'COMPLETED':
        return 'done_all';
      case 'CANCELLED':
        return 'cancel';
      case 'NO_SHOW':
        return 'error';
      default:
        return 'help';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

  isUpcoming(appointment: Appointment): boolean {
    const appointmentDate = new Date(appointment.appointmentDate);
    const now = new Date();
    return appointmentDate >= now && appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED';
  }

  isPast(appointment: Appointment): boolean {
    const appointmentDate = new Date(appointment.appointmentDate);
    const now = new Date();
    return appointmentDate < now || appointment.status === 'COMPLETED';
  }

  getAppointmentTypeColor(type: string): string {
    switch (type) {
      case 'EMERGENCY':
        return 'warn';
      case 'FOLLOW_UP':
        return 'accent';
      case 'CONSULTATION':
        return 'primary';
      case 'ROUTINE_CHECKUP':
        return 'primary';
      default:
        return 'primary';
    }
  }
}