import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { SaasAdminService, PlatformOverview } from '../../services/saas-admin.service';
import { SaasAnalyticsService } from '../../services/saas-analytics.service';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
  color: string;
}

@Component({
  selector: 'app-platform-overview',
  templateUrl: './platform-overview.component.html',
  styleUrls: ['./platform-overview.component.scss']
})
export class PlatformOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = true;
  selectedPeriod = '30d';
  platformData: PlatformOverview | null = null;
  
  periodOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '365d', label: 'Last Year' }
  ];

  metricCards: MetricCard[] = [];

  // Chart configurations
  revenueChartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };

  revenueChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: 'Revenue Trend'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  subscriptionChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: []
  };

  subscriptionChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right'
      },
      title: {
        display: true,
        text: 'Subscription Distribution'
      }
    }
  };

  geographicChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  geographicChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: 'Geographic Distribution'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  constructor(
    private saasAdminService: SaasAdminService,
    private analyticsService: SaasAnalyticsService
  ) {}

  ngOnInit(): void {
    this.loadPlatformOverview();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPeriodChange(): void {
    this.loadPlatformOverview();
  }

  private loadPlatformOverview(): void {
    this.isLoading = true;
    
    this.saasAdminService.getDashboardOverview(this.selectedPeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.platformData = response.data;
            this.updateMetricCards();
            this.updateCharts();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading platform overview:', error);
          this.isLoading = false;
        }
      });
  }

  private updateMetricCards(): void {
    if (!this.platformData) return;

    const data = this.platformData;
    
    this.metricCards = [
      {
        title: 'Total Clinics',
        value: data.overview.totalClinics,
        change: data.growth.netGrowth,
        changeType: data.growth.netGrowth > 0 ? 'increase' : data.growth.netGrowth < 0 ? 'decrease' : 'neutral',
        icon: 'business',
        color: 'primary'
      },
      {
        title: 'Active Clinics',
        value: data.overview.activeClinics,
        change: ((data.overview.activeClinics / data.overview.totalClinics) * 100) - 85, // Assuming 85% baseline
        changeType: data.overview.activeClinics > (data.overview.totalClinics * 0.85) ? 'increase' : 'decrease',
        icon: 'verified',
        color: 'success'
      },
      {
        title: 'Total Revenue',
        value: this.formatCurrency(data.overview.totalRevenue),
        change: data.growth.revenueGrowth.growthPercentage,
        changeType: data.growth.revenueGrowth.growthPercentage > 0 ? 'increase' : 'decrease',
        icon: 'trending_up',
        color: 'accent'
      },
      {
        title: 'Active Users',
        value: this.formatNumber(data.overview.activeUsers),
        change: 12.5, // Mock data - would come from API
        changeType: 'increase',
        icon: 'people',
        color: 'primary'
      },
      {
        title: 'System Health',
        value: data.overview.systemHealth + '%',
        change: data.overview.systemHealth - 95, // Assuming 95% baseline
        changeType: data.overview.systemHealth >= 95 ? 'increase' : 'decrease',
        icon: 'monitor_heart',
        color: data.overview.systemHealth >= 95 ? 'success' : data.overview.systemHealth >= 85 ? 'warn' : 'error'
      },
      {
        title: 'Critical Alerts',
        value: data.alerts.filter(alert => alert.severity === 'CRITICAL').length,
        change: -2, // Mock data - would come from API
        changeType: 'decrease',
        icon: 'warning',
        color: 'warn'
      }
    ];
  }

  private updateCharts(): void {
    if (!this.platformData) return;

    this.updateRevenueChart();
    this.updateSubscriptionChart();
    this.updateGeographicChart();
  }

  private updateRevenueChart(): void {
    // Mock revenue trend data - would come from API
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const revenueData = [45000, 52000, 48000, 61000, 58000, 67000];
    const growthData = [8.2, 15.6, -7.7, 27.1, -4.9, 15.5];

    this.revenueChartData = {
      labels: months,
      datasets: [
        {
          label: 'Revenue ($)',
          data: revenueData,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Growth (%)',
          data: growthData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: false,
          yAxisID: 'y1'
        }
      ]
    };

    // Update chart options to include second y-axis
    this.revenueChartOptions = {
      ...this.revenueChartOptions,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    };
  }

  private updateSubscriptionChart(): void {
    const distribution = this.platformData?.distribution.subscriptionDistribution || [];
    
    this.subscriptionChartData = {
      labels: distribution.map(item => item.plan),
      datasets: [
        {
          data: distribution.map(item => item.clinics),
          backgroundColor: [
            '#2196F3',
            '#4CAF50',
            '#FF9800',
            '#9C27B0',
            '#F44336'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }
      ]
    };
  }

  private updateGeographicChart(): void {
    const geographic = this.platformData?.distribution.geographicDistribution || [];
    
    this.geographicChartData = {
      labels: geographic.map(item => item.region),
      datasets: [
        {
          label: 'Clinics',
          data: geographic.map(item => item.clinics),
          backgroundColor: '#2196F3',
          borderColor: '#1976D2',
          borderWidth: 1
        },
        {
          label: 'Users',
          data: geographic.map(item => item.users),
          backgroundColor: '#4CAF50',
          borderColor: '#388E3C',
          borderWidth: 1
        }
      ]
    };
  }

  getChangeIcon(changeType: string): string {
    switch (changeType) {
      case 'increase':
        return 'trending_up';
      case 'decrease':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  }

  getChangeColor(changeType: string): string {
    switch (changeType) {
      case 'increase':
        return 'success';
      case 'decrease':
        return 'warn';
      default:
        return 'basic';
    }
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

  refreshData(): void {
    this.loadPlatformOverview();
  }

  exportData(): void {
    // Implement data export functionality
    console.log('Exporting platform overview data...');
  }
}