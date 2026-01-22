import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CentralAdminService, SystemAlert } from '../../services/central-admin.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  children?: NavigationItem[];
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
  
  navigationItems: NavigationItem[] = [
    {
      label: 'Overview',
      icon: 'dashboard',
      route: '/central-admin/overview'
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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSystemAlerts();
    this.checkUserPermissions();
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
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
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

  logout(): void {
    this.authService.logout();
  }
}