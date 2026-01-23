import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LabStaffService, DiagnosticRequest } from '../../services/lab-staff.service';
import { PatientVerifyDialogComponent } from '../../dialogs/patient-verify-dialog/patient-verify-dialog.component';

@Component({
  selector: 'app-diagnostic-requests',
  templateUrl: './diagnostic-requests.component.html',
  styleUrls: ['./diagnostic-requests.component.scss']
})
export class DiagnosticRequestsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Table configuration
  displayedColumns: string[] = [
    'requestId',
    'patientName',
    'testType',
    'priority',
    'status',
    'requestedAt',
    'doctorName',
    'actions'
  ];
  
  dataSource = new MatTableDataSource<DiagnosticRequest>();
  
  // Filters
  statusFilter = '';
  priorityFilter = '';
  testTypeFilter = '';
  searchTerm = '';
  
  // Filter options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'received', label: 'Received' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'routine', label: 'Routine' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'emergency', label: 'Emergency' }
  ];
  
  testTypeOptions = [
    { value: '', label: 'All Test Types' },
    { value: 'xray', label: 'X-Ray' },
    { value: 'cbct', label: 'CBCT' },
    { value: 'mri', label: 'MRI' },
    { value: 'ct_scan', label: 'CT Scan' },
    { value: 'ultrasound', label: 'Ultrasound' },
    { value: 'blood_test', label: 'Blood Test' },
    { value: 'urine_test', label: 'Urine Test' },
    { value: 'biopsy', label: 'Biopsy' }
  ];

  // UI state
  isLoading = false;
  selectedRequests: DiagnosticRequest[] = [];

  constructor(
    private labStaffService: LabStaffService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRequests();
    this.setupTableFiltering();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRequests(): void {
    this.isLoading = true;
    
    const filters = {
      status: this.statusFilter,
      priority: this.priorityFilter,
      testType: this.testTypeFilter,
      search: this.searchTerm
    };

    this.labStaffService.getDiagnosticRequests(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.dataSource.data = requests;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading requests:', error);
          this.snackBar.open('Error loading diagnostic requests', 'Close', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
  }

  private setupTableFiltering(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Custom filter predicate
    this.dataSource.filterPredicate = (data: DiagnosticRequest, filter: string) => {
      const searchStr = (
        data.requestId +
        data.patientName +
        data.testType +
        data.doctorName +
        data.priority +
        data.status
      ).toLowerCase();
      
      return searchStr.includes(filter.toLowerCase());
    };
  }

  // Event handlers
  onFilterChange(): void {
    this.loadRequests();
  }

  onSearchChange(): void {
    this.dataSource.filter = this.searchTerm.trim();
  }

  onClearFilters(): void {
    this.statusFilter = '';
    this.priorityFilter = '';
    this.testTypeFilter = '';
    this.searchTerm = '';
    this.dataSource.filter = '';
    this.loadRequests();
  }

  onStartProcessing(request: DiagnosticRequest): void {
    // First verify patient
    const dialogRef = this.dialog.open(PatientVerifyDialogComponent, {
      width: '500px',
      data: {
        patientId: request.patientId,
        patientName: request.patientName,
        requestId: request.requestId,
        appointmentId: request.appointmentId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.verified) {
        this.updateRequestStatus(request.id, 'in_progress', 'Processing started after patient verification');
        
        // Notify doctor about status update
        this.labStaffService.notifyDoctorStatusUpdate(
          request.id, 
          'in_progress', 
          'Lab processing has started for your patient'
        ).subscribe();
      }
    });
  }

  onCompleteRequest(request: DiagnosticRequest): void {
    this.updateRequestStatus(request.id, 'completed', 'Request completed');
    
    // Notify doctor that results are ready
    this.labStaffService.notifyDoctorResultsReady(
      request.id,
      { status: 'completed', message: 'Lab results are now available' }
    ).subscribe();
  }

  onSendMessageToDoctor(request: DiagnosticRequest): void {
    const message = prompt('Send message to doctor:');
    if (message) {
      this.labStaffService.sendMessageToDoctor(
        request.doctorId,
        request.id,
        message,
        'medium'
      ).subscribe({
        next: () => {
          this.snackBar.open('Message sent to doctor', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.snackBar.open('Error sending message', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  onRequestClarification(request: DiagnosticRequest): void {
    const question = prompt('What clarification do you need from the doctor?');
    if (question) {
      this.labStaffService.requestDoctorClarification(
        request.id,
        question,
        'high'
      ).subscribe({
        next: () => {
          this.snackBar.open('Clarification request sent to doctor', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error requesting clarification:', error);
          this.snackBar.open('Error sending clarification request', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  onHoldRequest(request: DiagnosticRequest): void {
    // Could open a dialog to get hold reason
    this.updateRequestStatus(request.id, 'on_hold', 'Request put on hold');
  }

  onCancelRequest(request: DiagnosticRequest): void {
    if (confirm('Are you sure you want to cancel this request?')) {
      this.updateRequestStatus(request.id, 'cancelled', 'Request cancelled');
    }
  }

  onViewDetails(request: DiagnosticRequest): void {
    // Navigate to detailed view or open dialog
    console.log('View details for request:', request.id);
  }

  onBulkAction(action: string): void {
    if (this.selectedRequests.length === 0) {
      this.snackBar.open('Please select requests first', 'Close', {
        duration: 3000
      });
      return;
    }

    // Handle bulk actions
    console.log('Bulk action:', action, 'for requests:', this.selectedRequests);
  }

  private updateRequestStatus(requestId: string, status: string, notes?: string): void {
    this.labStaffService.updateRequestStatus(requestId, status, notes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          // Update the request in the table
          const index = this.dataSource.data.findIndex(r => r.id === requestId);
          if (index !== -1) {
            this.dataSource.data[index] = updatedRequest;
            this.dataSource._updateChangeSubscription();
          }
          
          this.snackBar.open(`Request status updated to ${status}`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error updating request status:', error);
          this.snackBar.open('Error updating request status', 'Close', {
            duration: 3000
          });
        }
      });
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
      case 'completed': return 'primary';
      case 'in_progress': return 'accent';
      case 'on_hold': return 'warn';
      case 'cancelled': return 'warn';
      case 'received': return '';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'received': return 'inbox';
      case 'in_progress': return 'hourglass_empty';
      case 'completed': return 'check_circle';
      case 'on_hold': return 'pause_circle';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }

  canStartProcessing(request: DiagnosticRequest): boolean {
    return request.status === 'received';
  }

  canComplete(request: DiagnosticRequest): boolean {
    return request.status === 'in_progress';
  }

  canHold(request: DiagnosticRequest): boolean {
    return request.status === 'received' || request.status === 'in_progress';
  }

  canCancel(request: DiagnosticRequest): boolean {
    return request.status !== 'completed' && request.status !== 'cancelled';
  }

  formatTestType(testType: string): string {
    return testType.replace('_', ' ').toUpperCase();
  }
}