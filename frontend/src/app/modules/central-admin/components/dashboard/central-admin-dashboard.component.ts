import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CentralAdminService, SystemAlert } from '../../services/central-admin.service';
import { CentralAppointmentService, SystemWideMetrics } from '../../services/appointment.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  children?: NavigationItem[];
}

interface DashboardMetrics {
  totalClinics: number;
  totalBranches: number;
  totalUsers: number;
  activeSubscriptions: number;
  systemHealth: number;
  
  // Appointment metrics
  activeAppointments: number;
  waitingPatients: number;
  inConsultation: number;
  completedToday: number;
  averageWaitTime: number;
  systemLoad: number;
}

@Component({
  selector: 'app-central-admin-dashboard',
  templateUrl: './central-admin-dashboard.component.html',
  styleUrls: ['./central-admin-dashboard.component.scss']
})
export class CentralAdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser$ = this.authService.currentUser$;
  alerts: SystemAlert[] = [];
  unreadAlertsCount = 0;
  sidenavOpened = true;
  
  // Dashboard metrics
  dashboardMetrics: DashboardMetrics = {
    totalClinics: 0,
    totalBranches: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    systemHealth: 0,
    activeAppointments: 0,
    waitingPatients: 0,
    inConsultation: 0,
    completedToday: 0,
    averageWaitTime: 0,
    systemLoad: 0
  };
  
  systemWideMetrics: SystemWideMetrics | null = null;
  isLoadingMetrics = true;
  
  navigationItems: NavigationItem[] = [
    {
      label: 'Overview',
      icon: 'dashboard',
      route: '/central-admin/overview'
    },
    {
      label: 'Appointment Management',
      icon: 'event',
      route: '',
      children: [
        {
          label: 'Global Appointments',
          icon: 'calendar_today',
          route: '/central-admin/appointments'
        },
        {
          label: 'Queue Monitoring',
          icon: 'queue',
          route: '/central-admin/queue-monitoring'
        },
        {
          label: 'Capacity Management',
          icon: 'timeline',
          route: '/central-admin/capacity'
        },
        {
          label: 'Appointment Analytics',
          icon: 'insights',
          route: '/central-admin/appointment-analytics'
        }
      ]
    },
    {
      label: 'Organization Management',
      icon: 'business',
      route: '',
      children: [
        {
          label: 'Clinics',
          icon: 'local_hospital',
          route: '/central-admin/clinics'
        },
        {
          label: 'Branches',
          icon: 'account_tree',
          route: '/central-admin/branches'
        }
      ]
    },
    {
      label: 'User Management',
      icon: 'people',
      route: '/central-admin/users'
    },
    {
      label: 'Subscriptions & Billing',
      icon: 'payment',
      route: '/central-admin/subscriptions'
    },
    {
      label: 'AI System Monitoring',
      icon: 'psychology',
      route: '/central-admin/ai-monitoring'
    },
    {
      label: 'Financial Analytics',
      icon: 'analytics',
      route: '/central-admin/financial-analytics'
    },
    {
      label: 'Reports',
      icon: 'assessment',
      route: '/central-admin/reports'
    },
    {
      label: 'System Configuration',
      icon: 'settings',
      route: '/central-admin/system-config'
    },
    {
      label: 'Audit Logs',
      icon: 'history',
      route: '/central-admin/audit-logs'
    }
  ];

  constructor(
    private authService: AuthService,
    private centralAdminService: CentralAdminService,
    private appointmentService: CentralAppointmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSystemAlerts();
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

  private loadSystemAlerts(): void {
    this.centralAdminService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts;
        this.unreadAlertsCount = alerts.filter(alert => !alert.isRead).length;
      });
  }

  private loadDashboardMetrics(): void {
    this.isLoadingMetrics = true;
    
    forkJoin({
      systemMetrics: this.appointmentService.getSystemWideMetrics(),
      systemAlerts: this.appointmentService.getSystemAlerts()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.systemWideMetrics = data.systemMetrics;
        
        // Update dashboard metrics
        this.dashboardMetrics = {
          ...this.dashboardMetrics,
          activeAppointments: data.systemMetrics.activeAppointments,
          waitingPatients: data.systemMetrics.waitingPatients,
          inConsultation: data.systemMetrics.inConsultation,
          completedToday: data.systemMetrics.completedToday,
          averageWaitTime: data.systemMetrics.averageWaitTime,
          systemLoad: data.systemMetrics.systemLoad
        };
        
        // Merge appointment alerts with system alerts
        const appointmentAlerts = data.systemAlerts.map(alert => ({
          id: `apt-${Date.now()}-${Math.random()}`,
          type: alert.type,
          message: alert.message,
          severity: alert.severity,
          timestamp: alert.timestamp,
          isRead: false,
          clinicId: alert.clinicId,
          appointmentId: alert.appointmentId
        }));
        
        this.alerts = [...this.alerts, ...appointmentAlerts];
        this.unreadAlertsCount = this.alerts.filter(alert => !alert.isRead).length;
        
        this.isLoadingMetrics = false;
      },
      error: (error) => {
        console.error('Error loading dashboard metrics:', error);
        this.isLoadingMetrics = false;
      }
    });
  }

  private checkUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'central-admin') {
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

  markAlertAsRead(alert: SystemAlert): void {
    this.centralAdminService.markAlertAsRead(alert.id).subscribe(() => {
      alert.isRead = true;
      this.unreadAlertsCount = this.alerts.filter(a => !a.isRead).length;
    });
  }

  dismissAlert(alert: SystemAlert): void {
    this.centralAdminService.dismissAlert(alert.id).subscribe(() => {
      this.alerts = this.alerts.filter(a => a.id !== alert.id);
      this.unreadAlertsCount = this.alerts.filter(a => !a.isRead).length;
    });
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'error': 
      case 'overdue': return 'error';
      case 'warning': 
      case 'conflict': return 'warning';
      case 'info': 
      case 'capacity': return 'info';
      case 'system': return 'settings';
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

  getSystemHealthColor(): string {
    if (this.dashboardMetrics.systemLoad > 90) return 'warn';
    if (this.dashboardMetrics.systemLoad > 70) return 'accent';
    return 'primary';
  }

  getSystemHealthIcon(): string {
    if (this.dashboardMetrics.systemLoad > 90) return 'error';
    if (this.dashboardMetrics.systemLoad > 70) return 'warning';
    return 'check_circle';
  }

  refreshMetrics(): void {
    this.loadDashboardMetrics();
  }

  viewAppointmentDetails(): void {
    this.router.navigate(['/central-admin/appointments']);
  }

  viewQueueMonitoring(): void {
    this.router.navigate(['/central-admin/queue-monitoring']);
  }

  viewCapacityManagement(): void {
    this.router.navigate(['/central-admin/capacity']);
  }

  viewAppointmentAnalytics(): void {
    this.router.navigate(['/central-admin/appointment-analytics']);
  }

  logout(): void {
    this.authService.logout();
  }
}