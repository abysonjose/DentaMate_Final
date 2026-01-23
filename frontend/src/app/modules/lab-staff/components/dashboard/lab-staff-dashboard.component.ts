import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { LabStaffService, LabStaffProfile, LabAlert } from '../../services/lab-staff.service';
import { DiagnosticService, DiagnosticRequest } from '../../services/diagnostic.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  description?: string;
}

interface LabDashboardMetrics {
  pendingRequests: number;
  inProgressTests: number;
  completedToday: number;
  urgentRequests: number;
  delayedUploads: number;
  aiProcessingQueue: number;
  averageProcessingTime: number;
}

@Component({
  selector: 'app-lab-staff-dashboard',
  templateUrl: './lab-staff-dashboard.component.html',
  styleUrls: ['./lab-staff-dashboard.component.scss']
})
export class LabStaffDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser$ = this.authService.currentUser$;
  currentProfile$ = this.labStaffService.getLabStaffProfile();
  alerts: LabAlert[] = [];
  unreadAlertsCount = 0;
  urgentAlertsCount = 0;
  sidenavOpened = true;
  
  // Dashboard metrics
  dashboardMetrics: LabDashboardMetrics = {
    pendingRequests: 0,
    inProgressTests: 0,
    completedToday: 0,
    urgentRequests: 0,
    delayedUploads: 0,
    aiProcessingQueue: 0,
    averageProcessingTime: 0
  };
  
  recentRequests: DiagnosticRequest[] = [];
  isLoadingMetrics = true;
  
  navigationItems: NavigationItem[] = [
    {
      label: 'Worklist Overview',
      icon: 'assignment',
      route: '/lab-staff/worklist',
      description: 'Today\'s diagnostic workload and pending requests'
    },
    {
      label: 'Diagnostic Requests',
      icon: 'medical_services',
      route: '/lab-staff/requests',
      description: 'View and manage lab requests from doctors'
    },
    {
      label: 'Report Upload',
      icon: 'cloud_upload',
      route: '/lab-staff/upload',
      description: 'Upload diagnostic files and reports'
    },
    {
      label: 'Patient Verification',
      icon: 'verified_user',
      route: '/lab-staff/verification',
      description: 'Verify patient identity before diagnostics'
    },
    {
      label: 'AI Processing Status',
      icon: 'psychology',
      route: '/lab-staff/ai-status',
      description: 'Monitor AI analysis processing'
    },
    {
      label: 'Diagnostic History',
      icon: 'history',
      route: '/lab-staff/history',
      description: 'View past uploaded reports and records'
    },
    {
      label: 'Compliance & Audit',
      icon: 'security',
      route: '/lab-staff/compliance',
      description: 'Audit logs and compliance monitoring'
    }
  ];

  constructor(
    private authService: AuthService,
    private labStaffService: LabStaffService,
    private diagnosticService: DiagnosticService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadAlerts();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoadingMetrics = true;
    
    this.labStaffService.getDashboardMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics) => {
          this.dashboardMetrics = metrics;
          this.updateNavigationBadges();
          this.isLoadingMetrics = false;
        },
        error: (error) => {
          console.error('Error loading dashboard metrics:', error);
          this.isLoadingMetrics = false;
        }
      });

    this.diagnosticService.getRecentRequests(5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.recentRequests = requests;
        },
        error: (error) => {
          console.error('Error loading recent requests:', error);
        }
      });
  }

  private loadAlerts(): void {
    this.labStaffService.getAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.alerts = alerts;
          this.unreadAlertsCount = alerts.filter(a => !a.read).length;
          this.urgentAlertsCount = alerts.filter(a => a.priority === 'urgent' && !a.read).length;
        },
        error: (error) => {
          console.error('Error loading alerts:', error);
        }
      });
  }

  private setupRealTimeUpdates(): void {
    // Refresh dashboard metrics every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDashboardData();
        this.loadAlerts();
      });
  }

  private updateNavigationBadges(): void {
    // Update navigation badges based on metrics
    this.navigationItems.forEach(item => {
      switch (item.route) {
        case '/lab-staff/worklist':
          item.badge = this.dashboardMetrics.pendingRequests;
          break;
        case '/lab-staff/requests':
          item.badge = this.dashboardMetrics.urgentRequests;
          break;
        case '/lab-staff/upload':
          item.badge = this.dashboardMetrics.delayedUploads;
          break;
        case '/lab-staff/ai-status':
          item.badge = this.dashboardMetrics.aiProcessingQueue;
          break;
        default:
          item.badge = undefined;
      }
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  dismissAlert(alertId: string): void {
    this.labStaffService.dismissAlert(alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alerts = this.alerts.filter(a => a.id !== alertId);
          this.unreadAlertsCount = this.alerts.filter(a => !a.read).length;
          this.urgentAlertsCount = this.alerts.filter(a => a.priority === 'urgent' && !a.read).length;
        },
        error: (error) => {
          console.error('Error dismissing alert:', error);
        }
      });
  }

  markAllAlertsAsRead(): void {
    this.labStaffService.markAllAlertsAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alerts.forEach(alert => alert.read = true);
          this.unreadAlertsCount = 0;
          this.urgentAlertsCount = 0;
        },
        error: (error) => {
          console.error('Error marking alerts as read:', error);
        }
      });
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'urgent_request': return 'priority_high';
      case 'delayed_upload': return 'schedule';
      case 'ai_processing': return 'psychology';
      case 'compliance': return 'security';
      case 'system': return 'info';
      default: return 'notifications';
    }
  }

  getAlertColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      default: return '';
    }
  }

  toggleSidenav(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }

  refreshDashboard(): void {
    this.loadDashboardData();
    this.loadAlerts();
  }
}