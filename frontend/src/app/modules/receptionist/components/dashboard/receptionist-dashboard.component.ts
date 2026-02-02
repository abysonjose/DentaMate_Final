import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReceptionistService } from '../../services/receptionist.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { BookAppointmentDialogComponent } from '../../dialogs/book-appointment-dialog/book-appointment-dialog.component';
import { PatientRegistrationDialogComponent } from '../../dialogs/patient-registration-dialog/patient-registration-dialog.component';

@Component({
  selector: 'app-receptionist-dashboard',
  templateUrl: './receptionist-dashboard.component.html',
  styleUrls: ['./receptionist-dashboard.component.scss']
})
export class ReceptionistDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: any;
  todayAppointments: any[] = [];
  waitingPatients: any[] = [];
  recentRegistrations: any[] = [];
  queueStatus: any = {};
  isLoading = false;

  constructor(
    private receptionistService: ReceptionistService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadDashboardData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load today's appointments
    this.receptionistService.getTodayAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.todayAppointments = response.data || [];
        },
        error: (error) => {
          console.error('Error loading today appointments:', error);
        }
      });

    // Load waiting patients
    this.receptionistService.getWaitingPatients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.waitingPatients = response.data || [];
        },
        error: (error) => {
          console.error('Error loading waiting patients:', error);
        }
      });

    // Load recent registrations
    this.receptionistService.getRecentRegistrations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.recentRegistrations = response.data || [];
        },
        error: (error) => {
          console.error('Error loading recent registrations:', error);
        }
      });

    // Load queue status
    this.receptionistService.getQueueStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.queueStatus = response.data || {};
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading queue status:', error);
          this.isLoading = false;
        }
      });
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  bookAppointment(): void {
    const dialogRef = this.dialog.open(BookAppointmentDialogComponent, {
      width: '700px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDashboardData(); // Refresh data
      }
    });
  }

  registerPatient(): void {
    const dialogRef = this.dialog.open(PatientRegistrationDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDashboardData(); // Refresh data
      }
    });
  }

  checkInPatient(appointmentId: string): void {
    this.receptionistService.checkInPatient(appointmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadDashboardData(); // Refresh data
          }
        },
        error: (error) => {
          console.error('Error checking in patient:', error);
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

  getQueueStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'waiting': return 'accent';
      case 'called': return 'primary';
      case 'in-consultation': return 'warn';
      default: return '';
    }
  }
}