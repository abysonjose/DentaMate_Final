import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SupportStaffService, Task, ShiftInfo, OperationalAlert } from '../../services/support-staff.service';

@Component({
  selector: 'app-support-staff-dashboard',
  templateUrl: './support-staff-dashboard.component.html',
  styleUrls: ['./support-staff-dashboard.component.scss']
})
export class SupportStaffDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Dashboard data
  shiftInfo: ShiftInfo | null = null;
  tasks: Task[] = [];
  alerts: OperationalAlert[] = [];
  
  // Task statistics
  taskStats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  };

  // Quick access counters
  urgentTasks = 0;
  unacknowledgedAlerts = 0;
  roomsNeedingCleaning = 0;
  assistanceRequests = 0;

  // Current time for shift display
  currentTime = new Date();
  timeInterval: any;

  constructor(private supportStaffService: SupportStaffService) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.startTimeUpdater();
    this.subscribeToRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private loadDashboardData(): void {
    // Load shift information
    this.supportStaffService.getShiftInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(shiftInfo => {
        this.shiftInfo = shiftInfo;
      });

    // Load tasks
    this.supportStaffService.getTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.tasks = tasks;
        this.calculateTaskStats();
      });

    // Load alerts
    this.supportStaffService.getAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts;
        this.unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;
      });
  }

  private subscribeToRealTimeUpdates(): void {
    // Subscribe to task updates
    this.supportStaffService.tasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.tasks = tasks;
        this.calculateTaskStats();
      });

    // Subscribe to alert updates
    this.supportStaffService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts;
        this.unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;
      });
  }

  private calculateTaskStats(): void {
    this.taskStats.total = this.tasks.length;
    this.taskStats.pending = this.tasks.filter(t => t.status === 'ASSIGNED').length;
    this.taskStats.inProgress = this.tasks.filter(t => t.status === 'IN_PROGRESS').length;
    this.taskStats.completed = this.tasks.filter(t => t.status === 'COMPLETED').length;
    this.urgentTasks = this.tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length;
  }

  private startTimeUpdater(): void {
    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  // Quick actions
  clockIn(): void {
    this.supportStaffService.clockIn()
      .pipe(takeUntil(this.destroy$))
      .subscribe(shiftInfo => {
        this.shiftInfo = shiftInfo;
      });
  }

  clockOut(): void {
    this.supportStaffService.clockOut()
      .pipe(takeUntil(this.destroy$))
      .subscribe(shiftInfo => {
        this.shiftInfo = shiftInfo;
      });
  }

  acknowledgeAlert(alertId: string): void {
    this.supportStaffService.acknowledgeAlert(alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDashboardData();
      });
  }

  // Navigation helpers
  getTaskPriorityColor(priority: string): string {
    switch (priority) {
      case 'URGENT': return 'warn';
      case 'HIGH': return 'accent';
      case 'MEDIUM': return 'primary';
      default: return '';
    }
  }

  getTaskStatusIcon(status: string): string {
    switch (status) {
      case 'ASSIGNED': return 'assignment';
      case 'IN_PROGRESS': return 'hourglass_empty';
      case 'COMPLETED': return 'check_circle';
      default: return 'help';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'PEAK_HOURS': return 'trending_up';
      case 'CONGESTION': return 'people';
      case 'URGENT_CLEANING': return 'cleaning_services';
      case 'SAFETY_ALERT': return 'warning';
      default: return 'info';
    }
  }

  getShiftProgress(): number {
    if (!this.shiftInfo || !this.shiftInfo.clockedIn) return 0;
    
    const now = new Date();
    const shiftStart = new Date(this.shiftInfo.clockedIn);
    const shiftEnd = new Date(this.shiftInfo.shiftEnd);
    
    const totalDuration = shiftEnd.getTime() - shiftStart.getTime();
    const elapsed = now.getTime() - shiftStart.getTime();
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  getRemainingShiftTime(): string {
    if (!this.shiftInfo) return '0h 0m';
    
    const now = new Date();
    const shiftEnd = new Date(this.shiftInfo.shiftEnd);
    const remaining = shiftEnd.getTime() - now.getTime();
    
    if (remaining <= 0) return 'Shift Ended';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }
}