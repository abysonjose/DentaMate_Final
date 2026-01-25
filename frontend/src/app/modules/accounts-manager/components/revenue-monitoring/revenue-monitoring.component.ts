import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountsManagerService, RevenueAnalytics } from '../../services/accounts-manager.service';

@Component({
  selector: 'app-revenue-monitoring',
  templateUrl: './revenue-monitoring.component.html',
  styleUrls: ['./revenue-monitoring.component.scss']
})
export class RevenueMonitoringComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  revenueAnalytics: RevenueAnalytics | null = null;
  isLoading = true;
  selectedPeriod = 'month';

  timePeriods = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];

  constructor(private accountsManagerService: AccountsManagerService) {}

  ngOnInit(): void {
    this.loadRevenueAnalytics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRevenueAnalytics(): void {
    this.isLoading = true;
    
    this.accountsManagerService.getRevenueAnalytics(this.selectedPeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (analytics) => {
          this.revenueAnalytics = analytics;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading revenue analytics:', error);
          this.isLoading = false;
        }
      });
  }

  onPeriodChange(): void {
    this.loadRevenueAnalytics();
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
    return `${value.toFixed(1)}%`;
  }

  getGrowthColor(growth: number): string {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  }

  getGrowthIcon(growth: number): string {
    return growth >= 0 ? 'trending_up' : 'trending_down';
  }

  getPaymentModeIcon(mode: string): string {
    switch (mode) {
      case 'CASH': return 'money';
      case 'UPI': return 'qr_code';
      case 'CARD': return 'credit_card';
      case 'WALLET': return 'account_balance_wallet';
      case 'INSURANCE': return 'security';
      default: return 'payment';
    }
  }
}