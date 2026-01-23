import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { LabStaffService, LabStaffProfile, LabStaffMetrics, LabStaffAlert, WorklistItem } from '../../services/lab-staff.service';

@Component({
  selector: 'app-lab-staff-dashboard',
  templateUrl: './lab-staff-dashboard.component.html',
  styleUrls: ['./lab-staff-dashboard.component.scss']
})
export class LabStaffDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Dashboard data
  profile: LabStaffProfile | null = null;
  metrics: LabStaffMetrics | null = null;
  alerts: LabStaffAlert[] = [];
  todayWorklist: WorklistItem[] = [];
  
  // UI state
  isLoading = true;
  selectedTab = 0;
  
  // Quick stats for cards
  quickStats = {
    pendingRequests: 0,
    urgentRequests: 0,
    completedToday: 0,
    aiProcessingQueue: 0
  };

  constructor(private labStaffService: LabStaffService) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    // Load profile
    this.labStaffService.profile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.profile = profile;
      });

    // Load metrics
    this.labStaffService.metrics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        this.metrics = metrics;
        if (metrics) {
          this.updateQuickStats(metrics);
        }
        this.isLoading = false;
      });

    // Load alerts
    this.labStaffService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts.filter(alert => !alert.isRead).slice(0, 5); // Show only unread, max 5
      });

    // Load today's worklist
    this.labStaffService.worklist$
      .pipe(takeUntil(this.destroy$))
      .subscribe(worklist => {
        this.todayWorklist = worklist.slice(0, 10); // Show first 10 items
      });
  }

  private setupRealTimeUpdates(): void {
    // Refresh data every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.labStaffService.refreshData();
      });
  }

  private updateQuickStats(metrics: LabStaffMetrics): void {
    this.quickStats = {
      pendingRequests: metrics.todayRequests - metrics.completedReports,
      urgentRequests: metrics.urgentRequests,
      completedToday: metrics.completedReports,
      aiProcessingQueue: metrics.aiProcessingQueue
    };
  }

  // Event handlers
  onTabChange(index: number): void {
    this.selectedTab = index;
  }

  onAlertClick(alert: LabStaffAlert): void {
    // Mark alert as read
    this.labStaffService.markAlertAsRead(alert.id).subscribe();
    
    // Navigate to related entity if applicable
    if (alert.relatedEntity) {
      // Handle navigation based on entity type
      console.log('Navigate to:', alert.relatedEntity);
    }
  }

  onWorklistItemClick(item: WorklistItem): void {
    // Navigate to diagnostic request details
    console.log('Navigate to request:', item.requestId);
  }

  onRefreshData(): void {
    this.labStaffService.refreshData();
  }

  // Utility methods
  getAlertIcon(type: string): string {
    switch (type) {
      case 'urgent_request': return 'priority_high';
      case 'delayed_upload': return 'schedule';
      case 'ai_processing_error': return 'error';
      case 'system_issue': return 'warning';
      case 'quality_issue': return 'report_problem';
      default: return 'info';
    }
  }

  getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      case 'low': return '';
      default: return '';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'emergency': return 'warn';
      case 'urgent': return 'accent';
      case 'routine': return 'primary';
      default: return '';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'primary';
      case 'in_progress': return 'accent';
      case 'received': return '';
      default: return '';
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}