import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, interval } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { PayrollOfficerService, PayrollAlert, PayrollStats } from '../../services/payroll-officer.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  children?: NavigationItem[];
}

@Component({
  selector: 'app-payroll-officer-dashboard',
  templateUrl: './payroll-officer-dashboard.component.html',
  styleUrls: ['./payroll-officer-dashboard.component.scss']
})
export class PayrollOfficerDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser$ = this.authService.currentUser$;
  dashboardStats$ = this.payrollService.dashboardStats$;
  alerts$ = this.payrollService.alerts$;
  
  alerts: PayrollAlert[] = [];
  unreadAlertsCount = 0;
  criticalAlertsCount = 0;
  sidenavOpened = true;
  isLoadingMetrics = true;
  
  navigationItems: NavigationItem[] = [
    {
      label: 'Payroll Overview',
      icon: 'dashboard',
      route: '/payroll-officer/overview'
    },
    {
      label: 'Payroll Cycles',
      icon: 'calendar_today',
      route: '/payroll-officer/payroll-cycles'
    },
    {
      label: 'Employee Payroll',
      icon: 'people',
      route: '/payroll-officer/employee-payroll'
    },
    {
      label: 'Salary Structures',
      icon: 'account_balance',
      route: '/payroll-officer/salary-structures'
    },
    {
      label: 'Attendance Integration',
      icon: 'schedule',
      route: '/payroll-officer/attendance-integration'
    },
    {
      label: 'Deductions Management',
      icon: 'money_off',
      route: '/payroll-officer/deductions-management'
    },
    {
      label: 'Payslips',
      icon: 'receipt',
      route: '/payroll-officer/payslips'
    },
    {
      label: 'Reports',
      icon: 'assessment',
      route: '/payroll-officer/reports'
    },
    {
      label: 'Finalization',
      icon: 'lock',
      route: '/payroll-officer/finalization'
    }
  ];

  constructor(
    private authService: AuthService,
    private payrollService: PayrollOfficerService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupRefreshInterval();
    this.checkUserPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private loadDashboardData(): void {
    this.isLoadingMetrics = true;
    
    forkJoin({
      stats: this.payrollService.getDashboardStats(),
      alerts: this.payrollService.getAlerts()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.alerts = data.alerts;
        this.unreadAlertsCount = data.alerts.filter(a => !a.isRead).length;
        this.criticalAlertsCount = data.alerts.filter(a => a.severity === 'critical').length;
        this.updateNavigationBadges();
        this.isLoadingMetrics = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.snackBar.open('Error loading dashboard data', 'Close', { duration: 3000 });
        this.isLoadingMetrics = false;
      }
    });
  }

  private setupRefreshInterval(): void {
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.payrollService.refreshDashboardStats();
        this.payrollService.refreshAlerts();
      });
  }

  private updateNavigationBadges(): void {
    const cycleAlerts = this.alerts.filter(a => a.type === 'finalization_ready' && !a.isRead).length;
    const approvalAlerts = this.alerts.filter(a => a.type === 'approval_pending' && !a.isRead).length;
    
    this.navigationItems.forEach(item => {
      if (item.route === '/payroll-officer/payroll-cycles') {
        item.badge = cycleAlerts > 0 ? cycleAlerts : undefined;
      } else if (item.route === '/payroll-officer/finalization') {
        item.badge = approvalAlerts > 0 ? approvalAlerts : undefined;
      }
    });
  }

  private checkUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'payroll-officer') {
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

  markAlertAsRead(alert: PayrollAlert): void {
    this.payrollService.markAlertAsRead(alert.id).subscribe(() => {
      alert.isRead = true;
      this.unreadAlertsCount = this.alerts.filter(a => !a.isRead).length;
      this.updateNavigationBadges();
    });
  }

  dismissAlert(alert: PayrollAlert): void {
    this.payrollService.dismissAlert(alert.id).subscribe(() => {
      this.alerts = this.alerts.filter(a => a.id !== alert.id);
      this.unreadAlertsCount = this.alerts.filter(a => !a.isRead).length;
      this.criticalAlertsCount = this.alerts.filter(a => a.severity === 'critical').length;
      this.updateNavigationBadges();
    });
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'missing_data': return 'warning';
      case 'calculation_error': return 'error';
      case 'approval_pending': return 'schedule';
      case 'finalization_ready': return 'check_circle';
      default: return 'info';
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

  refreshMetrics(): void {
    this.loadDashboardData();
  }

  logout(): void {
    this.authService.logout();
  }
}