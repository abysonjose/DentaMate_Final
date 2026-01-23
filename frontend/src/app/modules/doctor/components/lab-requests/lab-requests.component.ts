import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DoctorLabService, LabRequest, LabResult } from '../../services/doctor-lab.service';
import { LabRequestDialogComponent } from '../../dialogs/lab-request-dialog/lab-request-dialog.component';

@Component({
  selector: 'app-lab-requests',
  templateUrl: './lab-requests.component.html',
  styleUrls: ['./lab-requests.component.scss']
})
export class LabRequestsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Table configuration
  displayedColumns: string[] = [
    'requestDate',
    'patientName',
    'tests',
    'priority',
    'status',
    'labName',
    'expectedCompletion',
    'actions'
  ];
  
  dataSource = new MatTableDataSource<LabRequest>();
  
  // Filters
  statusFilter = '';
  priorityFilter = '';
  dateFromFilter = '';
  dateToFilter = '';
  
  // Filter options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'requested', label: 'Requested' },
    { value: 'sample-collected', label: 'Sample Collected' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'routine', label: 'Routine' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'stat', label: 'STAT' }
  ];

  // UI state
  isLoading = false;
  selectedRequests: LabRequest[] = [];
  
  // Statistics
  stats = {
    totalRequests: 0,
    pendingResults: 0,
    criticalResults: 0,
    overdueRequests: 0
  };

  constructor(
    private labService: DoctorLabService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadLabRequests();
    this.loadStatistics();
    this.setupTableFiltering();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLabRequests(): void {
    this.isLoading = true;
    
    this.labService.getDoctorLabRequests(
      this.statusFilter || undefined,
      this.dateFromFilter || undefined,
      this.dateToFilter || undefined
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.dataSource.data = requests;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading lab requests:', error);
          this.snackBar.open('Error loading lab requests', 'Close', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
  }

  private loadStatistics(): void {
    // Load pending results
    this.labService.getPendingResults()
      .pipe(takeUntil(this.destroy$))
      .subscribe(pending => {
        this.stats.pendingResults = pending.length;
      });

    // Load critical results
    this.labService.getCriticalResults()
      .pipe(takeUntil(this.destroy$))
      .subscribe(critical => {
        this.stats.criticalResults = critical.length;
      });

    // Load overdue requests
    this.labService.getOverdueRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe(overdue => {
        this.stats.overdueRequests = overdue.length;
      });
  }

  private setupTableFiltering(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private setupRealTimeUpdates(): void {
    // Refresh data every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadLabRequests();
        this.loadStatistics();
      });
  }

  // Event handlers
  onFilterChange(): void {
    this.loadLabRequests();
  }

  onClearFilters(): void {
    this.statusFilter = '';
    this.priorityFilter = '';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.loadLabRequests();
  }

  onCreateLabRequest(): void {
    const dialogRef = this.dialog.open(LabRequestDialogComponent, {
      width: '800px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadLabRequests();
        this.snackBar.open('Lab request created successfully', 'Close', {
          duration: 3000
        });
      }
    });
  }

  onViewRequest(request: LabRequest): void {
    const dialogRef = this.dialog.open(LabRequestDialogComponent, {
      width: '800px',
      data: { mode: 'view', request }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.updated) {
        this.loadLabRequests();
      }
    });
  }

  onViewResults(request: LabRequest): void {
    this.labService.getLabResults(request.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          // Open results dialog
          console.log('Lab results:', results);
        },
        error: (error) => {
          console.error('Error loading results:', error);
          this.snackBar.open('Error loading lab results', 'Close', {
            duration: 3000
          });
        }
      });
  }

  onCancelRequest(request: LabRequest): void {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      this.labService.cancelLabRequest(request.id, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadLabRequests();
            this.snackBar.open('Lab request cancelled', 'Close', {
              duration: 3000
            });
          },
          error: (error) => {
            console.error('Error cancelling request:', error);
            this.snackBar.open('Error cancelling request', 'Close', {
              duration: 3000
            });
          }
        });
    }
  }

  onExportReport(request: LabRequest): void {
    this.labService.exportLabReport(request.id, 'pdf')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `lab-report-${request.id}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error exporting report:', error);
          this.snackBar.open('Error exporting report', 'Close', {
            duration: 3000
          });
        }
      });
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'primary';
      case 'in-progress': return 'accent';
      case 'sample-collected': return 'accent';
      case 'cancelled': return 'warn';
      case 'requested': return '';
      default: return '';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'stat': return 'warn';
      case 'urgent': return 'accent';
      case 'routine': return 'primary';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'requested': return 'schedule';
      case 'sample-collected': return 'science';
      case 'in-progress': return 'hourglass_empty';
      case 'completed': return 'check_circle';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }

  formatTestNames(tests: any[]): string {
    if (!tests || tests.length === 0) return 'No tests';
    if (tests.length === 1) return tests[0].testName;
    return `${tests[0].testName} +${tests.length - 1} more`;
  }

  isOverdue(request: LabRequest): boolean {
    if (!request.expectedCompletionDate || request.status === 'completed' || request.status === 'cancelled') {
      return false;
    }
    return new Date(request.expectedCompletionDate) < new Date();
  }

  canCancel(request: LabRequest): boolean {
    return request.status !== 'completed' && request.status !== 'cancelled';
  }

  hasResults(request: LabRequest): boolean {
    return request.status === 'completed';
  }
}