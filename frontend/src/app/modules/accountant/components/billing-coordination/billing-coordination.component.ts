import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { 
  AccountantBillingIntegrationService, 
  BillingStaffData, 
  BillingValidationRequest,
  BillingAuditData 
} from '../../../shared/services/accountant-billing-integration.service';

@Component({
  selector: 'app-billing-coordination',
  templateUrl: './billing-coordination.component.html',
  styleUrls: ['./billing-coordination.component.scss']
})
export class BillingCoordinationComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Billing validation
  billingColumns: string[] = [
    'createdDate',
    'billId',
    'patientName',
    'doctorName',
    'services',
    'finalAmount',
    'billingStaffName',
    'status',
    'actions'
  ];
  billingDataSource = new MatTableDataSource<BillingStaffData>();

  // Audit tracking
  auditColumns: string[] = [
    'revisionDate',
    'billId',
    'originalAmount',
    'revisedAmount',
    'revisionReason',
    'status',
    'actions'
  ];
  auditDataSource = new MatTableDataSource<BillingAuditData>();

  loading = true;
  filterForm: FormGroup;
  selectedTab = 0;

  // Summary data
  validationSummary = {
    pendingValidation: 0,
    approvedBills: 0,
    rejectedBills: 0,
    totalAmount: 0,
    averageProcessingTime: 0
  };

  constructor(
    private integrationService: AccountantBillingIntegrationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)], // Last 7 days
      endDate: [new Date()],
      billingStaffId: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.setupRealTimeUpdates();
  }

  ngAfterViewInit(): void {
    this.billingDataSource.paginator = this.paginator;
    this.billingDataSource.sort = this.sort;
  }

  loadData(): void {
    this.loading = true;
    
    // Load pending bills for validation
    this.integrationService.getPendingBillsForReview().subscribe({
      next: (bills) => {
        this.billingDataSource.data = bills;
        this.updateValidationSummary();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading billing data:', error);
        this.snackBar.open('Error loading billing data', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });

    // Load billing audit data
    this.loadBillingAudits();
  }

  loadBillingAudits(): void {
    // This would typically load audit data for bills with revisions
    // For now, we'll simulate with empty data
    this.auditDataSource.data = [];
  }

  setupRealTimeUpdates(): void {
    // Subscribe to real-time updates
    this.integrationService.pendingBills$.subscribe(bills => {
      this.billingDataSource.data = bills;
      this.updateValidationSummary();
    });

    this.integrationService.billingAudits$.subscribe(audits => {
      this.auditDataSource.data = audits;
    });
  }

  validateBill(bill: BillingStaffData, status: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'): void {
    const notes = prompt(`Enter validation notes for ${status}:`);
    if (notes !== null) {
      const request: BillingValidationRequest = {
        billId: bill.billId,
        accountantNotes: notes,
        validationStatus: status,
        discrepancies: status === 'REJECTED' ? ['Amount discrepancy', 'Service mismatch'] : undefined
      };

      this.integrationService.validateBill(request).subscribe({
        next: () => {
          this.snackBar.open(`Bill ${status.toLowerCase()} successfully`, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (error) => {
          console.error('Error validating bill:', error);
          this.snackBar.open('Error validating bill', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  flagBillingDiscrepancy(bill: BillingStaffData): void {
    const discrepancy = prompt('Enter discrepancy description:');
    if (discrepancy) {
      this.integrationService.flagBillingDiscrepancy(bill.billId, discrepancy, 'MEDIUM').subscribe({
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

  requestBillCorrection(bill: BillingStaffData): void {
    const corrections = {
      message: 'Please review and correct the service pricing',
      priority: 'HIGH',
      requestedBy: 'current-accountant-id',
      corrections: [
        'Verify service quantities',
        'Check discount applications',
        'Validate tax calculations'
      ]
    };

    this.integrationService.requestBillCorrection(bill.billId, corrections).subscribe({
      next: () => {
        this.snackBar.open('Correction request sent to billing staff', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('Error requesting correction:', error);
        this.snackBar.open('Error requesting correction', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  validateServicePricing(bill: BillingStaffData): void {
    this.integrationService.validateServicePricing(bill.billId).subscribe({
      next: (validation) => {
        if (validation.isValid) {
          this.snackBar.open('Service pricing validated successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        } else {
          this.snackBar.open(`Pricing validation failed: ${validation.errors.join(', ')}`, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      },
      error: (error) => {
        console.error('Error validating pricing:', error);
        this.snackBar.open('Error validating pricing', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  verifyTaxCalculations(bill: BillingStaffData): void {
    this.integrationService.verifyTaxCalculations(bill.billId).subscribe({
      next: (verification) => {
        if (verification.isCorrect) {
          this.snackBar.open('Tax calculations verified successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        } else {
          this.snackBar.open(`Tax calculation errors: ${verification.errors.join(', ')}`, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      },
      error: (error) => {
        console.error('Error verifying tax calculations:', error);
        this.snackBar.open('Error verifying tax calculations', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  sendFeedbackToBillingStaff(staffId: string): void {
    const feedback = {
      message: 'Please ensure all service codes are correctly applied',
      priority: 'MEDIUM',
      sentBy: 'current-accountant-id',
      category: 'BILLING_ACCURACY'
    };

    this.integrationService.sendBillingFeedback(staffId, feedback).subscribe({
      next: () => {
        this.snackBar.open('Feedback sent to billing staff', 'Close', {
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

  viewBillRevisionHistory(billId: string): void {
    this.integrationService.getBillRevisionHistory(billId).subscribe({
      next: (history) => {
        // Open dialog with revision history
        console.log('Bill revision history:', history);
      },
      error: (error) => {
        console.error('Error loading revision history:', error);
      }
    });
  }

  onFilterChange(): void {
    this.loadData();
  }

  private updateValidationSummary(): void {
    const bills = this.billingDataSource.data;
    this.validationSummary.pendingValidation = bills.filter(b => b.status === 'FINALIZED').length;
    this.validationSummary.totalAmount = bills.reduce((sum, b) => sum + b.finalAmount, 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'FINALIZED': return 'primary';
      case 'SENT_TO_CASHIER': return 'success';
      case 'PAID': return 'success';
      case 'DRAFT': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'danger';
      default: return 'default';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'FINALIZED': return 'assignment';
      case 'SENT_TO_CASHIER': return 'send';
      case 'PAID': return 'check_circle';
      case 'DRAFT': return 'edit';
      case 'APPROVED': return 'check_circle';
      case 'REJECTED': return 'cancel';
      default: return 'help';
    }
  }

  getTotalServices(services: any[]): number {
    return services.reduce((sum, service) => sum + service.quantity, 0);
  }
}