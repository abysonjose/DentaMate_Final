import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CashierService, PaymentSummary, CashierAlert } from '../../services/cashier.service';
import { CashHandlingService, CashSummary } from '../../services/cash-handling.service';
import { CashierBillingIntegrationService, BillingCashierNotification } from '../../../shared/services/cashier-billing-integration.service';
import { PaymentDialogComponent } from '../../dialogs/payment-dialog/payment-dialog.component';
import { ShiftClosureDialogComponent } from '../../dialogs/shift-closure-dialog/shift-closure-dialog.component';

@Component({
  selector: 'app-cashier-dashboard',
  templateUrl: './cashier-dashboard.component.html',
  styleUrls: ['./cashier-dashboard.component.scss']
})
export class CashierDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Dashboard Data
  paymentSummary: PaymentSummary | null = null;
  cashSummary: CashSummary | null = null;
  alerts: CashierAlert[] = [];
  quickStats: any = null;
  
  // Integration Data
  billingNotifications: BillingCashierNotification[] = [];
  pendingHandoffs: any[] = [];
  integrationMetrics: any = null;
  
  // UI State
  loading = true;
  currentTime = new Date();
  isShiftActive = false;
  
  // Quick Actions
  searchTerm = '';
  searchType = 'INVOICE_NUMBER';
  searchTypes = [
    { value: 'INVOICE_NUMBER', label: 'Invoice Number' },
    { value: 'PATIENT_ID', label: 'Patient ID' },
    { value: 'APPOINTMENT_ID', label: 'Appointment ID' }
  ];

  constructor(
    private cashierService: CashierService,
    private cashHandlingService: CashHandlingService,
    private integrationService: CashierBillingIntegrationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadIntegrationData();
    this.startTimeUpdater();
    this.checkShiftStatus();
    this.subscribeToIntegrationUpdates();
    
    // Auto-refresh every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshData());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.loading = true;
    
    // Load payment summary
    this.cashierService.getPaymentSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => this.paymentSummary = summary,
        error: (error) => this.handleError('Failed to load payment summary', error)
      });

    // Load cash summary
    this.cashHandlingService.getCashSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => this.cashSummary = summary,
        error: (error) => this.handleError('Failed to load cash summary', error)
      });

    // Load alerts
    this.cashierService.getAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => this.alerts = alerts,
        error: (error) => this.handleError('Failed to load alerts', error)
      });

    // Load quick stats
    this.cashierService.getQuickStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.quickStats = stats;
          this.loading = false;
        },
        error: (error) => {
          this.handleError('Failed to load quick stats', error);
          this.loading = false;
        }
      });
  }

  private refreshData(): void {
    this.loadDashboardData();
    this.loadIntegrationData();
  }

  private startTimeUpdater(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.currentTime = new Date());
  }

  private checkShiftStatus(): void {
    this.cashHandlingService.currentShift$
      .pipe(takeUntil(this.destroy$))
      .subscribe(shift => {
        this.isShiftActive = shift?.status === 'ACTIVE';
      });
  }

  // Quick Actions
  quickSearch(): void {
    if (!this.searchTerm.trim()) {
      this.snackBar.open('Please enter a search term', 'Close', { duration: 3000 });
      return;
    }

    this.cashierService.searchInvoices(this.searchTerm, this.searchType as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoices) => {
          if (invoices.length === 1) {
            this.openPaymentDialog(invoices[0]);
          } else if (invoices.length > 1) {
            // Navigate to invoice lookup with results
            this.snackBar.open(`Found ${invoices.length} invoices. Opening search results...`, 'Close', { duration: 3000 });
          } else {
            this.snackBar.open('No invoices found', 'Close', { duration: 3000 });
          }
        },
        error: (error) => this.handleError('Search failed', error)
      });
  }

  openPaymentDialog(invoice?: any): void {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      data: { invoice }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshData();
        this.snackBar.open('Payment processed successfully', 'Close', { duration: 3000 });
      }
    });
  }

  // Shift Management
  startShift(): void {
    const dialogRef = this.dialog.open(ShiftClosureDialogComponent, {
      width: '500px',
      data: { action: 'START' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cashHandlingService.startShift(result.openingBalance, result.notes)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Shift started successfully', 'Close', { duration: 3000 });
              this.checkShiftStatus();
              this.refreshData();
            },
            error: (error) => this.handleError('Failed to start shift', error)
          });
      }
    });
  }

  endShift(): void {
    const dialogRef = this.dialog.open(ShiftClosureDialogComponent, {
      width: '600px',
      data: { action: 'END', cashSummary: this.cashSummary }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cashHandlingService.endShift(result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Shift ended successfully', 'Close', { duration: 3000 });
              this.checkShiftStatus();
              this.refreshData();
            },
            error: (error) => this.handleError('Failed to end shift', error)
          });
      }
    });
  }

  // Alert Actions
  dismissAlert(alert: CashierAlert): void {
    this.alerts = this.alerts.filter(a => a.id !== alert.id);
  }

  handleAlert(alert: CashierAlert): void {
    if (alert.invoiceId) {
      this.cashierService.getInvoiceById(alert.invoiceId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (invoice) => this.openPaymentDialog(invoice),
          error: (error) => this.handleError('Failed to load invoice', error)
        });
    }
  }

  // Utility Methods
  getAlertIcon(type: string): string {
    switch (type) {
      case 'PENDING_PAYMENT': return 'payment';
      case 'FAILED_TRANSACTION': return 'error';
      case 'OVERDUE_INVOICE': return 'schedule';
      case 'SYSTEM_ERROR': return 'warning';
      default: return 'info';
    }
  }

  getAlertColor(priority: string): string {
    switch (priority) {
      case 'HIGH': return 'warn';
      case 'MEDIUM': return 'accent';
      case 'LOW': return 'primary';
      default: return 'primary';
    }
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.snackBar.open(message, 'Close', { duration: 5000 });
  }

  // Integration Methods
  private loadIntegrationData(): void {
    // Load billing notifications
    this.integrationService.getNotifications('CASHIER')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => this.billingNotifications = notifications,
        error: (error) => this.handleError('Failed to load billing notifications', error)
      });

    // Load pending handoffs
    this.integrationService.getPendingHandoffs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (handoffs) => this.pendingHandoffs = handoffs,
        error: (error) => this.handleError('Failed to load pending handoffs', error)
      });

    // Load integration metrics
    this.integrationService.getIntegrationMetrics('TODAY')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics) => this.integrationMetrics = metrics,
        error: (error) => this.handleError('Failed to load integration metrics', error)
      });
  }

  private subscribeToIntegrationUpdates(): void {
    // Subscribe to real-time billing notifications
    this.integrationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.billingNotifications = notifications;
        this.showNewNotificationAlert(notifications);
      });

    // Subscribe to workflow updates
    this.integrationService.workflowUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        this.handleWorkflowUpdate(update);
      });
  }

  private showNewNotificationAlert(notifications: BillingCashierNotification[]): void {
    const newNotifications = notifications.filter(n => 
      new Date(n.createdAt).getTime() > Date.now() - 30000 // Last 30 seconds
    );
    
    if (newNotifications.length > 0) {
      const message = newNotifications.length === 1 
        ? this.integrationService.formatNotificationMessage(newNotifications[0])
        : `${newNotifications.length} new billing notifications`;
      
      this.snackBar.open(message, 'View', { duration: 5000 })
        .onAction().subscribe(() => this.showBillingNotifications());
    }
  }

  private handleWorkflowUpdate(update: any): void {
    // Handle workflow status changes
    if (update.currentStage === 'SENT_TO_CASHIER') {
      this.snackBar.open(`New invoice ready for payment: ${update.invoiceId}`, 'Process', { duration: 5000 })
        .onAction().subscribe(() => this.processInvoiceFromBilling(update.invoiceId));
    }
  }

  // Billing Integration Actions
  showBillingNotifications(): void {
    // This would open a notifications panel or dialog
    console.log('Show billing notifications:', this.billingNotifications);
  }

  processInvoiceFromBilling(invoiceId: string): void {
    this.cashierService.getInvoiceById(invoiceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoice) => this.openPaymentDialog(invoice),
        error: (error) => this.handleError('Failed to load invoice from billing', error)
      });
  }

  requestInvoiceClarification(invoiceId: string): void {
    const questions = ['Please clarify the billing items', 'Verify patient information'];
    this.integrationService.requestInvoiceClarification(invoiceId, questions, 'MEDIUM')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.snackBar.open('Clarification request sent to billing staff', 'Close', { duration: 3000 }),
        error: (error) => this.handleError('Failed to send clarification request', error)
      });
  }

  notifyPaymentProcessing(invoiceId: string, paymentDetails: any): void {
    this.integrationService.notifyPaymentProcessing(invoiceId, paymentDetails)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('Billing staff notified of payment processing'),
        error: (error) => this.handleError('Failed to notify billing staff', error)
      });
  }

  confirmPaymentToBilling(invoiceId: string, paymentData: any): void {
    this.integrationService.confirmPaymentToBilling(invoiceId, paymentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Payment confirmation sent to billing staff', 'Close', { duration: 3000 });
          this.refreshData();
        },
        error: (error) => this.handleError('Failed to confirm payment to billing', error)
      });
  }

  reportPaymentFailure(invoiceId: string, reason: string): void {
    this.integrationService.reportPaymentFailure(invoiceId, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.snackBar.open('Payment failure reported to billing staff', 'Close', { duration: 3000 }),
        error: (error) => this.handleError('Failed to report payment failure', error)
      });
  }

  // Enhanced Payment Dialog with Integration
  openPaymentDialog(invoice?: any): void {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      data: { invoice, integrationService: this.integrationService }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Notify billing staff of payment processing
        if (result.payment && invoice) {
          this.notifyPaymentProcessing(invoice.id, result.payment);
          
          // If payment successful, confirm to billing
          if (result.payment.status === 'SUCCESS') {
            this.confirmPaymentToBilling(invoice.id, result.payment);
          } else if (result.payment.status === 'FAILED') {
            this.reportPaymentFailure(invoice.id, result.payment.failureReason || 'Payment processing failed');
          }
        }
        
        this.refreshData();
        this.snackBar.open('Payment processed successfully', 'Close', { duration: 3000 });
      }
    });
  }

  // Utility Methods for Integration
  getBillingNotificationCount(): number {
    return this.billingNotifications.filter(n => n.type === 'INVOICE_GENERATED' || n.type === 'PAYMENT_REQUIRED').length;
  }

  getPendingHandoffCount(): number {
    return this.pendingHandoffs.length;
  }

  getIntegrationStatusColor(): string {
    const pendingCount = this.getPendingHandoffCount();
    if (pendingCount === 0) return 'primary';
    if (pendingCount < 5) return 'accent';
    return 'warn';
  }

  // Navigation helpers
  navigateToInvoiceLookup(): void {
    // Router navigation would be implemented here
  }

  navigateToPaymentHistory(): void {
    // Router navigation would be implemented here
  }

  navigateToCashHandling(): void {
    // Router navigation would be implemented here
  }
}