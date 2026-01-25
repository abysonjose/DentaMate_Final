import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountsManagerService, FinancialKPIs, FinancialAlert, PendingApproval } from '../../services/accounts-manager.service';

@Component({
  selector: 'app-accounts-manager-dashboard',
  templateUrl: './accounts-manager-dashboard.component.html',
  styleUrls: ['./accounts-manager-dashboard.component.scss']
})
export class AccountsManagerDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  kpis: FinancialKPIs | null = null;
  alerts: FinancialAlert[] = [];
  pendingApprovals: PendingApproval[] = [];
  isLoading = true;

  navigationItems = [
    { 
      path: 'overview', 
      label: 'Financial Overview', 
      icon: 'dashboard',
      description: 'High-level financial KPIs and performance metrics'
    },
    { 
      path: 'revenue', 
      label: 'Revenue Monitoring', 
      icon: 'trending_up',
      description: 'Department, doctor, and treatment revenue analysis'
    },
    { 
      path: 'billing', 
      label: 'Billing Oversight', 
      icon: 'receipt_long',
      description: 'Review flagged bills and approve adjustments'
    },
    { 
      path: 'refunds', 
      label: 'Refund Management', 
      icon: 'money_off',
      description: 'Approve or reject refund requests'
    },
    { 
      path: 'receivables', 
      label: 'Receivables Control', 
      icon: 'account_balance',
      description: 'Monitor outstanding dues and aging analysis'
    },
    { 
      path: 'expenses', 
      label: 'Expense Oversight', 
      icon: 'payments',
      description: 'Review operational costs and expense patterns'
    },
    { 
      path: 'supervision', 
      label: 'Accountant Supervision', 
      icon: 'supervisor_account',
      description: 'Monitor accountant activities and assign tasks'
    },
    { 
      path: 'reports', 
      label: 'Financial Reports', 
      icon: 'assessment',
      description: 'Generate and export financial statements'
    },
    { 
      path: 'audit', 
      label: 'Audit & Compliance', 
      icon: 'verified',
      description: 'Review audit logs and compliance reports'
    },
    { 
      path: 'policies', 
      label: 'Policy Configuration', 
      icon: 'settings',
      description: 'Configure approval thresholds and policies'
    }
  ];

  constructor(
    private accountsManagerService: AccountsManagerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.subscribeToRealTimeData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load initial data
    this.accountsManagerService.getFinancialKPIs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (kpis) => {
          this.kpis = kpis;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading KPIs:', error);
          this.isLoading = false;
        }
      });
  }

  private subscribeToRealTimeData(): void {
    // Subscribe to real-time KPIs
    this.accountsManagerService.kpis$
      .pipe(takeUntil(this.destroy$))
      .subscribe(kpis => {
        if (kpis) {
          this.kpis = kpis;
        }
      });

    // Subscribe to real-time alerts
    this.accountsManagerService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts.filter(alert => !alert.acknowledged);
      });

    // Subscribe to pending approvals
    this.accountsManagerService.pendingApprovals$
      .pipe(takeUntil(this.destroy$))
      .subscribe(approvals => {
        this.pendingApprovals = approvals;
      });
  }

  navigateTo(path: string): void {
    this.router.navigate(['/accounts-manager', path]);
  }

  acknowledgeAlert(alertId: string): void {
    this.accountsManagerService.acknowledgeAlert(alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.alerts = this.alerts.filter(alert => alert.id !== alertId);
      });
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'REVENUE_DROP': return 'trending_down';
      case 'HIGH_OUTSTANDING': return 'warning';
      case 'AUDIT_FLAG': return 'flag';
      case 'POLICY_VIOLATION': return 'error';
      default: return 'info';
    }
  }

  getAlertColor(severity: string): string {
    switch (severity) {
      case 'HIGH': return 'warn';
      case 'MEDIUM': return 'accent';
      case 'LOW': return 'primary';
      default: return 'primary';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  getGrowthColor(growth: number): string {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  }

  getGrowthIcon(growth: number): string {
    return growth >= 0 ? 'trending_up' : 'trending_down';
  }
}