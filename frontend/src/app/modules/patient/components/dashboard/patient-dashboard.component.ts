import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';
import { PatientService, Appointment, TokenStatus, Bill, Notification } from '../../services/patient.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-patient-dashboard',
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  dashboardData: any = {};
  upcomingAppointment: Appointment | null = null;
  currentTokenStatus: TokenStatus | null = null;
  pendingBills: Bill[] = [];
  recentNotifications: Notification[] = [];
  unreadNotificationCount = 0;

  quickActions = [
    {
      icon: 'event',
      title: 'Book Appointment',
      description: 'Schedule your next visit',
      action: () => this.navigateToAppointments(),
      color: 'primary'
    },
    {
      icon: 'receipt',
      title: 'View Prescriptions',
      description: 'Access your medications',
      action: () => this.navigateToPrescriptions(),
      color: 'accent'
    },
    {
      icon: 'payment',
      title: 'Pay Bills',
      description: 'Make payments online',
      action: () => this.navigateToBilling(),
      color: 'warn'
    },
    {
      icon: 'medical_services',
      title: 'Medical Records',
      description: 'View your health history',
      action: () => this.navigateToMedicalRecords(),
      color: 'primary'
    }
  ];

  constructor(
    private patientService: PatientService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.loading = true;

    // Load dashboard summary
    this.patientService.getDashboardSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.loading = false;
          this.snackBar.open('Error loading dashboard data', 'Close', { duration: 3000 });
        }
      });

    // Load upcoming appointment
    this.patientService.getUpcomingAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointments) => {
          this.upcomingAppointment = appointments.length > 0 ? appointments[0] : null;
        },
        error: (error) => {
          console.error('Error loading appointments:', error);
        }
      });

    // Load current token status
    this.patientService.getCurrentTokenStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokenStatus) => {
          this.currentTokenStatus = tokenStatus;
        }
      });

    // Load pending bills
    this.patientService.getPendingBills()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bills) => {
          this.pendingBills = bills.slice(0, 3); // Show only first 3
        },
        error: (error) => {
          console.error('Error loading bills:', error);
        }
      });

    // Load recent notifications
    this.patientService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.recentNotifications = notifications.slice(0, 5); // Show only first 5
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
        }
      });

    // Load unread notification count
    this.patientService.getUnreadNotificationCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          this.unreadNotificationCount = count;
        }
      });
  }

  private setupRealTimeUpdates(): void {
    // Update token status every 30 seconds if patient is checked in
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.currentTokenStatus) {
          this.patientService.getQueueStatus(this.currentTokenStatus.tokenNumber)
            .subscribe({
              next: (status) => {
                this.currentTokenStatus = status;
                
                // Show notification if token is called
                if (status.status === 'CALLED') {
                  this.snackBar.open('Your token has been called!', 'OK', {
                    duration: 5000,
                    panelClass: ['success-snackbar']
                  });
                }
              },
              error: (error) => {
                console.error('Error updating token status:', error);
              }
            });
        }
      });
  }

  // Navigation methods
  navigateToAppointments(): void {
    this.router.navigate(['/patient/appointments']);
  }

  navigateToPrescriptions(): void {
    this.router.navigate(['/patient/prescriptions']);
  }

  navigateToBilling(): void {
    this.router.navigate(['/patient/billing']);
  }

  navigateToMedicalRecords(): void {
    this.router.navigate(['/patient/medical-records']);
  }

  navigateToQueueStatus(): void {
    this.router.navigate(['/patient/queue-status']);
  }

  navigateToNotifications(): void {
    this.router.navigate(['/patient/notifications']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/patient/profile']);
  }

  // Quick actions
  checkInForAppointment(): void {
    if (this.upcomingAppointment) {
      this.patientService.checkIn(this.upcomingAppointment.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (tokenStatus) => {
            this.currentTokenStatus = tokenStatus;
            this.snackBar.open(`Checked in successfully! Token: ${tokenStatus.tokenNumber}`, 'OK', {
              duration: 5000
            });
            this.navigateToQueueStatus();
          },
          error: (error) => {
            console.error('Error checking in:', error);
            this.snackBar.open('Error checking in. Please try again.', 'Close', { duration: 3000 });
          }
        });
    }
  }

  payBill(bill: Bill): void {
    this.router.navigate(['/patient/billing'], { 
      queryParams: { billId: bill.id, action: 'pay' } 
    });
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
      case 'WAITING':
        return 'primary';
      case 'CALLED':
        return 'accent';
      case 'IN_CONSULTATION':
        return 'warn';
      default:
        return 'primary';
    }
  }

  getEstimatedWaitTimeText(): string {
    if (!this.currentTokenStatus) return '';
    
    const minutes = this.currentTokenStatus.estimatedWaitTime;
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
}