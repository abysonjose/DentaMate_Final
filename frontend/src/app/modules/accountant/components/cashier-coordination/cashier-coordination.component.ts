import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { 
  AccountantCashierIntegrationService, 
  CashierPaymentData, 
  CashHandoverData,
  ReconciliationRequest 
} from '../../../shared/services/accountant-cashier-integration.service';

@Component({
  selector: 'app-cashier-coordination',
  templateUrl: './cashier-coordination.component.html',
  styleUrls: ['./cashier-coordination.component.scss']
})
export class CashierCoordinationComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Payment reconciliation
  paymentColumns: string[] = [
    'paymentDate',
    'receiptNumber',
    'patientName',
    'amount',
    'paymentMode',
    'cashierName',
    'status',
    'actions'
  ];
  paymentDataSource = new MatTableDataSource<CashierPaymentData>();

  // Cash handover tracking
  handoverColumns: string[] = [
    'shiftDate',
    'cashierName',
    'totalCash',
    'totalTransactions',
    'handoverStatus',
    'actions'
  ];
  handoverDataSource = new MatTableDataSource<CashHandoverData>();

  loading = true;
  filterForm: FormGroup;
  selectedTab = 0;

  // Summary data
  dailySummary = {
    totalCashReceived: 0,
    totalTransactions: 0,
    pendingReconciliations: 0,
    verifiedHandovers: 0,
    discrepancies: 0
  };

  constructor(
    private integrationService: AccountantCashierIntegrationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      date: [new Date()],
      cashierId: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.setupRealTimeUpdates();
  }

  ngAfterViewInit(): void {
    this.paymentDataSource.paginator = this.paginator;
    this.paymentDataSource.sort = this.sort;
  }

  loadData(): void {
    this.loading = true;
    
    // Load pending payments
    this.integrationService.getPendingCashierPayments().subscribe({
      next: (payments) => {
        this.paymentDataSource.data = payments;
        this.updateSummary();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading cashier payments:', error);
        this.snackBar.open('Error loading cashier data', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });

    // Load cash handovers
    const selectedDate = this.filterForm.get('date')?.value;
    this.integrationService.getCashHandovers(selectedDate).subscribe({
      next: (handovers) => {
        this.handoverDataSource.data = handovers;
      },
      error: (error) => {
        console.error('Error loading cash handovers:', error);
      }
    });

    // Load daily summary
    this.integrationService.getDailyCashSummary(selectedDate).subscribe({
      next: (summary) => {
        this.dailySummary = summary;
      },
      error: (error) => {
        console.error('Error loading daily summary:', error);
      }
    });
  }

  setupRealTimeUpdates(): void {
    // Subscribe to real-time updates
    this.integrationService.pendingReconciliations$.subscribe(payments => {
      this.paymentDataSource.data = payments;
      this.updateSummary();
    });

    this.integrationService.cashHandovers$.subscribe(handovers => {
      this.handoverDataSource.data = handovers;
    });
  }

  reconcilePayment(payment: CashierPaymentData): void {
    const request: ReconciliationRequest = {
      paymentId: payment.id,
      billId: payment.billId,
      expectedAmount: payment.amount,
      actualAmount: payment.amount,
      accountantNotes: 'Verified and reconciled'
    };

    this.integrationService.reconcileCashierPayment(request).subscribe({
      next: () => {
        this.snackBar.open('Payment reconciled successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadData();
      },
      error: (error) => {
        console.error('Error reconciling payment:', error);
        this.snackBar.open('Error reconciling payment', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  flagDiscrepancy(payment: CashierPaymentData): void {
    const discrepancy = prompt('Enter discrepancy description:');
    if (discrepancy) {
      this.integrationService.flagCashierDiscrepancy(payment.id, discrepancy).subscribe({
        next: () => {
          this.snackBar.open('Discrepancy flagged successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (error) => {
          console.error('Error flagging discrepancy:', error);
          this.snackBar.open('Error flagging discrepancy', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  verifyCashHandover(handover: CashHandoverData): void {
    const verification = {
      verifiedBy: 'current-accountant-id', // Get from auth service
      verificationDate: new Date(),
      notes: 'Cash handover verified and accepted'
    };

    this.integrationService.verifyCashHandover(handover.cashierId, verification).subscribe({
      next: () => {
        this.snackBar.open('Cash handover verified successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadData();
      },
      error: (error) => {
        console.error('Error verifying handover:', error);
        this.snackBar.open('Error verifying handover', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  viewPaymentDetails(payment: CashierPaymentData): void {
    this.integrationService.requestPaymentDetails(payment.id).subscribe({
      next: (details) => {
        // Open dialog with payment details
        console.log('Payment details:', details);
      },
      error: (error) => {
        console.error('Error loading payment details:', error);
      }
    });
  }

  sendFeedbackToCashier(cashierId: string): void {
    const feedback = {
      message: 'Please ensure all payment receipts are properly documented',
      priority: 'MEDIUM',
      sentBy: 'current-accountant-id'
    };

    this.integrationService.sendReconciliationFeedback(cashierId, feedback).subscribe({
      next: () => {
        this.snackBar.open('Feedback sent to cashier', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('Error sending feedback:', error);
        this.snackBar.open('Error sending feedback', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onDateChange(): void {
    this.loadData();
  }

  private updateSummary(): void {
    const payments = this.paymentDataSource.data;
    this.dailySummary.totalTransactions = payments.length;
    this.dailySummary.totalCashReceived = payments
      .filter(p => p.paymentMode === 'CASH')
      .reduce((sum, p) => sum + p.amount, 0);
    this.dailySummary.pendingReconciliations = payments
      .filter(p => p.status === 'PENDING').length;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'danger';
      case 'VERIFIED': return 'success';
      case 'DISCREPANCY': return 'danger';
      default: return 'default';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'check_circle';
      case 'PENDING': return 'schedule';
      case 'FAILED': return 'error';
      case 'VERIFIED': return 'verified';
      case 'DISCREPANCY': return 'warning';
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
}