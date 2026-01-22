import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { DoctorService } from '../../services/doctor.service';
import { DoctorAppointmentService } from '../../services/doctor-appointment.service';
import { DoctorQueueService } from '../../services/doctor-queue.service';

interface DashboardStats {
  todayAppointments: number;
  completedConsultations: number;
  walkIns: number;
  currentQueueLength: number;
  nextPatient: string;
  delayedQueue: boolean;
  emergencyInsertions: number;
  upcomingFollowUps: number;
}

interface TodaySchedule {
  id: string;
  patientName: string;
  time: string;
  type: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'no-show';
  tokenNumber?: string;
}

interface QueueSnapshot {
  currentToken: string;
  nextTokens: string[];
  estimatedWaitTime: number;
  status: 'active' | 'paused' | 'emergency';
}

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboardStats: DashboardStats = {
    todayAppointments: 0,
    completedConsultations: 0,
    walkIns: 0,
    currentQueueLength: 0,
    nextPatient: '',
    delayedQueue: false,
    emergencyInsertions: 0,
    upcomingFollowUps: 0
  };

  todaySchedule: TodaySchedule[] = [];
  queueSnapshot: QueueSnapshot = {
    currentToken: '',
    nextTokens: [],
    estimatedWaitTime: 0,
    status: 'active'
  };

  alerts: any[] = [];
  isLoading = true;
  currentTime = new Date();

  constructor(
    private doctorService: DoctorService,
    private appointmentService: DoctorAppointmentService,
    private queueService: DoctorQueueService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupRealTimeUpdates();
    this.startTimeUpdater();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load dashboard statistics
    this.doctorService.getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.dashboardStats = stats;
          this.checkForAlerts();
        },
        error: (error) => {
          console.error('Error loading dashboard stats:', error);
          // Provide fallback data
          this.dashboardStats = {
            todayAppointments: 0,
            completedConsultations: 0,
            walkIns: 0,
            currentQueueLength: 0,
            nextPatient: '',
            delayedQueue: false,
            emergencyInsertions: 0,
            upcomingFollowUps: 0
          };
        }
      });

    // Load today's schedule
    this.appointmentService.getTodaySchedule()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (schedule) => {
          this.todaySchedule = schedule;
          this.updateDashboardStats();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading schedule:', error);
          this.todaySchedule = [];
          this.isLoading = false;
        }
      });

    // Load queue snapshot
    this.queueService.getCurrentQueueSnapshot()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshot) => {
          this.queueSnapshot = snapshot;
          this.updateDashboardStats();
        },
        error: (error) => {
          console.error('Error loading queue snapshot:', error);
          // Provide fallback queue data
          this.queueSnapshot = {
            currentToken: '',
            nextTokens: [],
            estimatedWaitTime: 0,
            status: 'active',
            totalWaiting: 0,
            averageWaitTime: 0,
            lastUpdated: new Date()
          };
        }
      });
  }

  private setupRealTimeUpdates(): void {
    // Real-time queue updates
    this.queueService.getQueueSnapshotStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshot) => {
          this.queueSnapshot = snapshot;
          this.updateDashboardStats();
        },
        error: (error) => console.error('Error in queue updates:', error)
      });

    // Real-time appointment updates - using polling for now
    // In a real implementation, this would use WebSocket
    setInterval(() => {
      this.appointmentService.getTodaySchedule().subscribe({
        next: (schedule) => {
          this.todaySchedule = schedule;
          this.updateDashboardStats();
        },
        error: (error) => console.error('Error refreshing appointments:', error)
      });
    }, 30000); // Refresh every 30 seconds
  }

  private startTimeUpdater(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
      });
  }

  private checkForAlerts(): void {
    this.alerts = [];

    if (this.dashboardStats.delayedQueue) {
      this.alerts.push({
        type: 'warning',
        message: 'Queue is running behind schedule',
        action: 'View Queue'
      });
    }

    if (this.dashboardStats.emergencyInsertions > 0) {
      this.alerts.push({
        type: 'info',
        message: `${this.dashboardStats.emergencyInsertions} emergency insertions today`,
        action: 'View Details'
      });
    }

    if (this.dashboardStats.upcomingFollowUps > 0) {
      this.alerts.push({
        type: 'info',
        message: `${this.dashboardStats.upcomingFollowUps} follow-ups due this week`,
        action: 'View Follow-ups'
      });
    }
  }

  private updateSchedule(update: any): void {
    const index = this.todaySchedule.findIndex(item => item.id === update.appointmentId);
    if (index !== -1) {
      this.todaySchedule[index] = { ...this.todaySchedule[index], ...update };
    }
  }

  private updateDashboardStats(): void {
    this.dashboardStats.completedConsultations = this.todaySchedule.filter(
      item => item.status === 'completed'
    ).length;
    
    this.dashboardStats.currentQueueLength = this.queueSnapshot.nextTokens.length + 1;
    this.dashboardStats.nextPatient = this.queueSnapshot.nextTokens[0] || '';
  }

  // Action methods
  startConsultation(appointment: TodaySchedule): void {
    this.appointmentService.startConsultation(appointment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          appointment.status = 'in-progress';
        },
        error: (error) => console.error('Error starting consultation:', error)
      });
  }

  markNoShow(appointment: TodaySchedule): void {
    this.appointmentService.markNoShow(appointment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          appointment.status = 'no-show';
        },
        error: (error) => console.error('Error marking no-show:', error)
      });
  }

  callNextPatient(): void {
    this.queueService.callNextPatient()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Handle next patient call
        },
        error: (error) => console.error('Error calling next patient:', error)
      });
  }

  pauseQueue(): void {
    this.queueService.pauseQueue()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.queueSnapshot.status = 'paused';
        },
        error: (error) => console.error('Error pausing queue:', error)
      });
  }

  resumeQueue(): void {
    this.queueService.resumeQueue()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.queueSnapshot.status = 'active';
        },
        error: (error) => console.error('Error resuming queue:', error)
      });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in-progress': return 'accent';
      case 'completed': return 'success';
      case 'no-show': return 'warn';
      default: return 'primary';
    }
  }

  getQueueStatusColor(): string {
    switch (this.queueSnapshot.status) {
      case 'active': return 'success';
      case 'paused': return 'warn';
      case 'emergency': return 'danger';
      default: return 'primary';
    }
  }
}