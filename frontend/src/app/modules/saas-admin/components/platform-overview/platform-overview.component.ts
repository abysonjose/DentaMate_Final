import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SaasAdminService } from '../../services/saas-admin.service';
import { LicenseService } from '../../services/license.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  systemUptime: number;
  activeServices: number;
  totalServices: number;
}

interface GrowthMetrics {
  newSignups: number;
  churnRate: number;
  netGrowth: number;
  revenueGrowth: number;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
}

@Component({
  selector: 'app-platform-overview',
  templateUrl: './platform-overview.component.html',
  styleUrls: ['./platform-overview.component.scss']
})
export class PlatformOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  platformMetrics: PlatformMetrics = {
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    suspendedTenants: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    systemUptime: 0,
    activeServices: 0,
    totalServices: 0
  };
  
  growthMetrics: GrowthMetrics = {
    newSignups: 0,
    churnRate: 0,
    netGrowth: 0,
    revenueGrowth: 0
  };
  
  serviceStatuses: ServiceStatus[] = [];
  recentActivities: any[] = [];
  
  // Chart configurations
  tenantDistributionChart: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Trial', 'Suspended', 'Expired'],
      datasets: [{
        data: [0, 0, 0, 0],
        backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#f44336'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  };
  
  revenueChart: ChartConfiguration = {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Monthly Revenue',
        data: [],
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + (value as number).toLocaleString();
            }
          }
        }
      }
    }
  };
  
  signupChart: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'New Signups',
        data: [],
        backgroundColor: '#4caf50',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  constructor(
    private saasAdminService: SaasAdminService,
    private licenseService: LicenseService
  ) {}

  ngOnInit(): void {
    this.loadPlatformOverview();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPlatformOverview(): void {
    this.loading = true;
    
    // Load platform metrics
    this.saasAdminService.getPlatformMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        this.platformMetrics = metrics;
        this.updateTenantDistributionChart();
        this.loading = false;
      });
    
    // Load growth metrics
    this.saasAdminService.getGrowthMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        this.growthMetrics = metrics;
      });
    
    // Load service statuses
    this.saasAdminService.getServiceStatuses()
      .pipe(takeUntil(this.destroy$))
      .subscribe(statuses => {
        this.serviceStatuses = statuses;
      });
    
    // Load revenue chart data
    this.saasAdminService.getRevenueChartData(12)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.revenueChart.data!.labels = data.labels;
        this.revenueChart.data!.datasets[0].data = data.values;
      });
    
    // Load signup chart data
    this.saasAdminService.getSignupChartData(30)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.signupChart.data!.labels = data.labels;
        this.signupChart.data!.datasets[0].data = data.values;
      });
    
    // Load recent activities
    this.saasAdminService.getRecentActivities(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe(activities => {
        this.recentActivities = activities;
      });
  }

  private updateTenantDistributionChart(): void {
    this.tenantDistributionChart.data!.datasets[0].data = [
      this.platformMetrics.activeTenants,
      this.platformMetrics.trialTenants,
      this.platformMetrics.suspendedTenants,
      this.platformMetrics.totalTenants - this.platformMetrics.activeTenants - 
      this.platformMetrics.trialTenants - this.platformMetrics.suspendedTenants
    ];
  }

  private setupAutoRefresh(): void {
    // Refresh every 5 minutes
    setInterval(() => {
      this.loadPlatformOverview();
    }, 5 * 60 * 1000);
  }

  getServiceStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return 'check_circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'help';
    }
  }

  getServiceStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return 'primary';
      case 'warning': return 'accent';
      case 'error': return 'warn';
      default: return '';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'license_issued': return 'verified_user';
      case 'tenant_created': return 'business';
      case 'payment_received': return 'payment';
      case 'service_deployed': return 'cloud_upload';
      case 'maintenance_started': return 'build';
      default: return 'info';
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

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  refreshData(): void {
    this.loadPlatformOverview();
  }
}