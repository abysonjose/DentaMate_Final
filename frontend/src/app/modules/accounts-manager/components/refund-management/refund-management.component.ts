import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountsManagerService, RefundData } from '../../services/accounts-manager.service';
import { RefundApprovalDialogComponent } from '../../dialogs/refund-approval-dialog/refund-approval-dialog.component';

@Component({
  selector: 'app-refund-management',
  templateUrl: './refund-management.component.html',
  styleUrls: ['./refund-management.component.scss']
})
export class RefundManagementComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();
  
  dataSource = new MatTableDataSource<RefundData>();
  displayedColumns: string[] = [
    'billId',
    'patientName',
    'originalAmount',
    'refundAmount',
    'reason',
    'requestedBy',
    'requestDate',
    'status',
    'actions'
  ];

  statusFilter = 'PENDING';
  isLoading = true;
  
  statusOptions = [
    { value: '', label: 'All Refunds' },
    { value: 'PENDING', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'PROCESSED', label: 'Processed' }
  ];

  refundStats = {
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalAmount: 0
  };

  constructor(
    private accountsManagerService: AccountsManagerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRefundRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadRefundRequests(): void {
    this.isLoading = true;
    
    this.accountsManagerService.getRefundRequests(this.statusFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (refunds) => {
          this.dataSource.data = refunds;
          this.calculateStats(refunds);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading refund requests:', error);
          this.snackBar.open('Error loading refund requests', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  private calculateStats(refunds: RefundData[]): void {
    this.refundStats = {
      totalPending: refunds.filter(r => r.status === 'PENDING').length,
      totalApproved: refunds.filter(r => r.status === 'APPROVED').length,
      totalRejected: refunds.filter(r => r.status === 'REJECTED').length,
      totalAmount: refunds.reduce((sum, r) => sum + r.refundAmount, 0)
    };
  }

  onStatusFilterChange(): void {
    this.loadRefundRequests();
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openRefundDialog(refund: RefundData, action: 'approve' | 'reject'): void {
    const dialogRef = this.dialog.open(RefundApprovalDialogComponent, {
      width: '600px',
      data: {
        refund: refund,
        action: action
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.processRefundAction(refund.id, action, result.notes || result.reason);
      }
    });
  }

  private processRefundAction(refundId: string, action: 'approve' | 'reject', notes: string): void {
    const actionObservable = action === 'approve' 
      ? this.accountsManagerService.approveRefund(refundId, notes)
      : this.accountsManagerService.rejectRefund(refundId, notes);

    actionObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const message = action === 'approve' ? 'Refund approved successfully' : 'Refund rejected successfully';
          this.snackBar.open(message, 'Close', { duration: 3000 });
          this.loadRefundRequests();
        },
        error: (error) => {
          console.error(`Error ${action}ing refund:`, error);
          this.snackBar.open(`Error ${action}ing refund`, 'Close', { duration: 3000 });
        }
      });
  }

  viewSupportingDocuments(refund: RefundData): void {
    // Implementation for viewing supporting documents
    console.log('Viewing documents for refund:', refund.id);
  }

  exportRefundReport(): void {
    // Implementation for exporting refund report
    this.snackBar.open('Exporting refund report...', 'Close', { duration: 2000 });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'warn';
      case 'APPROVED': return 'primary';
      case 'REJECTED': return 'accent';
      case 'PROCESSED': return 'primary';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING': return 'schedule';
      case 'APPROVED': return 'check_circle';
      case 'REJECTED': return 'cancel';
      case 'PROCESSED': return 'done_all';
      default: return 'help';
    }
  }

  canApprove(refund: RefundData): boolean {
    return refund.status === 'PENDING';
  }

  canReject(refund: RefundData): boolean {
    return refund.status === 'PENDING';
  }
}