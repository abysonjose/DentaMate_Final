import { Component, OnInit } from '@angular/core';
import { AccountantService, FinancialOverview } from '../../services/accountant.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-accountant-dashboard',
  templateUrl: './accountant-dashboard.component.html',
  styleUrls: ['./accountant-dashboard.component.scss']
})
export class AccountantDashboardComponent implements OnInit {
  financialOverview: FinancialOverview | null = null;
  loading = true;
  
  // Quick stats for cards
  quickStats = [
    {
      title: 'Total Billed Today',
      value: 0,
      icon: 'receipt_long',
      color: 'primary',
      trend: '+12%'
    },
    {
      title: 'Payments Received',
      value: 0,
      icon: 'payments',
      color: 'accent',
      trend: '+8%'
    },
    {
      title: 'Outstanding Dues',
      value: 0,
      icon: 'account_balance',
      color: 'warn',
      trend: '-5%'
    },
    {
      title: 'Pending Reconciliations',
      value: 0,
      icon: 'sync_problem',
      color: 'warn',
      trend: '3 items'
    }
  ];

  // Recent activities
  recentActivities = [
    {
      action: 'Payment Reconciled',
      description: 'INV-2024-001 - ₹2,500 matched with UPI payment',
      timestamp: new Date(),
      type: 'success'
    },
    {
      action: 'Billing Discrepancy Flagged',
      description: 'INV-2024-002 - Missing service charge',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      type: 'warning'
    },
    {
      action: 'Ledger Entry Tagged',
      description: 'Equipment purchase categorized under CAPEX',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      type: 'info'
    }
  ];

  // Alerts
  alerts = [
    {
      type: 'error',
      message: '5 transactions require immediate attention',
      action: 'Review Now'
    },
    {
      type: 'warning',
      message: '12 invoices are overdue by 30+ days',
      action: 'View Details'
    },
    {
      type: 'info',
      message: 'Monthly report ready for export',
      action: 'Download'
    }
  ];

  constructor(
    private accountantService: AccountantService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadFinancialOverview();
  }

  loadFinancialOverview(): void {
    this.loading = true;
    this.accountantService.getFinancialOverview().subscribe({
      next: (overview) => {
        this.financialOverview = overview;
        this.updateQuickStats(overview);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading financial overview:', error);
        this.snackBar.open('Error loading financial data', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  private updateQuickStats(overview: FinancialOverview): void {
    this.quickStats[0].value = overview.dailyRevenue;
    this.quickStats[1].value = overview.paymentsReceived;
    this.quickStats[2].value = overview.outstandingDues;
    this.quickStats[3].value = overview.pendingReconciliations;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  handleAlertAction(alert: any): void {
    switch (alert.action) {
      case 'Review Now':
        // Navigate to payment verification
        break;
      case 'View Details':
        // Navigate to receivables tracking
        break;
      case 'Download':
        // Trigger report download
        break;
    }
  }

  refreshData(): void {
    this.loadFinancialOverview();
  }
}