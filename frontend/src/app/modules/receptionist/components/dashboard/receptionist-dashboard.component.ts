import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, interval, takeUntil, combineLatest } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReceptionistService } from '../../services/receptionist.service';
import { QueueService } from '../../services/queue.service';
import { AppointmentService } from '../../services/appointment.service';
import { NotificationService } from '../../services/notification.service';
import { IntegrationService, DoctorStatus, PatientStatus, BranchMetrics } from '../../services/integration.service';
import { CheckInService } from '../../services/check-in.service';
import { TokenService } from '../../services/token.service';
import { QuickRegistrationDialogComponent } from '../../dialogs/quick-registration-dialog/quick-registration-dialog.component';
import { AppointmentBookingDialogComponent } from '../../dialogs/appointment-booking-dialog/appointment-booking-dialog.component';

interface DashboardStats {
  totalAppointments: number;
  checkedInPatients: number;
  walkInPatients: number;
  activeQueues: number;
  pendingCheckIns: number;
  doctorDelays: number;
}

interface QuickAction {
  icon: string;
  label: string;
  action: string;
  color: string;
  shortcut?: string;
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  actionable?: boolean;
}

@Component({
  selector: 'app-receptionist-dashboard',
  templateUrl: './receptionist-dashboard.component.html',
  styleUrls: ['./receptionist-dashboard.component.scss']
})
export class ReceptionistDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Dashboard data
  stats: DashboardStats = {
    totalAppointments: 0,
    checkedInPatients: 0,
    walkInPatients: 0,
    activeQueues: 0,
    pendingCheckIns: 0,
    doctorDelays: 0
  };

  quickActions: QuickAction[] = [
    {
      icon: 'person_add',
      label: 'Register Patient',
      action: 'registerPatient',
      color: 'primary',
      shortcut: 'Ctrl+R'
    },
    {
      icon: 'event',
      label: 'Book Appointment',
      action: 'bookAppointment',
      color: 'accent',
      shortcut: 'Ctrl+B'
    },
    {
      icon: 'check_circle',
      label: 'Check-In Patient',
      action: 'checkInPatient',
      color: 'warn',
      shortcut: 'Ctrl+I'
    },
    {
      icon: 'queue',
      label: 'View Queues',
      action: 'viewQueues',
      color: 'primary',
      shortcut: 'Ctrl+Q'
    }
  ];

  alerts: Alert[] = [];
  recentActivities: any[] = [];
  upcomingAppointments: any[] = [];
  currentQueues: any[] = [];
  
  // Integration data
  doctorStatuses: DoctorStatus[] = [];
  patientStatuses: PatientStatus[] = [];
  branchMetrics: BranchMetrics | null = null;
  serviceHealth: any = {};
  
  // UI state
  loading = false;
  selectedDate = new Date();
  refreshInterval = 30000; // 30 seconds
  integrationStatus = 'connecting';

  constructor(
    private receptionistService: ReceptionistService,
    private queueService: QueueService,
    private appointmentService: AppointmentService,
    private notificationService: NotificationService,
    private integrationService: IntegrationService,
    private checkInService: CheckInService,
    private tokenService: TokenService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeDashboard();
    this.setupRealTimeUpdates();
    this.setupKeyboardShortcuts();
    this.initializeIntegrations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.integrationService.disconnect();
  }

  private initializeDashboard(): void {
    this.loading = true;
    
    combineLatest([
      this.receptionistService.getDashboardStats(),
      this.appointmentService.getTodayAppointments(),
      this.queueService.getCurrentQueues(),
      this.receptionistService.getRecentActivities(),
      this.integrationService.syncAllData()
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([stats, appointments, queues, activities, integrationData]) => {
        this.stats = stats;
        this.upcomingAppointments = appointments;
        this.currentQueues = queues;
        this.recentActivities = activities;
        this.loading = false;
        this.integrationStatus = 'connected';
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.showError('Failed to load dashboard data');
        this.loading = false;
        this.integrationStatus = 'error';
      }
    });
  }

  private initializeIntegrations(): void {
    // Subscribe to integration events
    this.integrationService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.handleIntegrationEvent(event);
      });

    // Subscribe to doctor status updates
    this.integrationService.doctorStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(statuses => {
        this.doctorStatuses = statuses;
        this.updateDashboardWithDoctorStatus();
      });

    // Subscribe to patient status updates
    this.integrationService.patientStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(statuses => {
        this.patientStatuses = statuses;
        this.updateDashboardWithPatientStatus();
      });

    // Subscribe to branch metrics
    this.integrationService.branchMetrics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        this.branchMetrics = metrics;
        this.updateDashboardWithBranchMetrics();
      });

    // Check service health
    this.integrationService.checkServiceHealth()
      .pipe(takeUntil(this.destroy$))
      .subscribe(health => {
        this.serviceHealth = health;
        this.checkIntegrationHealth();
      });
  }

  private handleIntegrationEvent(event: any): void {
    switch (event.type) {
      case 'appointment_created':
        this.handleAppointmentCreated(event.data);
        break;
      case 'appointment_updated':
        this.handleAppointmentUpdated(event.data);
        break;
      case 'patient_checked_in':
        this.handlePatientCheckedIn(event.data);
        break;
      case 'token_generated':
        this.handleTokenGenerated(event.data);
        break;
      case 'queue_updated':
        this.handleQueueUpdated(event.data);
        break;
      case 'doctor_status_changed':
        this.handleDoctorStatusChanged(event.data);
        break;
    }
  }

  private handleAppointmentCreated(data: any): void {
    this.showSuccess(`New appointment created for ${data.patientName}`);
    this.refreshAppointments();
    this.integrationService.sendAnalyticsEvent('appointment_created_via_receptionist', data);
  }

  private handleAppointmentUpdated(data: any): void {
    this.showInfo(`Appointment updated for ${data.patientName}`);
    this.refreshAppointments();
  }

  private handlePatientCheckedIn(data: any): void {
    this.showSuccess(`${data.patientName} checked in successfully`);
    this.refreshDashboard();
    
    // Notify doctor of patient arrival
    if (data.doctorId) {
      this.integrationService.notifyDoctorOfPatientArrival(data.doctorId, data)
        .subscribe({
          next: () => console.log('Doctor notified of patient arrival'),
          error: (error) => console.error('Failed to notify doctor:', error)
        });
    }
  }

  private handleTokenGenerated(data: any): void {
    this.showInfo(`Token ${data.tokenNumber} generated for ${data.patientName}`);
    this.refreshQueues();
    
    // Send notification to patient
    this.integrationService.notifyPatientOfUpdate(
      data.patientId,
      `Your token number is ${data.tokenNumber}. Estimated wait time: ${data.estimatedWaitTime} minutes.`,
      'token_generated'
    ).subscribe();
  }

  private handleQueueUpdated(data: any): void {
    this.refreshQueues();
    
    // Update patient status if needed
    if (data.currentToken) {
      this.integrationService.updatePatientStatus(
        data.currentToken.patientId,
        'in_consultation',
        `Consultation Room ${data.roomNumber || 'TBD'}`
      ).subscribe();
    }
  }

  private handleDoctorStatusChanged(data: any): void {
    const doctor = this.doctorStatuses.find(d => d.doctorId === data.doctorId);
    if (doctor) {
      this.showInfo(`Dr. ${doctor.doctorName} is now ${data.status}`);
    }
    this.refreshQueues();
  }

  private updateDashboardWithDoctorStatus(): void {
    // Update queue information with doctor availability
    this.currentQueues.forEach(queue => {
      const doctorStatus = this.doctorStatuses.find(d => d.doctorId === queue.doctorId);
      if (doctorStatus) {
        queue.doctorStatus = doctorStatus.status;
        queue.doctorAvailable = doctorStatus.status === 'available';
      }
    });
  }

  private updateDashboardWithPatientStatus(): void {
    // Update appointment list with patient status
    this.upcomingAppointments.forEach(appointment => {
      const patientStatus = this.patientStatuses.find(p => p.patientId === appointment.patientId);
      if (patientStatus) {
        appointment.patientStatus = patientStatus.status;
        appointment.currentLocation = patientStatus.currentLocation;
      }
    });
  }

  private updateDashboardWithBranchMetrics(): void {
    if (this.branchMetrics) {
      // Update stats with real-time branch metrics
      this.stats.totalAppointments = this.branchMetrics.activeAppointments;
      this.stats.checkedInPatients = this.branchMetrics.waitingPatients;
      this.stats.activeQueues = this.branchMetrics.availableDoctors;
    }
  }

  private checkIntegrationHealth(): void {
    const unhealthyServices = Object.entries(this.serviceHealth)
      .filter(([service, healthy]) => !healthy)
      .map(([service]) => service);

    if (unhealthyServices.length > 0) {
      this.showWarning(`Some services are unavailable: ${unhealthyServices.join(', ')}`);
      this.integrationStatus = 'partial';
    } else {
      this.integrationStatus = 'connected';
    }
  }

  private setupRealTimeUpdates(): void {
    // Auto-refresh dashboard every 30 seconds
    interval(this.refreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshDashboard();
      });

    // Listen for real-time notifications
    this.notificationService.getAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe(alert => {
        this.alerts.unshift(alert);
        this.showNotification(alert.message, alert.type);
      });

    // Listen for queue updates
    this.queueService.getQueueUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(queueUpdate => {
        this.updateQueueData(queueUpdate);
      });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'r':
            event.preventDefault();
            this.executeQuickAction('registerPatient');
            break;
          case 'b':
            event.preventDefault();
            this.executeQuickAction('bookAppointment');
            break;
          case 'i':
            event.preventDefault();
            this.executeQuickAction('checkInPatient');
            break;
          case 'q':
            event.preventDefault();
            this.executeQuickAction('viewQueues');
            break;
        }
      }
    });
  }

  executeQuickAction(action: string): void {
    switch (action) {
      case 'registerPatient':
        this.openQuickRegistration();
        break;
      case 'bookAppointment':
        this.openAppointmentBooking();
        break;
      case 'checkInPatient':
        this.navigateToCheckIn();
        break;
      case 'viewQueues':
        this.navigateToQueues();
        break;
    }
  }

  private openQuickRegistration(): void {
    const dialogRef = this.dialog.open(QuickRegistrationDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSuccess('Patient registered successfully');
        this.refreshDashboard();
        
        // Notify other modules of new patient registration
        this.integrationService.sendAnalyticsEvent('patient_registered', {
          patientId: result.id,
          registeredBy: 'receptionist',
          timestamp: new Date()
        });
        
        // Report to branch admin
        this.integrationService.reportToBranchAdmin('new_patient_registration', {
          patientId: result.id,
          patientName: `${result.firstName} ${result.lastName}`,
          registeredAt: new Date()
        }).subscribe();
      }
    });
  }

  private openAppointmentBooking(): void {
    const dialogRef = this.dialog.open(AppointmentBookingDialogComponent, {
      width: '800px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSuccess('Appointment booked successfully');
        this.refreshDashboard();
        
        // Notify all relevant modules
        this.integrationService.notifyAppointmentCreated(result);
        
        // Send notification to patient
        this.integrationService.notifyPatientOfUpdate(
          result.patientId,
          `Your appointment has been scheduled for ${this.formatDate(result.appointmentDate)} at ${result.startTime}`,
          'appointment_confirmation'
        ).subscribe();
        
        // Notify doctor
        this.integrationService.notifyDoctorOfPatientArrival(result.doctorId, {
          type: 'new_appointment',
          appointment: result
        }).subscribe();
      }
    });
  }

  private navigateToCheckIn(): void {
    // Navigate to check-in component
    // Implementation depends on routing setup
  }

  private navigateToQueues(): void {
    // Navigate to queue monitoring component
    // Implementation depends on routing setup
  }

  refreshDashboard(): void {
    this.initializeDashboard();
  }

  private refreshAppointments(): void {
    this.appointmentService.getTodayAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe(appointments => {
        this.upcomingAppointments = appointments;
      });
  }

  private refreshQueues(): void {
    this.queueService.getCurrentQueues()
      .pipe(takeUntil(this.destroy$))
      .subscribe(queues => {
        this.currentQueues = queues;
      });
  }

  // Enhanced patient check-in with integration
  performQuickCheckIn(patientId: string, appointmentId?: string): void {
    this.checkInService.checkInPatient({
      patientId,
      appointmentId,
      checkInMethod: 'manual',
      branchId: this.integrationService.getBranchId()
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        if (result.success) {
          // Generate token automatically
          this.tokenService.generateToken({
            patientId,
            appointmentId,
            priority: 'normal',
            type: 'appointment'
          }).subscribe({
            next: (token) => {
              this.showSuccess(`Patient checked in. Token: ${token.tokenNumber}`);
              
              // Notify all modules
              this.integrationService.notifyTokenGenerated(token);
              
              // Update patient status
              this.integrationService.updatePatientStatus(
                patientId,
                'checked_in',
                'Waiting Area'
              ).subscribe();
              
              this.refreshDashboard();
            },
            error: (error) => {
              console.error('Token generation failed:', error);
              this.showError('Check-in successful but token generation failed');
            }
          });
        } else {
          this.showError(result.message);
        }
      },
      error: (error) => {
        console.error('Check-in failed:', error);
        this.showError('Check-in failed');
      }
    });
  }

  // Emergency functions with integration
  handleEmergencyPatient(patientData: any): void {
    // Create emergency appointment
    this.appointmentService.createEmergencyAppointment(
      patientData.patientId,
      patientData.symptoms,
      'critical'
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        // Generate emergency token
        this.tokenService.generateEmergencyToken(
          patientData.patientId,
          'critical',
          patientData.symptoms
        ).subscribe({
          next: (token) => {
            this.showSuccess(`Emergency patient processed. Token: ${token.tokenNumber}`);
            
            // Trigger emergency alert to all modules
            this.integrationService.triggerEmergencyAlert({
              type: 'emergency_patient',
              patientId: patientData.patientId,
              severity: 'critical',
              symptoms: patientData.symptoms,
              tokenNumber: token.tokenNumber
            }).subscribe();
            
            // Notify head nurse immediately
            this.integrationService.requestNurseAssistance(
              patientData.patientId,
              'emergency_support',
              'urgent'
            ).subscribe();
            
            this.refreshDashboard();
          }
        });
      },
      error: (error) => {
        console.error('Emergency appointment creation failed:', error);
        this.showError('Failed to process emergency patient');
      }
    });
  }

  // Doctor coordination
  requestDoctorUpdate(doctorId: string): void {
    this.integrationService.requestDoctorSchedule(doctorId, new Date())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (schedule) => {
          this.showInfo(`Updated schedule received for doctor`);
          this.refreshQueues();
        },
        error: (error) => {
          console.error('Failed to get doctor schedule:', error);
          this.showError('Failed to get doctor schedule');
        }
      });
  }

  // Branch admin reporting
  reportIssue(issueType: string, description: string): void {
    this.integrationService.reportToBranchAdmin(issueType, {
      description,
      reportedAt: new Date(),
      severity: 'medium'
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.showSuccess('Issue reported to branch admin');
      },
      error: (error) => {
        console.error('Failed to report issue:', error);
        this.showError('Failed to report issue');
      }
    });
  }

  // Patient communication
  sendPatientUpdate(patientId: string, message: string, type: string): void {
    this.integrationService.notifyPatientOfUpdate(patientId, message, type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Patient notified successfully');
        },
        error: (error) => {
          console.error('Failed to notify patient:', error);
          this.showError('Failed to notify patient');
        }
      });
  }

  private updateQueueData(queueUpdate: any): void {
    // Update queue data in real-time
    const queueIndex = this.currentQueues.findIndex(q => q.id === queueUpdate.queueId);
    if (queueIndex !== -1) {
      this.currentQueues[queueIndex] = { ...this.currentQueues[queueIndex], ...queueUpdate };
    }
  }

  dismissAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }

  handleAlertAction(alert: Alert): void {
    // Handle actionable alerts
    switch (alert.type) {
      case 'warning':
        // Handle doctor delay, queue congestion, etc.
        break;
      case 'error':
        // Handle system errors
        break;
    }
  }

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

  private showNotification(message: string, type: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: [`${type}-snackbar`]
    });
  }

  // Utility methods for templates
  getAlertIcon(type: string): string {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'success': return 'check_circle';
      default: return 'info';
    }
  }

  getAlertColor(type: string): string {
    switch (type) {
      case 'error': return 'warn';
      case 'warning': return 'accent';
      case 'info': return 'primary';
      case 'success': return 'primary';
      default: return 'primary';
    }
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  // Integration status helpers
  getIntegrationStatusColor(): string {
    switch (this.integrationStatus) {
      case 'connected': return 'primary';
      case 'partial': return 'accent';
      case 'error': return 'warn';
      default: return 'default';
    }
  }

  getIntegrationStatusIcon(): string {
    switch (this.integrationStatus) {
      case 'connected': return 'cloud_done';
      case 'partial': return 'cloud_queue';
      case 'error': return 'cloud_off';
      default: return 'cloud_sync';
    }
  }

  // Service health indicators
  isServiceHealthy(serviceName: string): boolean {
    return this.serviceHealth[serviceName] === true;
  }

  getUnhealthyServices(): string[] {
    return Object.entries(this.serviceHealth)
      .filter(([service, healthy]) => !healthy)
      .map(([service]) => service);
  }

  // Doctor status helpers
  getAvailableDoctors(): DoctorStatus[] {
    return this.doctorStatuses.filter(d => d.status === 'available');
  }

  getBusyDoctors(): DoctorStatus[] {
    return this.doctorStatuses.filter(d => d.status === 'busy');
  }

  // Patient status helpers
  getWaitingPatients(): PatientStatus[] {
    return this.patientStatuses.filter(p => p.status === 'checked_in');
  }

  getPatientsInConsultation(): PatientStatus[] {
    return this.patientStatuses.filter(p => p.status === 'in_consultation');
  }
}