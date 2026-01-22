import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { BranchAdminService, BranchAlert, BranchProfile } from '../../services/branch-admin.service';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  children?: NavigationItem[];
  description?: string;
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
  
  navigationItems: NavigationItem[] = [
    {
      label: 'Branch Overview',
      icon: 'dashboard',
      route: '/branch-admin/overview',
      description: 'Daily operations summary and key metrics'
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
      label: 'Operations',
      icon: 'business_center',
      route: '',
      children: [
        {
          label: 'Appointments',
          icon: 'event',
          route: '/branch-admin/appointments'
        },
        {
          label: 'Queue Monitoring',
          icon: 'queue',
          route: '/branch-admin/queue'
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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBranchAlerts();
    this.checkUserPermissions();
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

  private updateNavigationBadges(): void {
    // Update badges based on alerts and system status
    const queueAlerts = this.alerts.filter(alert => alert.type === 'queue_overload' && !alert.isRead).length;
    const inventoryAlerts = this.alerts.filter(alert => alert.type === 'inventory_low' && !alert.isRead).length;
    
    // Find and update navigation items with badges
    this.navigationItems.forEach(item => {
      if (item.route === '/branch-admin/queue') {
        item.badge = queueAlerts > 0 ? queueAlerts : undefined;
      } else if (item.route === '/branch-admin/inventory') {
        item.badge = inventoryAlerts > 0 ? inventoryAlerts : undefined;
      } else if (item.route === '/branch-admin/notifications') {
        item.badge = this.unreadAlertsCount > 0 ? this.unreadAlertsCount : undefined;
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