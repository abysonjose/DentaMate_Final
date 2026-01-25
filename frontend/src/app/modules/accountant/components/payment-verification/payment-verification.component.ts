import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AccountantService, PaymentRecord } from '../../services/accountant.service';
import { ReconciliationDialogComponent } from '../../dialogs/reconciliation-dialog/reconciliation-dialog.component';

@Component({
  selector: 'app-payment-verification',
  templateUrl: './payment-verification.component.html',
  styleUrls: ['./payment-verification.component.scss']
})
export class PaymentVerificationComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'paymentDate',
    'patientName',
    'amount',
    'paymentMode',
    'transactionId',
    'reconciliationStatus',
    'actions'
  ];

  dataSource = new MatTableDataSource<PaymentRecord>();
  loading = true;
  filterForm: FormGroup;

  paymentModeOptions = [
    { value: '', label: 'All Payment Modes' },
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CARD', label: 'Card' },
    { value: 'WALLET', label: 'Wallet' }
  ];

  reconciliationStatusOptions = [
    { value: '', label: 'All Status' },
    { value: 'MATCHED', label: 'Matched' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'FLAGGED', label: 'Flagged' }
  ];

  constructor(
    private accountantService: AccountantService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      paymentMode: [''],
      reconciliationStatus: [''],
      patientName: ['']
    });
  }

  ngOnInit(): void {
    this.loadPaymentRecords();
    this.setupFilterSubscription();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadPaymentRecords(): void {
    this.loading = true;
    const filters = this.filterForm.value;
    
    this.accountantService.getPaymentRecords(filters).subscribe({
      next: (records) => {
        this.dataSource.data = records;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading payment records:', error);
        this.snackBar.open('Error loading payment records', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  setupFilterSubscription(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadPaymentRecords();
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadPaymentRecords();
  }

  openReconciliationDialog(record: PaymentRecord): void {
    const dialogRef = this.dialog.open(ReconciliationDialogComponent, {
      width: '600px',
      data: { record }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateReconciliationStatus(record.id, result.status, result.notes);
      }
    });
  }

  updateReconciliationStatus(paymentId: string, status: string, notes?: string): void {
    this.accountantService.updateReconciliationStatus(paymentId, status, notes).subscribe({
      next: () => {
        this.snackBar.open('Reconciliation status updated successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadPaymentRecords();
      },
      error: (error) => {
        console.error('Error updating reconciliation status:', error);
        this.snackBar.open('Error updating reconciliation status', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  quickReconcile(record: PaymentRecord, status: string): void {
    this.updateReconciliationStatus(record.id, status);
  }

  viewPaymentDetails(record: PaymentRecord): void {
    // Open payment details dialog
    console.log('View payment details:', record);
  }

  exportRecords(): void {
    const filters = this.filterForm.value;
    this.accountantService.exportReport('payment-records', 'CSV', filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payment-records-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting records:', error);
        this.snackBar.open('Error exporting records', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'MATCHED': return 'success';
      case 'PENDING': return 'warning';
      case 'FLAGGED': return 'danger';
      default: return 'default';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'MATCHED': return 'check_circle';
      case 'PENDING': return 'schedule';
      case 'FLAGGED': return 'flag';
      default: return 'help';
    }
  }

  getPaymentModeIcon(mode: string): string {
    switch (mode) {
      case 'CASH': return 'money';
      case 'UPI': return 'qr_code';
      case 'CARD': return 'credit_card';
      case 'WALLET': return 'account_balance_wallet';
      default: return 'payment';
    }
  }

  getPendingCount(): number {
    return this.dataSource.data.filter(record => record.reconciliationStatus === 'PENDING').length;
  }

  getFlaggedCount(): number {
    return this.dataSource.data.filter(record => record.reconciliationStatus === 'FLAGGED').length;
  }

  getMatchedCount(): number {
    return this.dataSource.data.filter(record => record.reconciliationStatus === 'MATCHED').length;
  }
}