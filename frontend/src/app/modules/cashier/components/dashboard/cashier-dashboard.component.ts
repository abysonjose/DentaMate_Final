import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CashierService, CashierDashboardData } from '../../services/cashier.service';

@Component({
  selector: 'app-cashier-dashboard',
  templateUrl: './cashier-dashboard.component.html',
  styleUrls: ['./cashier-dashboard.component.scss']
})
export class CashierDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboardData: CashierDashboardData | null = null;
  isLoading = true;
  error: string | null = null;

  navigationItems = [
    {
      path: 'generate-bill',
      label: 'Generate Bill',
      icon: 'receipt',
      description: 'Generate invoices for completed treatments'
    },
    {
      path: 'accept-payment',
      label: 'Accept Payment',
      icon: 'payment',
      description: 'Process payments and mark invoices as paid'
    },
    {
      path: 'invoice-status-view',
      label: 'Invoice Status',
      icon: 'assignment',
      description: 'View invoice status (paid/unpaid)'
    }
  ];

  constructor(
    private cashierService: CashierService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.error = null;

    this.cashierService.getDashboardData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.error = 'Failed to load dashboard data. Please try again.';
          this.isLoading = false;
        }
      });
  }

  navigateTo(path: string): void {
    this.router.navigate(['/cashier', path]);
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'bill_generated':
        return 'receipt';
      case 'payment_received':
        return 'payment';
      case 'invoice_paid':
        return 'check_circle';
      default:
        return 'info';
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case 'bill_generated':
        return 'primary';
      case 'payment_received':
        return 'accent';
      case 'invoice_paid':
        return 'primary';
      default:
        return 'primary';
    }
  }
}