import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { 
  CashierPaymentService, 
  PendingPayment 
} from '../../services/cashier-payment.service';
import { PaymentConfirmationDialogComponent } from '../../dialogs/payment-confirmation-dialog/payment-confirmation-dialog.component';

@Component({
  selector: 'app-accept-payment',
  templateUrl: './accept-payment.component.html',
  styleUrls: ['./accept-payment.component.scss']
})
export class AcceptPaymentComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'invoiceNumber',
    'patientName',
    'totalAmount',
    'paidAmount',
    'balanceAmount',
    'dueDate',
    'priority',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<PendingPayment>();
  isLoading = true;
  error: string | null = null;

  // Filters
  searchControl = new FormControl('');
  statusFilter = new FormControl('unpaid');
  priorityFilter = new FormControl('all');

  statusOptions = [
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partially Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'all', label: 'All Invoices' }
  ];

  priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'overdue', label: 'Overdue' }
  ];

  constructor(
    private paymentService: CashierPaymentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupFilters();
    this.loadPendingPayments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    // Search filter
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });

    // Status filter
    this.statusFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadPendingPayments();
      });

    // Priority filter
    this.priorityFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadPendingPayments();
      });
  }

  private loadPendingPayments(): void {
    this.isLoading = true;
    this.error = null;

    const filters: any = {};
    
    if (this.statusFilter.value && this.statusFilter.value !== 'all') {
      filters.status = this.statusFilter.value;
    }
    
    if (this.priorityFilter.value && this.priorityFilter.value !== 'all') {
      filters.priority = this.priorityFilter.value;
    }

    this.paymentService.getPendingPayments(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payments) => {
          this.dataSource.data = payments;
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading pending payments:', error);
          this.error = 'Failed to load pending payments. Please try again.';
          this.isLoading = false;
        }
      });
  }

  private applyFilters(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    
    this.dataSource.filterPredicate = (data: PendingPayment, filter: string) => {
      return data.patientName.toLowerCase().includes(filter) ||
             data.invoiceNumber.toLowerCase().includes(filter) ||
             data.patientPhone.toLowerCase().includes(filter);
    };
    
    this.dataSource.filter = searchTerm;
  }

  acceptPayment(payment: PendingPayment): void {
    const dialogRef = this.dialog.open(PaymentConfirmationDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { payment }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'paid') {
        this.snackBar.open('Payment processed successfully', 'Close', { duration: 3000 });
        this.loadPendingPayments();
      }
    });
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'overdue':
        return 'warn';
      case 'urgent':
        return 'accent';
      case 'normal':
      default:
        return 'primary';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'unpaid':
        return 'warn';
      case 'partial':
        return 'accent';
      case 'overdue':
        return 'warn';
      default:
        return 'primary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'unpaid':
        return 'Unpaid';
      case 'partial':
        return 'Partially Paid';
      case 'overdue':
        return 'Overdue';
      default:
        return status;
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'overdue':
        return 'Overdue';
      case 'urgent':
        return 'Urgent';
      case 'normal':
        return 'Normal';
      default:
        return priority;
    }
  }

  isOverdue(payment: PendingPayment): boolean {
    return payment.priority === 'overdue';
  }

  getDaysOverdueText(payment: PendingPayment): string {
    if (payment.daysPastDue > 0) {
      return `${payment.daysPastDue} days overdue`;
    } else if (payment.daysPastDue === 0) {
      return 'Due today';
    } else {
      return `Due in ${Math.abs(payment.daysPastDue)} days`;
    }
  }

  getServicesPreview(payment: PendingPayment): string {
    if (!payment.services || payment.services.length === 0) {
      return 'No services';
    }
    
    const serviceNames = payment.services.slice(0, 2).map(s => s.serviceName);
    if (payment.services.length > 2) {
      serviceNames.push(`+${payment.services.length - 2} more`);
    }
    return serviceNames.join(', ');
  }

  refreshPayments(): void {
    this.loadPendingPayments();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.statusFilter.setValue('unpaid');
    this.priorityFilter.setValue('all');
  }

  exportPayments(): void {
    // Implementation for exporting payments
    console.log('Export payments functionality');
  }
}