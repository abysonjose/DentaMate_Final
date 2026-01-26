import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { SaasAdminService, SystemAlert } from '../../services/saas-admin.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  children?: NavigationItem[];
}

interface QuickStats {
  totalClinics: number;
  activeLicenses: number;
  monthlyRevenue: number;
  systemHealth: number;
  criticalAlerts: number;
  expiringLicenses: number;
}

@Component({
  selector: 'app-saas-admin-dashboard',
  templateUrl: './saas-admin-dashboard.component.html',
  styleUrls: ['./saas-admin-dashboard.component.scss']
})
export class SaasAdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser$ = this.authService.currentUser$;
  alerts: SystemAlert[] = [];
  unreadAlertsCount = 0;
  criticalAlertsCount = 0;
  sidenavOpened = true;
  currentRoute = '';
  
  quickStats: QuickStats = {
    totalClinics: 0,
    activeLicenses: 0,
    monthlyRevenue: 0,
    systemHealth: 0,
    criticalAlerts: 0,
    expiringLicenses: 0
  };
  
  isLoadingStats = true;
  
  navigationItems: NavigationItem[] = [
    {
      label: 'Platform Overview',
      icon: 'dashboard',
      route: '/saas-admin/overview'
    },
    {
      label: 'License Management',
      icon: 'verified_user',
      route: '/saas-admin/licenses'
    },
    {
      label: 'Subscription Plans',
      icon: 'subscriptions',
      route: '/saas-admin/subscription-plans'
    },
    {
      label: 'Tenant Onboarding',
      icon: 'group_add',
      route: '/saas-admin/tenant-onboarding'
    },
    {
      label: 'Analytics & Reports',
      icon: 'analytics',
      route: '',
      children: [
        {
          label: 'Revenue Analytics',
          icon: 'trending_up',
          route: '/saas-admin/revenue-analytics'
        },
        {
          label: 'Usage Analytics',
          icon: 'bar_chart',
          route: '/saas-admin/usage-analytics'
        },
        {
          label: 'Customer Analytics',
          icon: 'people_alt',
          route: '/saas-admin/customer-analytics'
        }
      ]
    },
    {
      label: 'System Management',
      icon: 'settings',
      route: '',
      children: [
        {
          label: 'System Monitoring',
          icon: 'monitor_heart',
          route: '/saas-admin/system-monitoring'
        },
        {
          label: 'Feature Control',
          icon: 'toggle_on',
          route: '/saas-admin/feature-control'
        },
        {
          label: 'Maintenance Control',
          icon: 'build',
          route: '/saas-admin/maintenance'
        }
      ]
    },
    {
      label: 'Audit & Compliance',
      icon: 'security',
      route: '',
      children: [
        {
          label: 'Audit Logs',
          icon: 'history',
          route: '/saas-admin/audit-logs'
        },
        {
          label: 'Security Events',
          icon: 'shield',
          route: '/saas-admin/security-events'
        },
        {
          label: 'Compliance Reports',
          icon: 'assignment',
          route: '/saas-admin/compliance-reports'
        }
      ]
    }
  ];

  constructor(
    private authService: AuthService,
    private saasAdminService: SaasAdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSystemAlerts();
    this.loadQuickStats();
    this.subscribeToRouteChanges();
    this.subscribeToRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToRouteChanges(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });
  }

  private loadSystemAlerts(): void {
    this.saasAdminService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts;
        this.unreadAlertsCount = this.saasAdminService.getUnreadAlertsCount();
        this.criticalAlertsCount = this.saasAdminService.getCriticalAlertsCount();
        this.quickStats.criticalAlerts = this.criticalAlertsCount;
      });
  }

  private loadQuickStats(): void {
    this.isLoadingStats = true;
    
    this.saasAdminService.getDashboardOverview('7d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const data = response.data;
            this.quickStats = {
              totalClinics: data.overview.totalClinics,
              activeLicenses: data.overview.activeClinics,
              monthlyRevenue: data.overview.totalRevenue,
              systemHealth: data.overview.systemHealth,
              criticalAlerts: this.criticalAlertsCount,
              expiringLicenses: data.alerts.filter(alert => alert.severity === 'HIGH').length
            };
          }
          this.isLoadingStats = false;
        },
        error: (error) => {
          console.error('Error loading quick stats:', error);
          this.isLoadingStats = false;
        }
      });
  }

  private subscribeToRealTimeUpdates(): void {
    // Subscribe to real-time updates every 30 seconds
    this.saasAdminService.subscribeToRealTimeUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data.success) {
            // Update quick stats with latest data
            const overview = data.data.overview;
            this.quickStats = {
              ...this.quickStats,
              totalClinics: overview.totalClinics,
              activeLicenses: overview.activeClinics,
              monthlyRevenue: overview.totalRevenue,
              systemHealth: overview.systemHealth
            };
          }
        },
        error: (error) => {
          console.error('Real-time update error:', error);
        }
      });
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
    this.saasAdminService.markAlertAsRead(alert.id);
    
    if (alert.actionUrl) {
      this.router.navigate([alert.actionUrl]);
    }
  }

  dismissAlert(alert: SystemAlert, event: Event): void {
    event.stopPropagation();
    this.saasAdminService.dismissAlert(alert.id);
  }

  getAlertIcon(type: SystemAlert['type']): string {
    switch (type) {
      case 'LICENSE_EXPIRY':
        return 'schedule';
      case 'USAGE_LIMIT':
        return 'warning';
      case 'PAYMENT_FAILED':
        return 'payment';
      case 'SYSTEM_ERROR':
        return 'error';
      case 'SECURITY_INCIDENT':
        return 'security';
      default:
        return 'info';
    }
  }

  getAlertColor(severity: SystemAlert['severity']): string {
    switch (severity) {
      case 'CRITICAL':
        return 'warn';
      case 'HIGH':
        return 'accent';
      case 'MEDIUM':
        return 'primary';
      case 'LOW':
        return 'basic';
      default:
        return 'basic';
    }
  }

  getHealthColor(health: number): string {
    if (health >= 95) return 'success';
    if (health >= 85) return 'primary';
    if (health >= 70) return 'accent';
    return 'warn';
  }

  getHealthIcon(health: number): string {
    if (health >= 95) return 'check_circle';
    if (health >= 85) return 'info';
    if (health >= 70) return 'warning';
    return 'error';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }

  openUserProfile(): void {
    // Navigate to user profile or open profile dialog
    console.log('Open user profile');
  }

  openSettings(): void {
    this.router.navigate(['/saas-admin/system-configuration']);
  }

  openHelp(): void {
    // Open help documentation or support
    console.log('Open help');
  }
}