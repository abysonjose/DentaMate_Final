import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { HeadNurseService, PatientFlowStatus } from '../../services/head-nurse.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-patient-flow-monitoring',
  templateUrl: './patient-flow-monitoring.component.html',
  styleUrls: ['./patient-flow-monitoring.component.scss']
})
export class PatientFlowMonitoringComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  patientFlow: PatientFlowStatus[] = [];
  filteredPatients: PatientFlowStatus[] = [];
  
  displayedColumns: string[] = ['tokenNumber', 'patientName', 'status', 'priority', 'doctorAssigned', 'nurseAssigned', 'roomNumber', 'estimatedTime', 'actions'];
  
  filterOptions = {
    status: 'all',
    priority: 'all',
    searchTerm: ''
  };

  statusOptions = [
    { value: 'all', label: 'All Status', count: 0 },
    { value: 'waiting', label: 'Waiting', count: 0 },
    { value: 'in_preparation', label: 'In Preparation', count: 0 },
    { value: 'in_consultation', label: 'In Consultation', count: 0 },
    { value: 'completed', label: 'Completed', count: 0 }
  ];

  priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'normal', label: 'Normal' }
  ];

  flowMetrics = {
    totalPatients: 0,
    waitingPatients: 0,
    inPreparation: 0,
    inConsultation: 0,
    avgWaitTime: '0 min',
    bottlenecks: []
  };

  constructor(
    private headNurseService: HeadNurseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPatientFlow();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatientFlow(): void {
    this.headNurseService.getPatientFlow()
      .pipe(takeUntil(this.destroy$))
      .subscribe(flow => {
        this.patientFlow = flow;
        this.updateMetrics();
        this.applyFilters();
      });
  }

  private setupRealTimeUpdates(): void {
    this.headNurseService.patientFlow$
      .pipe(takeUntil(this.destroy$))
      .subscribe(flow => {
        this.patientFlow = flow;
        this.updateMetrics();
        this.applyFilters();
      });
  }

  private updateMetrics(): void {
    this.flowMetrics.totalPatients = this.patientFlow.length;
    this.flowMetrics.waitingPatients = this.patientFlow.filter(p => p.status === 'waiting').length;
    this.flowMetrics.inPreparation = this.patientFlow.filter(p => p.status === 'in_preparation').length;
    this.flowMetrics.inConsultation = this.patientFlow.filter(p => p.status === 'in_consultation').length;

    // Update status counts
    this.statusOptions.forEach(option => {
      if (option.value === 'all') {
        option.count = this.patientFlow.length;
      } else {
        option.count = this.patientFlow.filter(p => p.status === option.value).length;
      }
    });

    // Identify bottlenecks
    this.identifyBottlenecks();
  }

  private identifyBottlenecks(): void {
    this.flowMetrics.bottlenecks = [];
    
    if (this.flowMetrics.waitingPatients > 10) {
      this.flowMetrics.bottlenecks.push('High patient backlog in waiting area');
    }
    
    if (this.flowMetrics.inPreparation > 5) {
      this.flowMetrics.bottlenecks.push('Preparation delays detected');
    }

    const urgentWaiting = this.patientFlow.filter(p => p.status === 'waiting' && p.priority === 'urgent').length;
    if (urgentWaiting > 3) {
      this.flowMetrics.bottlenecks.push('Multiple urgent patients waiting');
    }
  }

  applyFilters(): void {
    this.filteredPatients = this.patientFlow.filter(patient => {
      const matchesStatus = this.filterOptions.status === 'all' || patient.status === this.filterOptions.status;
      const matchesPriority = this.filterOptions.priority === 'all' || patient.priority === this.filterOptions.priority;
      const matchesSearch = !this.filterOptions.searchTerm || 
        patient.patientName.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase()) ||
        patient.tokenNumber.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase());
      
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }

  updatePreparationStatus(patient: PatientFlowStatus, status: string): void {
    this.headNurseService.updatePatientPreparationStatus(patient.id, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Patient status updated successfully', 'Close', { duration: 3000 });
          this.loadPatientFlow();
        },
        error: (error) => {
          this.snackBar.open('Failed to update patient status', 'Close', { duration: 3000 });
        }
      });
  }

  getStatusColor(status: string): string {
    const colors = {
      'waiting': 'basic',
      'in_preparation': 'accent',
      'in_consultation': 'primary',
      'completed': 'primary'
    };
    return colors[status] || 'basic';
  }

  getPriorityColor(priority: string): string {
    const colors = {
      'normal': 'basic',
      'urgent': 'accent',
      'emergency': 'warn'
    };
    return colors[priority] || 'basic';
  }

  canUpdatePreparation(patient: PatientFlowStatus): boolean {
    return patient.status === 'waiting' || patient.status === 'in_preparation';
  }

  getEstimatedWaitTime(patient: PatientFlowStatus): string {
    // Calculate based on position in queue and average consultation time
    const position = this.patientFlow
      .filter(p => p.status === 'waiting')
      .findIndex(p => p.id === patient.id) + 1;
    
    const avgConsultationTime = 25; // minutes
    const estimatedMinutes = position * avgConsultationTime;
    
    if (estimatedMinutes < 60) {
      return `${estimatedMinutes} min`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }

  refreshData(): void {
    this.loadPatientFlow();
  }
}