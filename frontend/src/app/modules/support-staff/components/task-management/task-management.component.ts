import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { SupportStaffService, Task } from '../../services/support-staff.service';
import { TaskDetailsDialogComponent } from '../../dialogs/task-details-dialog/task-details-dialog.component';

@Component({
  selector: 'app-task-management',
  templateUrl: './task-management.component.html',
  styleUrls: ['./task-management.component.scss']
})
export class TaskManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  
  // Filter options
  selectedStatus: string = 'ALL';
  selectedPriority: string = 'ALL';
  selectedType: string = 'ALL';
  searchTerm: string = '';

  statusOptions = [
    { value: 'ALL', label: 'All Status' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' }
  ];

  priorityOptions = [
    { value: 'ALL', label: 'All Priorities' },
    { value: 'URGENT', label: 'Urgent' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' }
  ];

  typeOptions = [
    { value: 'ALL', label: 'All Types' },
    { value: 'CLEANING', label: 'Cleaning' },
    { value: 'ASSISTANCE', label: 'Assistance' },
    { value: 'SECURITY', label: 'Security' },
    { value: 'MAINTENANCE', label: 'Maintenance' }
  ];

  // Statistics
  taskStats = {
    total: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0
  };

  constructor(
    private supportStaffService: SupportStaffService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTasks(): void {
    this.supportStaffService.getTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.tasks = tasks;
        this.applyFilters();
        this.calculateStats();
      });
  }

  applyFilters(): void {
    this.filteredTasks = this.tasks.filter(task => {
      const statusMatch = this.selectedStatus === 'ALL' || task.status === this.selectedStatus;
      const priorityMatch = this.selectedPriority === 'ALL' || task.priority === this.selectedPriority;
      const typeMatch = this.selectedType === 'ALL' || task.type === this.selectedType;
      const searchMatch = this.searchTerm === '' || 
        task.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        task.location.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(this.searchTerm.toLowerCase());

      return statusMatch && priorityMatch && typeMatch && searchMatch;
    });
  }

  private calculateStats(): void {
    this.taskStats.total = this.tasks.length;
    this.taskStats.assigned = this.tasks.filter(t => t.status === 'ASSIGNED').length;
    this.taskStats.inProgress = this.tasks.filter(t => t.status === 'IN_PROGRESS').length;
    this.taskStats.completed = this.tasks.filter(t => t.status === 'COMPLETED').length;
    this.taskStats.urgent = this.tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedStatus = 'ALL';
    this.selectedPriority = 'ALL';
    this.selectedType = 'ALL';
    this.searchTerm = '';
    this.applyFilters();
  }

  openTaskDetails(task: Task): void {
    const dialogRef = this.dialog.open(TaskDetailsDialogComponent, {
      width: '500px',
      data: { task }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTasks();
      }
    });
  }

  startTask(task: Task): void {
    this.supportStaffService.updateTaskStatus(task.id, 'IN_PROGRESS')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Task started successfully', 'Close', { duration: 3000 });
          this.loadTasks();
        },
        error: (error) => {
          this.snackBar.open('Failed to start task', 'Close', { duration: 3000 });
        }
      });
  }

  completeTask(task: Task): void {
    this.supportStaffService.completeTask(task.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Task completed successfully', 'Close', { duration: 3000 });
          this.loadTasks();
        },
        error: (error) => {
          this.snackBar.open('Failed to complete task', 'Close', { duration: 3000 });
        }
      });
  }

  getTaskPriorityColor(priority: string): string {
    switch (priority) {
      case 'URGENT': return 'warn';
      case 'HIGH': return 'accent';
      case 'MEDIUM': return 'primary';
      default: return '';
    }
  }

  getTaskStatusIcon(status: string): string {
    switch (status) {
      case 'ASSIGNED': return 'assignment';
      case 'IN_PROGRESS': return 'hourglass_empty';
      case 'COMPLETED': return 'check_circle';
      default: return 'help';
    }
  }

  getTaskTypeIcon(type: string): string {
    switch (type) {
      case 'CLEANING': return 'cleaning_services';
      case 'ASSISTANCE': return 'accessible';
      case 'SECURITY': return 'security';
      case 'MAINTENANCE': return 'build';
      default: return 'assignment';
    }
  }

  getTaskStatusColor(status: string): string {
    switch (status) {
      case 'ASSIGNED': return 'primary';
      case 'IN_PROGRESS': return 'accent';
      case 'COMPLETED': return 'primary';
      default: return '';
    }
  }

  canStartTask(task: Task): boolean {
    return task.status === 'ASSIGNED';
  }

  canCompleteTask(task: Task): boolean {
    return task.status === 'IN_PROGRESS';
  }

  getElapsedTime(task: Task): string {
    if (task.status !== 'IN_PROGRESS') return '';
    
    const now = new Date();
    const assignedAt = new Date(task.assignedAt);
    const elapsed = now.getTime() - assignedAt.getTime();
    
    const minutes = Math.floor(elapsed / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  sortTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      // Sort by priority first (URGENT > HIGH > MEDIUM > LOW)
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by status (ASSIGNED > IN_PROGRESS > COMPLETED)
      const statusOrder = { 'ASSIGNED': 3, 'IN_PROGRESS': 2, 'COMPLETED': 1 };
      const statusDiff = statusOrder[b.status] - statusOrder[a.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Finally by assigned time (newest first)
      return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
    });
  }
}