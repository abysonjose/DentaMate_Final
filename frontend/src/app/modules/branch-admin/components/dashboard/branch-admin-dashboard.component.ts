import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { BranchAdminService, BranchAlert, BranchProfile } from '../../services/branch-admin.service';
import { BranchAppointmentService, QueueSummary, AppointmentAnalytics } from '../../services/branch-appointment.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  children?: NavigationItem[];
  description?: string;
}

interface BranchDashboardMetrics {
  totalAppointmentsToday: number;
  activeAppointments: number;
  completedAppointments: number;
  waitingPatients: number;
  inConsultation: number;
  averageWaitTime: number;
  doctorsActive: number;
  queueLoad: number;
}

@Component({
  selector: 'app-branch-admin-dashboard',
  templateUrl: './branch-admin-dashboard.component.html',
  styleUrls: ['./branch-admin-dashboard.component.scss']
})
export class BranchAdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser$ = this.authService.currentUser$;
  currentBranch$ = this.branchAdminService.currentBranch$;
  alerts: BranchAlert[] = [];
  unreadAlertsCount = 0;
  criticalAlertsCount = 0;
  sidenavOpened = true;
  
  // Dashboard metrics
  dashboardMetrics: BranchDashboardMetrics = {
    totalAppointmentsToday: 0,
    activeAppointments: 0,
    completedAppointments: 0,
    waitingPatients: 0,
    inConsultation: 0,
    averageWaitTime: 0,
    doctorsActive: 0,
    queueLoad: 0
  };
  
  queueSummaries: QueueSummary[] = [];
  isLoadingMetrics = true;
  
  navigationItems: NavigationItem[] = [
    {
      label: 'Branch Overview',
      icon: 'dashboard',
      route: '/branch-admin/overview',
      description: 'Daily operations summary and key metrics'
    },
    {
      label: 'Appointment Management',
      icon: 'event',
      route: '',
      children: [
        {
          label: 'All Appointments',
          icon: 'calendar_today',
          route: '/branch-admin/appointments'
        },
        {
          label: 'Queue Monitoring',
          icon: 'queue',
          route: '/branch-admin/queue'
        },
        {
          label: 'Walk-in Patients',
          icon: 'person_add',
          route: '/branch-admin/walk-in'
        },
        {
          label: 'Schedule Management',
          icon: 'schedule',
          route: '/branch-admin/schedules'
        }
      ]
    },
    {
      label: 'Staff Management',
      icon: 'people',
      route: '',
      children: [
        {
          label: 'All Staff',
          icon: 'group',
          route: '/branch-admin/staff'
        },
        {
          label: 'Doctor Scheduling',
          icon: 'schedule',
          route: '/branch-admin/doctors'
        }
      ]
    },
    {
      label: 'Patient Records',
      icon: 'folder_shared',
      route: '/branch-admin/patients',
      description: 'Read-only access to patient information'
    },
    {
      label: 'Financial Monitoring',
      icon: 'account_balance_wallet',
      route: '/branch-admin/billing',
      description: 'Billing oversight and revenue tracking'
    },
    {
      label: 'Inventory Monitoring',
      icon: 'inventory',
      route: '/branch-admin/inventory',
      description: 'Stock levels and supply management'
    },
    {
      label: 'Reports & Analytics',
      icon: 'analytics',
      route: '/branch-admin/reports',
      description: 'Performance insights and data export'
    },
    {
      label: 'Communication',
      icon: 'notifications',
      route: '/branch-admin/notifications',
      description: 'Notifications and staff announcements'
    },
    {
      label: 'Branch Settings',
      icon: 'settings',
      route: '/branch-admin/settings',
      description: 'Working hours and branch configuration'
    },
    {
      label: 'Audit Logs',
      icon: 'history',
      route: '/branch-admin/audit',
      description: 'Activity logs and compliance monitoring'
    }
  ];

  constructor(
    private authService: AuthService,
    private branchAdminService: BranchAdminService,
    private appointmentService: BranchAppointmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBranchAlerts();
    this.loadDashboardMetrics();
    this.checkUserPermissions();
    
    // Refresh metrics every 30 seconds
    setInterval(() => {
      this.loadDashboardMetrics();
    }, 30000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBranchAlerts(): void {
    this.branchAdminService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts;
        this.unreadAlertsCount = alerts.filter(alert => !alert.isRead).length;
        this.criticalAlertsCount = alerts.filter(alert => alert.severity === 'critical').length;
        
        // Update navigation badges
        this.updateNavigationBadges();
      });
  }

  private loadDashboardMetrics(): void {
    this.isLoadingMetrics = true;
    const today = new Date();
    
    forkJoin({
      todayAppointments: this.appointmentService.getAllAppointments(today.toISOString().split('T')[0]),
      appointmentConflicts: this.appointmentService.getAppointmentConflicts(today),
      analytics: this.appointmentService.getAppointmentAnalytics(today, today)
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        const appointments = data.todayAppointments;
        const analytics = data.analytics;
        
        // Calculate metrics
        this.dashboardMetrics = {
          totalAppointmentsToday: appointments.length,
          activeAppointments: appointments.filter(apt => 
            ['booked', 'confirmed', 'checked_in', 'in_consultation'].includes(apt.status)
          ).length,
          completedAppointments: appointments.filter(apt => apt.status === 'completed').length,
          waitingPatients: appointments.filter(apt => 
            apt.status === 'checked_in' || (apt.token && apt.token.tokenStatus === 'waiting')
          ).length,
          inConsultation: appointments.filter(apt => 
            apt.status === 'in_consultation' || (apt.token && apt.token.tokenStatus === 'in_progress')
          ).length,
          averageWaitTime: analytics.averageWaitTime || 0,
          doctorsActive: new Set(appointments.map(apt => apt.doctorId)).size,
          queueLoad: Math.min(100, (this.dashboardMetrics.waitingPatients / Math.max(1, appointments.length)) * 100)
        };
        
        // Load queue summaries for active doctors
        this.loadQueueSummaries();
        
        // Add appointment-related alerts
        if (data.appointmentConflicts.length > 0) {
          this.alerts.push({
            id: `conflicts-${Date.now()}`,
            type: 'appointment_conflict',
            title: 'Appointment Conflicts',
            message: `${data.appointmentConflicts.length} appointment conflicts detected`,
            severity: 'high',
            timestamp: new Date(),
            isRead: false,
            branchId: '',
            actionRequired: true
          });
        }
        
        this.isLoadingMetrics = false;
      },
      error: (error) => {
        console.error('Error loading dashboard metrics:', error);
        this.isLoadingMetrics = false;
      }
    });
  }

  private loadQueueSummaries(): void {
    // Get unique doctor IDs from today's appointments
    const today = new Date();
    this.appointmentService.getAllAppointments(today.toISOString().split('T')[0])
      .pipe(takeUntil(this.destroy$))
      .subscribe(appointments => {
        const doctorIds = [...new Set(appointments.map(apt => apt.doctorId))];
        
        // Get queue summary for each doctor
        const queuePromises = doctorIds.map(doctorId => 
          this.appointmentService.getQueueSummary(doctorId, today)
        );
        
        forkJoin(queuePromises).subscribe(summaries => {
          this.queueSummaries = summaries;
        });
      });
  }

  private updateNavigationBadges(): void {
    // Update badges based on alerts and system status
    const queueAlerts = this.alerts.filter(alert => 
      ['queue_overload', 'appointment_conflict'].includes(alert.type) && !alert.isRead
    ).length;
    const inventoryAlerts = this.alerts.filter(alert => alert.type === 'inventory_low' && !alert.isRead).length;
    
    // Find and update navigation items with badges
    this.navigationItems.forEach(item => {
      if (item.children) {
        item.children.forEach(child => {
          if (child.route === '/branch-admin/queue') {
            child.badge = queueAlerts > 0 ? queueAlerts : undefined;
          } else if (child.route === '/branch-admin/appointments') {
            child.badge = this.dashboardMetrics.activeAppointments > 0 ? this.dashboardMetrics.activeAppointments : undefined;
          }
        });
      } else {
        if (item.route === '/branch-admin/inventory') {
          item.badge = inventoryAlerts > 0 ? inventoryAlerts : undefined;
        } else if (item.route === '/branch-admin/notifications') {
          item.badge = this.unreadAlertsCount > 0 ? this.unreadAlertsCount : undefined;
        }
      }
    });
  }

  private checkUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'branch-admin') {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleSidenav(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }

  navigateTo(route: string): void {
    if (route) {
      this.router.navigate([route]);
    }
  }

  markAlertAsRead(alert: BranchAlert): void {
    this.branchAdminService.markAlertAsRead(alert.id).subscribe(() => {
      alert.isRead = true;
      this.unreadAlertsCount = this.alerts.filter(a => !a.isRead).length;
      this.updateNavigationBadges();
    });
  }

  dismissAlert(alert: BranchAlert): void {
    this.branchAdminService.dismissAlert(alert.id).subscribe(() => {
      this.alerts = this.alerts.filter(a => a.id !== alert.id);
      this.unreadAlertsCount = this.alerts.filter(a => !a.isRead).length;
      this.criticalAlertsCount = this.alerts.filter(a => a.severity === 'critical').length;
      this.updateNavigationBadges();
    });
  }

  handleAlertAction(alert: BranchAlert): void {
    // Navigate to relevant section based on alert type
    switch (alert.type) {
      case 'doctor_absence':
        this.router.navigate(['/branch-admin/doctors']);
        break;
      case 'queue_overload':
        this.router.navigate(['/branch-admin/queue']);
        break;
      case 'appointment_delay':
      case 'appointment_conflict':
        this.router.navigate(['/branch-admin/appointments']);
        break;
      case 'inventory_low':
        this.router.navigate(['/branch-admin/inventory']);
        break;
      case 'billing_issue':
        this.router.navigate(['/branch-admin/billing']);
        break;
      default:
        this.router.navigate(['/branch-admin/overview']);
    }
    
    this.markAlertAsRead(alert);
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'doctor_absence': return 'person_off';
      case 'queue_overload': return 'queue';
      case 'appointment_delay': return 'schedule_problem';
      case 'appointment_conflict': return 'event_busy';
      case 'system_issue': return 'error';
      case 'inventory_low': return 'inventory_2';
      case 'billing_issue': return 'payment_problem';
      default: return 'notifications';
    }
  }

  getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'warn';
      case 'high': return 'warn';
      case 'medium': return 'accent';
      case 'low': return 'primary';
      default: return 'primary';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'check_circle';
      default: return 'info';
    }
  }

  getQueueLoadColor(): string {
    if (this.dashboardMetrics.queueLoad > 80) return 'warn';
    if (this.dashboardMetrics.queueLoad > 60) return 'accent';
    return 'primary';
  }

  getQueueLoadIcon(): string {
    if (this.dashboardMetrics.queueLoad > 80) return 'error';
    if (this.dashboardMetrics.queueLoad > 60) return 'warning';
    return 'check_circle';
  }

  refreshMetrics(): void {
    this.loadDashboardMetrics();
  }

  viewAppointments(): void {
    this.router.navigate(['/branch-admin/appointments']);
  }

  viewQueueMonitoring(): void {
    this.router.navigate(['/branch-admin/queue']);
  }

  viewScheduleManagement(): void {
    this.router.navigate(['/branch-admin/schedules']);
  }

  createWalkInAppointment(): void {
    this.router.navigate(['/branch-admin/walk-in']);
  }

  logout(): void {
    this.authService.logout();
  }

  getBranchDisplayName(branch: BranchProfile | null): string {
    if (!branch) return 'Branch Admin';
    return `${branch.name} (${branch.code})`;
  }

  refreshAlerts(): void {
    this.branchAdminService.getBranchAlerts().subscribe(alerts => {
      // This would update the alerts in the service
      this.loadBranchAlerts();
    });
  }
}