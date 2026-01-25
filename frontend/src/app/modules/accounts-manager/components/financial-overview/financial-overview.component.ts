import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountsManagerService, FinancialKPIs, FinancialAlert } from '../../services/accounts-manager.service';

@Component({
  selector: 'app-financial-overview',
  templateUrl: './financial-overview.component.html',
  styleUrls: ['./financial-overview.component.scss']
})
export class FinancialOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  kpis: FinancialKPIs | null = null;
  alerts: FinancialAlert[] = [];
  isLoading = true;

  // Chart data
  revenueChartData: any[] = [];
  collectionChartData: any[] = [];
  
  // Time period options
  timePeriods = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];
  
  selectedPeriod = 'month';

  constructor(private accountsManagerService: AccountsManagerService) {}

  ngOnInit(): void {
    this.loadFinancialOverview();
    this.subscribeToRealTimeData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFinancialOverview(): void {
    this.isLoading = true;
    
    this.accountsManagerService.getFinancialKPIs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (kpis) => {
          this.kpis = kpis;
          this.prepareChartData();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading financial overview:', error);
          this.isLoading = false;
        }
      });
  }

  private subscribeToRealTimeData(): void {
    this.accountsManagerService.kpis$
      .pipe(takeUntil(this.destroy$))
      .subscribe(kpis => {
        if (kpis) {
          this.kpis = kpis;
          this.prepareChartData();
        }
      });

    this.accountsManagerService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts.filter(alert => !alert.acknowledged);
      });
  }

  private prepareChartData(): void {
    if (!this.kpis) return;

    // Prepare revenue trend data (mock data for demonstration)
    this.revenueChartData = [
      { name: 'Week 1', revenue: this.kpis.totalRevenue * 0.2 },
      { name: 'Week 2', revenue: this.kpis.totalRevenue * 0.25 },
      { name: 'Week 3', revenue: this.kpis.totalRevenue * 0.3 },
      { name: 'Week 4', revenue: this.kpis.totalRevenue * 0.25 }
    ];

    // Prepare collection efficiency data
    this.collectionChartData = [
      { name: 'Collected', value: this.kpis.netCollections },
      { name: 'Outstanding', value: this.kpis.outstandingReceivables }
    ];
  }

  onPeriodChange(): void {
    this.loadFinancialOverview();
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

  getCollectionEfficiencyColor(efficiency: number): string {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 75) return 'text-yellow-600';
    return 'text-red-600';
  }

  getReceivableDaysColor(days: number): string {
    if (days <= 30) return 'text-green-600';
    if (days <= 60) return 'text-yellow-600';
    return 'text-red-600';
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
}