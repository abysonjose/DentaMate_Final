import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PayrollOfficerService, PayrollStats, PayrollCycle } from '../../services/payroll-officer.service';
import { MatDialog } from '@angular/material/dialog';
import { CreatePayrollCycleDialogComponent } from '../../dialogs/create-payroll-cycle-dialog/create-payroll-cycle-dialog.component';
import { ProcessPayrollDialogComponent } from '../../dialogs/process-payroll-dialog/process-payroll-dialog.component';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-payroll-overview',
  templateUrl: './payroll-overview.component.html',
  styleUrls: ['./payroll-overview.component.scss']
})
export class PayrollOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboardStats: PayrollStats | null = null;
  recentCycles: PayrollCycle[] = [];
  isLoading = true;
  
  // Chart configurations
  payrollTrendChartType: ChartType = 'line';
  payrollTrendChartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };
  
  departmentChartType: ChartType = 'doughnut';
  departmentChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: []
  };
  
  statusChartType: ChartType = 'bar';
  statusChartData: ChartData<'bar'> = {
    labels: ['Pending', 'Processing', 'Completed', 'Finalized'],
    datasets: []
  };

  constructor(
    private payrollService: PayrollOfficerService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadOverviewData();
    this.setupCharts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOverviewData(): void {
    this.isLoading = true;
    
    this.payrollService.dashboardStats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.dashboardStats = stats;
        this.isLoading = false;
      });
    
    this.payrollService.getPayrollCycles()
      .pipe(takeUntil(this.destroy$))
      .subscribe(cycles => {
        this.recentCycles = cycles.slice(0, 5);
        this.updateCharts();
      });
  }

  private setupCharts(): void {
    // Payroll Trend Chart
    this.payrollTrendChartData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Total Payroll',
          data: [450000, 465000, 470000, 485000, 490000, 495000],
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          tension: 0.4
        }
      ]
    };
    
    // Department Distribution Chart
    this.departmentChartData = {
      labels: ['Clinical', 'Administrative', 'Support', 'Management'],
      datasets: [
        {
          data: [60, 25, 10, 5],
          backgroundColor: ['#1976d2', '#388e3c', '#f57c00', '#d32f2f']
        }
      ]
    };
    
    // Status Chart
    this.statusChartData = {
      labels: ['Pending', 'Processing', 'Completed', 'Finalized'],
      datasets: [
        {
          label: 'Employee Count',
          data: [12, 5, 25, 158],
          backgroundColor: ['#ff9800', '#2196f3', '#4caf50', '#9c27b0']
        }
      ]
    };
  }

  private updateCharts(): void {
    // Update charts with real data when available
    if (this.recentCycles.length > 0) {
      // Update trend chart with recent cycle data
      const labels = this.recentCycles.map(cycle => `${cycle.month}/${cycle.year}`);
      const data = this.recentCycles.map(cycle => cycle.totalPayroll);
      
      this.payrollTrendChartData = {
        ...this.payrollTrendChartData,
        labels: labels.reverse(),
        datasets: [
          {
            ...this.payrollTrendChartData.datasets[0],
            data: data.reverse()
          }
        ]
      };
    }
  }

  createNewCycle(): void {
    const dialogRef = this.dialog.open(CreatePayrollCycleDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadOverviewData();
      }
    });
  }

  processCurrentCycle(): void {
    if (!this.dashboardStats?.currentCycleId) return;
    
    const dialogRef = this.dialog.open(ProcessPayrollDialogComponent, {
      width: '500px',
      data: { cycleId: this.dashboardStats.currentCycleId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadOverviewData();
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return 'accent';
      case 'processing': return 'primary';
      case 'completed': return 'primary';
      case 'finalized': return 'warn';
      default: return 'primary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'draft': return 'edit';
      case 'processing': return 'autorenew';
      case 'completed': return 'check_circle';
      case 'finalized': return 'lock';
      default: return 'help';
    }
  }

  refreshData(): void {
    this.payrollService.refreshDashboardStats();
    this.loadOverviewData();
  }
}