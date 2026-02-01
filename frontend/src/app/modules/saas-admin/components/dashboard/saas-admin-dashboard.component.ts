import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { SaasAdminService } from '../../services/saas-admin.service';
import { AuthService } from '../../../../core/auth/auth.service';

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
  badgeColor?: string;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  actions?: { label: string; action: () => void }[];
}

@Component({
  selector: 'app-saas-admin-dashboard',
  templateUrl: './saas-admin-dashboard.component.html',
  styleUrls: ['./saas-admin-dashboard.component.scss']
})
export class SaasAdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: any;
  currentRoute = 'overview';
  sidenavOpened = true;
  alerts: Alert[] = [];
  
  navigationItems: NavigationItem[] = [
    {
      path: 'overview',
      label: 'Platform Overview',
      icon: 'dashboard'
    },
    {
      path: 'licenses',
      label: 'License Management',
      icon: 'verified_user',
      badge: 0,
      badgeColor: 'warn'
    },
    {
      path: 'subscription-plans',
      label: 'Subscription Plans',
      icon: 'payment'
    },
    {
      path: 'tenant-onboarding',
      label: 'Tenant Onboarding',
      icon: 'business'
    },
    {
      path: 'revenue-analytics',
      label: 'Revenue Analytics',
      icon: 'trending_up'
    },
    {
      path: 'system-monitoring',
      label: 'System Monitoring',
      icon: 'monitor_heart'
    },
    {
      path: 'feature-control',
      label: 'Feature Control',
      icon: 'tune'
    },
    {
      path: 'audit-logs',
      label: 'Audit Logs',
      icon: 'history'
    },
    {
      path: 'maintenance',
      label: 'Maintenance',
      icon: 'build'
    }
  ];

  constructor(
    private router: Router,
    private saasAdminService: SaasAdminService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.setupRouteTracking();
    this.loadAlerts();
    this.loadNavigationBadges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  private setupRouteTracking(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        const urlSegments = event.urlAfterRedirects.split('/');
        this.currentRoute = urlSegments[urlSegments.length - 1] || 'overview';
      });
  }

  private loadAlerts(): void {
    this.saasAdminService.getSystemAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts.map(alert => ({
          ...alert,
          actions: this.getAlertActions(alert)
        }));
      });
  }

  private loadNavigationBadges(): void {
    // Load expiring licenses count
    this.saasAdminService.getExpiringLicensesCount(30)
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        const licenseItem = this.navigationItems.find(item => item.path === 'licenses');
        if (licenseItem) {
          licenseItem.badge = count;
          licenseItem.badgeColor = count > 0 ? 'warn' : 'primary';
        }
      });
  }

  private getAlertActions(alert: any): { label: string; action: () => void }[] {
    switch (alert.type) {
      case 'license_expiring':
        return [
          {
            label: 'View Licenses',
            action: () => this.router.navigate(['/saas-admin/licenses'])
          }
        ];
      case 'service_down':
        return [
          {
            label: 'Check Status',
            action: () => this.router.navigate(['/saas-admin/system-monitoring'])
          }
        ];
      case 'payment_failed':
        return [
          {
            label: 'View Revenue',
            action: () => this.router.navigate(['/saas-admin/revenue-analytics'])
          }
        ];
      default:
        return [];
    }
  }

  navigateTo(path: string): void {
    this.router.navigate(['/saas-admin', path]);
  }

  dismissAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
    this.saasAdminService.dismissAlert(alertId).subscribe();
  }

  toggleSidenav(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }

  getAlertColor(type: string): string {
    switch (type) {
      case 'error': return 'warn';
      case 'warning': return 'accent';
      case 'info': return 'primary';
      default: return 'primary';
    }
  }
}