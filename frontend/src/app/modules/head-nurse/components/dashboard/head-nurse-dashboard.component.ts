import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { HeadNurseService } from '../../services/head-nurse.service';

interface DashboardMetrics {
  totalPatientsInQueue: number;
  activeDoctors: number;
  nursesOnDuty: number;
  criticalAlerts: number;
  patientBacklog: number;
  staffShortage: boolean;
  delayedProcedures: number;
}

interface Alert {
  id: string;
  type: 'patient_backlog' | 'staff_shortage' | 'delayed_procedure' | 'equipment_issue' | 'compliance_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

@Component({
  selector: 'app-head-nurse-dashboard',
  templateUrl: './head-nurse-dashboard.component.html',
  styleUrls: ['./head-nurse-dashboard.component.scss']
})
export class HeadNurseDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboardMetrics: DashboardMetrics = {
    totalPatientsInQueue: 0,
    activeDoctors: 0,
    nursesOnDuty: 0,
    criticalAlerts: 0,
    patientBacklog: 0,
    staffShortage: false,
    delayedProcedures: 0
  };

  alerts: Alert[] = [];
  recentActivities: any[] = [];
  nursingStaffSummary: any[] = [];
  patientFlowSummary: any[] = [];
  
  currentTime = new Date();
  shiftSummary = {
    startTime: '08:00',
    endTime: '20:00',
    totalPatients: 0,
    completedProcedures: 0,
    avgTurnaroundTime: '25 min'
  };

  constructor(private headNurseService: HeadNurseService) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupRealTimeUpdates();
    this.startTimeUpdater();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.headNurseService.getDashboardOverview()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.dashboardMetrics = data.metrics;
        this.alerts = data.alerts;
        this.recentActivities = data.recentActivities;
        this.shiftSummary = data.shiftSummary;
      });
  }

  private setupRealTimeUpdates(): void {
    // Subscribe to real-time nursing staff updates
    this.headNurseService.nursingStaff$
      .pipe(takeUntil(this.destroy$))
      .subscribe(staff => {
        this.nursingStaffSummary = staff.slice(0, 5); // Show top 5
        this.dashboardMetrics.nursesOnDuty = staff.filter(s => s.status === 'on_duty').length;
      });

    // Subscribe to real-time patient flow updates
    this.headNurseService.patientFlow$
      .pipe(takeUntil(this.destroy$))
      .subscribe(flow => {
        this.patientFlowSummary = flow.slice(0, 5); // Show top 5
        this.dashboardMetrics.totalPatientsInQueue = flow.filter(p => p.status === 'waiting').length;
        this.dashboardMetrics.patientBacklog = flow.filter(p => p.priority === 'urgent').length;
      });
  }

  private startTimeUpdater(): void {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  dismissAlert(alertId: string): void {
    this.alerts = this.alerts.filter(a => a.id !== alertId);
  }

  getAlertIcon(type: string): string {
    const icons = {
      'patient_backlog': 'people',
      'staff_shortage': 'person_off',
      'delayed_procedure': 'schedule',
      'equipment_issue': 'build',
      'compliance_violation': 'warning'
    };
    return icons[type] || 'info';
  }

  getAlertColor(severity: string): string {
    const colors = {
      'low': 'primary',
      'medium': 'accent',
      'high': 'warn',
      'critical': 'warn'
    };
    return colors[severity] || 'primary';
  }

  getStatusChipColor(status: string): string {
    const colors = {
      'on_duty': 'primary',
      'assigned': 'accent',
      'break': 'warn',
      'off_duty': 'basic',
      'waiting': 'basic',
      'in_preparation': 'accent',
      'in_consultation': 'primary',
      'completed': 'primary'
    };
    return colors[status] || 'basic';
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }
}