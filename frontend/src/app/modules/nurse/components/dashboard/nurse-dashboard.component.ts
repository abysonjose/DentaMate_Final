import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NurseService } from '../../services/nurse.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.scss']
})
export class NurseDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: any;
  assignedPatients: any[] = [];
  pendingTasks: any[] = [];
  vitalsToRecord: any[] = [];
  isLoading = false;

  constructor(
    private nurseService: NurseService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadDashboardData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load assigned patients
    this.nurseService.getAssignedPatients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.assignedPatients = response.data || [];
        },
        error: (error) => {
          console.error('Error loading assigned patients:', error);
        }
      });

    // Load pending tasks
    this.nurseService.getPendingTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.pendingTasks = response.data || [];
        },
        error: (error) => {
          console.error('Error loading pending tasks:', error);
        }
      });

    // Load vitals to record
    this.nurseService.getVitalsToRecord()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.vitalsToRecord = response.data || [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading vitals to record:', error);
          this.isLoading = false;
        }
      });
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  getConditionColor(condition: string): string {
    switch (condition?.toLowerCase()) {
      case 'critical': return 'warn';
      case 'serious': return 'accent';
      case 'stable': return 'primary';
      default: return '';
    }
  }

  getTaskPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'warn';
      case 'high': return 'accent';
      default: return 'primary';
    }
  }

  getTaskIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'medication': return 'medication';
      case 'vitals': return 'favorite';
      case 'assessment': return 'assignment';
      case 'procedure': return 'healing';
      default: return 'task_alt';
    }
  }

  completeTask(taskId: string): void {
    this.nurseService.completeTask(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadDashboardData(); // Refresh data
          }
        },
        error: (error) => {
          console.error('Error completing task:', error);
        }
      });
  }
}