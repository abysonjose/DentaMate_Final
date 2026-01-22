import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { CentralAdminService, DashboardStats } from '../../services/central-admin.service';

@Component({
  selector: 'app-analytics-overview',
  templateUrl: './analytics-overview.component.html',
  styleUrls: ['./analytics-overview.component.scss']
})
export class AnalyticsOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboardStats: DashboardStats | null = null;
  isLoading = true;
  
  // Chart configurations
  revenueChartData: ChartData<'line'> = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [65000, 72000, 68000, 85000, 92000, 98000],
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        tension: 0.4
      }
    ]
  };
  
  revenueChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top'
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
  
  userGrowthChartData: ChartData<'bar'> = {
    labels: ['Patients', 'Doctors', 'Nurses', 'Staff', 'Admins'],
    datasets: [
      {
        label: 'Active Users',
        data: [1250, 85, 120, 95, 15],
        backgroundColor: [
          '#4caf50',
          '#2196f3',
          '#ff9800',
          '#9c27b0',
          '#f44336'
        ]
      }
    ]
  };
  
  userGrowthChartOptions: ChartConfiguration['options'] = {
    responsive: true,
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
  };
  
  aiUsageChartData: ChartData<'doughnut'> = {
    labels: ['X-ray Analysis', 'OCR Scanning', 'Chatbot', 'Diagnosis'],
    datasets: [
      {
        data: [45, 25, 20, 10],
        backgroundColor: [
          '#1976d2',
          '#388e3c',
          '#f57c00',
          '#7b1fa2'
        ]
      }
    ]
  };
  
  aiUsageChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  constructor(private centralAdminService: CentralAdminService) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardStats(): void {
    // Mock data for now - replace with real API call
    setTimeout(() => {
      this.dashboardStats = {
        totalClinics: 45,
        totalBranches: 128,
        totalUsers: 1565,
        activeSubscriptions: 42,
        totalRevenue: 485000,
        monthlyGrowth: 12.5,
        aiUsageStats: {
          totalRequests: 15420,
          accuracy: 94.2,
          activeModules: 4
        },
        systemHealth: {
          uptime: 99.8,
          responseTime: 245,
          errorRate: 0.02
        }
      };
      this.isLoading = false;
    }, 1000);
  }

  getGrowthIcon(growth: number): string {
    return growth > 0 ? 'trending_up' : growth < 0 ? 'trending_down' : 'trending_flat';
  }

  getGrowthColor(growth: number): string {
    return growth > 0 ? 'success' : growth < 0 ? 'warn' : 'primary';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  refreshData(): void {
    this.isLoading = true;
    this.loadDashboardStats();
  }
}