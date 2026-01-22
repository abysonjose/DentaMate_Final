import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BranchAdminService, DashboardStats, BranchAlert } from '../../services/branch-admin.service';

@Component({
  selector: 'app-branch-overview',
  templateUrl: './branch-overview.component.html',
  styleUrls: ['./branch-overview.component.scss']
})
export class BranchOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboardStats: DashboardStats | null = null;
  alerts: BranchAlert[] = [];
  isLoading = true;
  
  // Chart configurations
  appointmentTrendsData: ChartData<'line'> = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Appointments',
        data: [25, 32, 28, 35, 30, 20, 15],
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        tension: 0.4
      },
      {
        label: 'Completed',
        data: [23, 30, 26, 33, 28, 18, 14],
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4
      }
    ]
  };
  
  appointmentTrendsOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  
  departmentUtilizationData: ChartData<'doughnut'> = {
    labels: ['General Dentistry', 'Orthodontics', 'Oral Surgery', 'Pediatric'],
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
  
  departmentUtilizationOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  constructor(private branchAdminService: BranchAdminService) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadAlerts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    // Mock data for now - replace with real API call
    setTimeout(() => {
      this.dashboardStats = {
        todayAppointments: 28,
        activeDoctors: 6,
        queueLength: 12,
        completedConsultations: 23,
        totalStaff: 18,
        activeStaff: 16,
        todayRevenue: 8450,
        pendingBills: 5,
        lowStockItems: 3,
        criticalAlerts: 2
      };
      this.isLoading = false;
    }, 1000);
  }

  private loadAlerts(): void {
    this.branchAdminService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts.filter(alert => !alert.isRead).slice(0, 5);
      });
  }

  refreshData(): void {
    this.isLoading = true;
    this.loadDashboardData();
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

  handleAlertAction(alert: BranchAlert): void {
    // Mark as read and navigate to relevant section
    this.branchAdminService.markAlertAsRead(alert.id).subscribe();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getStatusColor(value: number, threshold: number): string {
    return value > threshold ? 'warn' : 'primary';
  }

  getUtilizationPercentage(current: number, total: number): number {
    return total > 0 ? Math.round((current / total) * 100) : 0;
  }
}