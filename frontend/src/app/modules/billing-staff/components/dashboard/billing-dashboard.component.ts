import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillingStaffService, BillingSummary, PaymentAlert, BillItem } from '../../services/billing-staff.service';
import { BillingCashierIntegrationService, BillingStaffNotification, InvoiceHandoffStatus } from '../../services/billing-cashier-integration.service';
import { GenerateBillDialogComponent } from '../../dialogs/generate-bill-dialog/generate-bill-dialog.component';

@Component({
  selector: 'app-billing-dashboard',
  templateUrl: './billing-dashboard.component.html',
  styleUrls: ['./billing-dashboard.component.scss']
})
export class BillingDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  billingSummary: BillingSummary | null = null;
  alerts: PaymentAlert[] = [];
  todayBills: BillItem[] = [];
  pendingBills: BillItem[] = [];
  loading = true;
  
  // Cashier Integration Data
  cashierNotifications: BillingStaffNotification[] = [];
  invoicesWithCashier: any[] = [];
  invoicesReadyForCashier: any[] = [];
  handoffStatuses: InvoiceHandoffStatus[] = [];
  integrationDashboard: any = null;
  
  // Quick search
  searchTerm = '';
  
  // Display columns for tables
  billsDisplayedColumns = ['billNumber', 'patientName', 'amount', 'status', 'createdDate', 'actions'];
  alertsDisplayedColumns = ['type', 'patientName', 'amount', 'dueDate', 'priority', 'actions'];
  cashierInvoicesColumns = ['invoiceNumber', 'patientName', 'amount', 'status', 'sentAt', 'actions'];

  constructor(
    private billingService: BillingStaffService,
    private integrationService: BillingCashierIntegrationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadIntegrationData();
    this.subscribeToUpdates();
    this.subscribeToIntegrationUpdates();
    
    // Auto-refresh integration data every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadIntegrationData());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.loading = true;
    
    // Load billing summary
    this.billingService.getBillingSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.billingSummary = summary;
        },
        error: (error) => {
          console.error('Error loading billing summary:', error);
          this.showError('Failed to load billing summary');
        }
      });

    // Load today's bills
    this.billingService.getTodayBills()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bills) => {
          this.todayBills = bills;
        },
        error: (error) => {
          console.error('Error loading today bills:', error);
        }
      });

    // Load pending bills
    this.billingService.getPendingBills()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bills) => {
          this.pendingBills = bills;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading pending bills:', error);
          this.loading = false;
        }
      });
  }

  private subscribeToUpdates(): void {
    // Subscribe to billing summary updates
    this.billingService.billingSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        if (summary) {
          this.billingSummary = summary;
        }
      });

    // Subscribe to alerts updates
    this.billingService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts;
      });
  }

  // Integration Data Loading
  private loadIntegrationData(): void {
    // Load cashier notifications
    this.integrationService.getCashierNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => this.cashierNotifications = notifications,
        error: (error) => console.error('Error loading cashier notifications:', error)
      });

    // Load invoices with cashier
    this.integrationService.getInvoicesWithCashier()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoices) => this.invoicesWithCashier = invoices,
        error: (error) => console.error('Error loading invoices with cashier:', error)
      });

    // Load invoices ready for cashier
    this.integrationService.getInvoicesReadyForCashier()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoices) => this.invoicesReadyForCashier = invoices,
        error: (error) => console.error('Error loading invoices ready for cashier:', error)
      });

    // Load integration dashboard
    this.integrationService.getBillingStaffDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dashboard) => this.integrationDashboard = dashboard,
        error: (error) => console.error('Error loading integration dashboard:', error)
      });
  }

  private subscribeToIntegrationUpdates(): void {
    // Subscribe to cashier notifications
    this.integrationService.cashierNotifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.cashierNotifications = notifications;
        this.showNewCashierNotifications(notifications);
      });

    // Subscribe to handoff status updates
    this.integrationService.handoffStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(statuses => {
        this.handoffStatuses = statuses;
      });
  }

  private showNewCashierNotifications(notifications: BillingStaffNotification[]): void {
    const newNotifications = notifications.filter(n => 
      new Date(n.createdAt).getTime() > Date.now() - 30000 // Last 30 seconds
    );
    
    if (newNotifications.length > 0) {
      const message = newNotifications.length === 1 
        ? this.integrationService.formatCashierNotificationMessage(newNotifications[0])
        : `${newNotifications.length} new updates from cashier`;
      
      this.snackBar.open(message, 'View', { duration: 5000 })
        .onAction().subscribe(() => this.showCashierNotifications());
    }
  }

  // Quick Actions
  openGenerateBillDialog(): void {
    const dialogRef = this.dialog.open(GenerateBillDialogComponent, {
      width: '800px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshDashboard();
        this.showSuccess('Bill generated successfully');
      }
    });
  }

  searchInvoice(): void {
    if (!this.searchTerm.trim()) {
      this.showError('Please enter invoice number to search');
      return;
    }

    this.billingService.searchInvoice(this.searchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoice) => {
          if (invoice) {
            // Navigate to invoice details or open dialog
            this.showSuccess('Invoice found');
          } else {
            this.showError('Invoice not found');
          }
        },
        error: (error) => {
          console.error('Error searching invoice:', error);
          this.showError('Error searching invoice');
        }
      });
  }

  // Alert Actions
  handleAlert(alert: PaymentAlert): void {
    switch (alert.type) {
      case 'UNPAID_BILL':
        this.handleUnpaidBill(alert);
        break;
      case 'FAILED_PAYMENT':
        this.handleFailedPayment(alert);
        break;
      case 'OVERDUE_PAYMENT':
        this.handleOverduePayment(alert);
        break;
    }
  }

  private handleUnpaidBill(alert: PaymentAlert): void {
    // Open payment processing dialog or navigate to payment page
    this.showInfo(`Processing unpaid bill for ${alert.patientName}`);
  }

  private handleFailedPayment(alert: PaymentAlert): void {
    // Handle failed payment retry
    this.showInfo(`Handling failed payment for ${alert.patientName}`);
  }

  private handleOverduePayment(alert: PaymentAlert): void {
    // Handle overdue payment follow-up
    this.showInfo(`Following up overdue payment for ${alert.patientName}`);
  }

  // Bill Actions
  viewBillDetails(bill: BillItem): void {
    // Navigate to bill details or open dialog
    console.log('Viewing bill details:', bill);
  }

  processBillPayment(bill: BillItem): void {
    // Open payment processing dialog
    console.log('Processing payment for bill:', bill);
  }

  printBill(bill: BillItem): void {
    // Print bill functionality
    this.showInfo(`Printing bill ${bill.billNumber}`);
  }

  // Utility Methods
  refreshDashboard(): void {
    this.billingService.refreshDashboard();
    this.loadDashboardData();
    this.loadIntegrationData();
  }

  // Cashier Integration Actions
  sendInvoiceToCashier(invoice: any, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'): void {
    this.integrationService.sendInvoiceToCashier(invoice.id, priority)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Invoice ${invoice.invoiceNumber} sent to cashier`);
          this.loadIntegrationData();
        },
        error: (error) => {
          console.error('Error sending invoice to cashier:', error);
          this.showError('Failed to send invoice to cashier');
        }
      });
  }

  sendMultipleInvoicesToCashier(invoiceIds: string[], priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'): void {
    this.integrationService.sendInvoicesToCashierBatch(invoiceIds, priority)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`${invoiceIds.length} invoices sent to cashier`);
          this.loadIntegrationData();
        },
        error: (error) => {
          console.error('Error sending invoices to cashier:', error);
          this.showError('Failed to send invoices to cashier');
        }
      });
  }

  recallInvoiceFromCashier(invoice: any, reason: string): void {
    this.integrationService.recallInvoiceFromCashier(invoice.id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Invoice ${invoice.invoiceNumber} recalled from cashier`);
          this.loadIntegrationData();
        },
        error: (error) => {
          console.error('Error recalling invoice:', error);
          this.showError('Failed to recall invoice from cashier');
        }
      });
  }

  respondToClarificationRequest(invoiceId: string, responses: string[]): void {
    this.integrationService.respondToClarificationRequest(invoiceId, responses)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Clarification response sent to cashier');
          this.loadIntegrationData();
        },
        error: (error) => {
          console.error('Error responding to clarification:', error);
          this.showError('Failed to send clarification response');
        }
      });
  }

  setInvoicePriority(invoice: any, priority: 'HIGH' | 'MEDIUM' | 'LOW'): void {
    this.integrationService.setInvoicePriority(invoice.id, priority)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Invoice priority updated to ${priority}`);
          this.loadIntegrationData();
        },
        error: (error) => {
          console.error('Error updating invoice priority:', error);
          this.showError('Failed to update invoice priority');
        }
      });
  }

  requestPaymentExpedite(invoice: any, reason: string): void {
    this.integrationService.requestPaymentExpedite(invoice.id, reason, 'HIGH')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Payment expedite requested for invoice ${invoice.invoiceNumber}`);
          this.loadIntegrationData();
        },
        error: (error) => {
          console.error('Error requesting payment expedite:', error);
          this.showError('Failed to request payment expedite');
        }
      });
  }

  handleCashierNotification(notification: BillingStaffNotification): void {
    switch (notification.type) {
      case 'PAYMENT_PROCESSED':
        this.handlePaymentProcessed(notification);
        break;
      case 'PAYMENT_FAILED':
        this.handlePaymentFailed(notification);
        break;
      case 'CLARIFICATION_REQUESTED':
        this.handleClarificationRequested(notification);
        break;
      case 'PAYMENT_PROCESSING':
        this.handlePaymentProcessing(notification);
        break;
    }
  }

  private handlePaymentProcessed(notification: BillingStaffNotification): void {
    this.integrationService.markCashierNotificationHandled(notification.id, 'ACKNOWLEDGED')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess(`Payment processed for invoice ${notification.invoiceNumber}`);
          this.loadIntegrationData();
        },
        error: (error) => console.error('Error handling notification:', error)
      });
  }

  private handlePaymentFailed(notification: BillingStaffNotification): void {
    // Open dialog to handle payment failure
    this.showError(`Payment failed for invoice ${notification.invoiceNumber} - requires attention`);
  }

  private handleClarificationRequested(notification: BillingStaffNotification): void {
    // Open dialog to provide clarification
    this.showInfo(`Cashier requested clarification for invoice ${notification.invoiceNumber}`);
  }

  private handlePaymentProcessing(notification: BillingStaffNotification): void {
    this.showInfo(`Payment being processed for invoice ${notification.invoiceNumber}`);
  }

  showCashierNotifications(): void {
    // This would open a detailed notifications panel
    console.log('Show cashier notifications:', this.cashierNotifications);
  }

  // Integration Utility Methods
  getCashierNotificationCount(): number {
    return this.cashierNotifications.filter(n => this.integrationService.needsAttention(n)).length;
  }

  getInvoicesWithCashierCount(): number {
    return this.invoicesWithCashier.length;
  }

  getInvoicesReadyForCashierCount(): number {
    return this.invoicesReadyForCashier.length;
  }

  canRecallInvoice(invoice: any): boolean {
    const status = this.getInvoiceHandoffStatus(invoice.id);
    return this.integrationService.canRecallInvoice(status);
  }

  getInvoiceHandoffStatus(invoiceId: string): string {
    const handoff = this.handoffStatuses.find(h => h.invoiceId === invoiceId);
    return handoff?.status || 'DRAFT';
  }

  getHandoffStatusColor(status: string): string {
    return this.integrationService.getHandoffStatusColor(status);
  }

  getHandoffStatusIcon(status: string): string {
    return this.integrationService.getHandoffStatusIcon(status);
  }

  formatCurrency(amount: number): string {
    return this.billingService.formatCurrency(amount);
  }

  getStatusColor(status: string): string {
    return this.billingService.getStatusColor(status);
  }

  getPriorityColor(priority: string): string {
    return this.billingService.getPriorityColor(priority);
  }

  getAlertIcon(type: string): string {
    const icons = {
      'UNPAID_BILL': 'receipt_long',
      'FAILED_PAYMENT': 'error',
      'OVERDUE_PAYMENT': 'schedule'
    };
    return icons[type as keyof typeof icons] || 'info';
  }

  // Snackbar Messages
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }
}