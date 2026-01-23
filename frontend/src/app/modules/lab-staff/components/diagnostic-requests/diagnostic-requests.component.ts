import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LabStaffService, DiagnosticRequest } from '../../services/lab-staff.service';
import { PatientVerifyDialogComponent } from '../../dialogs/patient-verify-dialog/patient-verify-dialog.component';

@Component({
  selector: 'app-diagnostic-requests',
  templateUrl: './diagnostic-requests.component.html',
  styleUrls: ['./diagnostic-requests.component.scss']
})
export class DiagnosticRequestsComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  // Table configuration
  displayedColumns: string[] = [
    'requestId',
    'patientName',
    'testType',
    'priority',
    'status',
    'doctorName',
    'requestedAt',
    'actions'
  ];

  dataSource = new MatTableDataSource<DiagnosticRequest>();
  loading = true;
  totalRequests = 0;

  // Filters
  statusFilter = 'all';
  priorityFilter = 'all';
  testTypeFilter = 'all';
  dateFilter = 'today';

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'received', label: 'Received' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'on_hold', label: 'On Hold' }
  ];

  priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'routine', label: 'Routine' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'emergency', label: 'Emergency' }
  ];

  testTypeOptions = [
    { value: 'all', label: 'All Tests' },
    { value: 'xray', label: 'X-Ray' },
    { value: 'cbct', label: 'CBCT' },
    { value: 'mri', label: 'MRI' },
    { value: 'ct_scan', label: 'CT Scan' },
    { value: 'ultrasound', label: 'Ultrasound' },
    { value: 'blood_test', label: 'Blood Test' },
    { value: 'urine_test', label: 'Urine Test' },
    { value: 'biopsy', label: 'Biopsy' }
  ];

  dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' }
  ];

  constructor(
    private labStaffService: LabStaffService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRequests();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadRequests(): void {
    this.loading = true;

    const filters = this.buildFilters();

    this.labStaffService.getDiagnosticRequests(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.dataSource.data = requests;
          this.totalRequests = requests.length;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading diagnostic requests:', error);
          this.snackBar.open('Error loading requests', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private buildFilters(): any {
    const filters: any = {};

    if (this.statusFilter !== 'all') {
      filters.status = this.statusFilter;
    }

    if (this.priorityFilter !== 'all') {
      filters.priority = this.priorityFilter;
    }

    if (this.testTypeFilter !== 'all') {
      filters.testType = this.testTypeFilter;
    }

    if (this.dateFilter !== 'all') {
      const today = new Date();
      switch (this.dateFilter) {
        case 'today':
          filters.dateFrom = today.toISOString().split('T')[0];
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filters.dateFrom = weekAgo.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          filters.dateFrom = monthAgo.toISOString().split('T')[0];
          break;
      }
    }

    return filters;
  }

  private setupRealTimeUpdates(): void {
    // Refresh data every 30 seconds
    setInterval(() => {
      this.loadRequests();
    }, 30000);
  }

  onFilterChange(): void {
    this.loadRequests();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilters(): void {
    this.statusFilter = 'all';
    this.priorityFilter = 'all';
    this.testTypeFilter = 'all';
    this.dateFilter = 'today';
    this.loadRequests();
  }

  // Request Actions
  assignToSelf(request: DiagnosticRequest): void {
    this.labStaffService.assignRequestToSelf(request.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.snackBar.open('Request assigned to you', 'Close', { duration: 3000 });
          this.loadRequests();
        },
        error: (error) => {
          console.error('Error assigning request:', error);
          this.snackBar.open('Error assigning request', 'Close', { duration: 3000 });
        }
      });
  }

  updateStatus(request: DiagnosticRequest, newStatus: string): void {
    this.labStaffService.updateRequestStatus(request.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.snackBar.open(`Status updated to ${newStatus}`, 'Close', { duration: 3000 });
          this.loadRequests();
        },
        error: (error) => {
          console.error('Error updating status:', error);
          this.snackBar.open('Error updating status', 'Close', { duration: 3000 });
        }
      });
  }

  verifyPatient(request: DiagnosticRequest): void {
    const dialogRef = this.dialog.open(PatientVerifyDialogComponent, {
      width: '600px',
      data: {
        patientId: request.patientId,
        patientName: request.patientName,
        appointmentId: request.appointmentId,
        requestId: request.id
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.verified) {
        this.snackBar.open('Patient verified successfully', 'Close', { duration: 3000 });
        // Automatically update status to in_progress after verification
        this.updateStatus(request, 'in_progress');
      }
    });
  }

  viewRequestDetails(request: DiagnosticRequest): void {
    // Navigate to detailed view or open dialog
    console.log('View details for request:', request);
  }

  // Utility methods
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'emergency': return 'warn';
      case 'urgent': return 'accent';
      case 'routine': return 'primary';
      default: return '';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'received': return 'accent';
      case 'cancelled': return 'warn';
      case 'on_hold': return 'warn';
      default: return '';
    }
  }

  getTestTypeIcon(testType: string): string {
    switch (testType) {
      case 'xray': return 'medical_services';
      case 'cbct': return 'scanner';
      case 'mri': return 'mri';
      case 'ct_scan': return 'scanner';
      case 'ultrasound': return 'waves';
      case 'blood_test': return 'bloodtype';
      case 'urine_test': return 'science';
      case 'biopsy': return 'biotech';
      default: return 'medical_services';
    }
  }

  canAssign(request: DiagnosticRequest): boolean {
    return request.status === 'received' && !request.assignedTo;
  }

  canUpdateStatus(request: DiagnosticRequest): boolean {
    return request.status !== 'completed' && request.status !== 'cancelled';
  }

  getAvailableStatuses(currentStatus: string): string[] {
    switch (currentStatus) {
      case 'received':
        return ['in_progress', 'on_hold'];
      case 'in_progress':
        return ['completed', 'on_hold'];
      case 'on_hold':
        return ['in_progress', 'cancelled'];
      default:
        return [];
    }
  }
}