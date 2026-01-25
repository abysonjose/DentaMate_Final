import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HrService, HrDashboardStats, Alert } from '../../services/hr.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-hr-dashboard',
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.scss']
})
export class HrDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboardStats: HrDashboardStats | null = null;
  alerts: Alert[] = [];
  loading = true;
  
  // Chart data
  roleChartData: any[] = [];
  departmentChartData: any[] = [];
  attendanceTrendData: any[] = [];
  
  // Quick stats
  quickStats = [
    { label: 'Total Staff', value: 0, icon: 'people', color: 'primary' },
    { label: 'On Duty', value: 0, icon: 'work', color: 'accent' },
    { label: 'Absent Today', value: 0, icon: 'person_off', color: 'warn' },
    { label: 'Pending Leaves', value: 0, icon: 'pending_actions', color: 'primary' }
  ];

  constructor(
    private hrService: HrService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupDataSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDataSubscriptions(): void {
    this.hrService.dashboardStats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        if (stats) {
          this.dashboardStats = stats;
          this.updateQuickStats(stats);
          this.updateChartData(stats);
        }
      });

    this.hrService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts;
      });
  }

  private loadDashboardData(): void {
    this.loading = true;
    
    this.hrService.getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.dashboardStats = stats;
          this.updateQuickStats(stats);
          this.updateChartData(stats);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard stats:', error);
          this.snackBar.open('Error loading dashboard data', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });

    this.hrService.getAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.alerts = alerts;
        },
        error: (error) => {
          console.error('Error loading alerts:', error);
        }
      });
  }

  private updateQuickStats(stats: HrDashboardStats): void {
    this.quickStats = [
      { label: 'Total Staff', value: stats.totalStaff, icon: 'people', color: 'primary' },
      { label: 'On Duty', value: stats.onDutyStaff, icon: 'work', color: 'accent' },
      { label: 'Absent Today', value: stats.absentStaff, icon: 'person_off', color: 'warn' },
      { label: 'Pending Leaves', value: stats.pendingLeaveRequests, icon: 'pending_actions', color: 'primary' }
    ];
  }

  private updateChartData(stats: HrDashboardStats): void {
    // Role distribution chart
    this.roleChartData = Object.entries(stats.roleDistribution).map(([role, count]) => ({
      name: role,
      value: count
    }));

    // Department distribution chart
    this.departmentChartData = Object.entries(stats.departmentDistribution).map(([dept, count]) => ({
      name: dept,
      value: count
    }));
  }

  acknowledgeAlert(alert: Alert): void {
    this.hrService.acknowledgeAlert(alert.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert.acknowledged = true;
          this.snackBar.open('Alert acknowledged', 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error acknowledging alert:', error);
          this.snackBar.open('Error acknowledging alert', 'Close', { duration: 3000 });
        }
      });
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'staff_shortage': return 'people_outline';
      case 'leave_approval': return 'pending_actions';
      case 'document_expiry': return 'description';
      case 'attendance_issue': return 'schedule';
      default: return 'info';
    }
  }

  getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      case 'low': return '';
      default: return '';
    }
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  navigateToSection(section: string): void {
    // Navigation logic will be implemented based on routing structure
    console.log('Navigate to:', section);
  }
}