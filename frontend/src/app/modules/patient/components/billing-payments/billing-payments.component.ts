import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { PatientService, Bill } from '../../services/patient.service';
import { PaymentDialogComponent } from '../../dialogs/payment-dialog/payment-dialog.component';

@Component({
  selector: 'app-billing-payments',
  template: `
    <div class="billing-payments">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Billing & Payments</h1>
          <p class="subtitle">Manage your bills and payment history</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading your billing information...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading" class="billing-content">
        
        <!-- Summary Cards -->
        <div class="summary-cards" *ngIf="billingSummary">
          <mat-card class="summary-card pending">
            <mat-card-content>
              <div class="summary-content">
                <mat-icon color="warn">payment</mat-icon>
                <div class="summary-info">
                  <span class="summary-value">{{formatCurrency(billingSummary.pendingAmount)}}</span>
                  <span class="summary-label">Pending Amount</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card paid">
            <mat-card-content>
              <div class="summary-content">
                <mat-icon color="primary">done</mat-icon>
                <div class="summary-info">
                  <span class="summary-value">{{formatCurrency(billingSummary.paidAmount)}}</span>
                  <span class="summary-label">Total Paid</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card bills">
            <mat-card-content>
              <div class="summary-content">
                <mat-icon color="accent">receipt</mat-icon>
                <div class="summary-info">
                  <span class="summary-value">{{billingSummary.totalBills}}</span>
                  <span class="summary-label">Total Bills</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Tabs -->
        <mat-card class="tabs-card">
          <mat-tab-group [(selectedIndex)]="selectedTab" (selectedTabChange)="onTabChange($event)">
            
            <mat-tab label="Pending Bills">
              <div class="tab-content">
                <div *ngIf="pendingBills.length === 0" class="empty-state">
                  <mat-icon>receipt</mat-icon>
                  <h3>No pending bills</h3>
                  <p>You don't have any pending bills at the moment.</p>
                </div>
                
                <div *ngIf="pendingBills.length > 0" class="bills-list">
                  <mat-card *ngFor="let bill of pendingBills" class="bill-card pending">
                    <mat-card-header>
                      <div mat-card-avatar class="bill-avatar pending">
                        <mat-icon>payment</mat-icon>
                      </div>
                      <mat-card-title>Bill #{{bill.id}}</mat-card-title>
                      <mat-card-subtitle>{{formatDate(bill.billDate)}}</mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      <div class="bill-summary">
                        <div class="bill-items">
                          <div *ngFor="let item of bill.items | slice:0:3" class="bill-item">
                            <span class="item-description">{{item.description}}</span>
                            <span class="item-amount">{{formatCurrency(item.total)}}</span>
                          </div>
                          <div *ngIf="bill.items.length > 3" class="more-items">
                            +{{bill.items.length - 3}} more items
                          </div>
                        </div>
                        
                        <div class="bill-total">
                          <div class="total-row">
                            <span class="total-label">Total Amount:</span>
                            <span class="total-amount">{{formatCurrency(bill.totalAmount)}}</span>
                          </div>
                          <div class="due-date" [class.overdue]="isOverdue(bill)">
                            Due: {{formatDate(bill.dueDate)}}
                          </div>
                        </div>
                      </div>
                      
                      <mat-chip color="warn" selected class="status-chip">
                        {{bill.status | titlecase}}
                      </mat-chip>
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button mat-raised-button color="primary" (click)="payBill(bill)">
                        <mat-icon>payment</mat-icon>
                        Pay Now
                      </button>
                      <button mat-button (click)="viewBillDetails(bill)">
                        <mat-icon>visibility</mat-icon>
                        View Details
                      </button>
                      <button mat-button (click)="downloadInvoice(bill)">
                        <mat-icon>download</mat-icon>
                        Download
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
            
            <mat-tab label="All Bills">
              <div class="tab-content">
                <div *ngIf="allBills.length === 0" class="empty-state">
                  <mat-icon>receipt</mat-icon>
                  <h3>No bills found</h3>
                  <p>Your billing history will appear here after your visits.</p>
                </div>
                
                <div *ngIf="allBills.length > 0" class="bills-list">
                  <mat-card *ngFor="let bill of allBills" 
                           class="bill-card" 
                           [class]="bill.status.toLowerCase()">
                    <mat-card-header>
                      <div mat-card-avatar class="bill-avatar" [class]="bill.status.toLowerCase()">
                        <mat-icon>{{getBillIcon(bill.status)}}</mat-icon>
                      </div>
                      <mat-card-title>Bill #{{bill.id}}</mat-card-title>
                      <mat-card-subtitle>{{formatDate(bill.billDate)}}</mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      <div class="bill-summary">
                        <div class="bill-items">
                          <div *ngFor="let item of bill.items | slice:0:3" class="bill-item">
                            <span class="item-description">{{item.description}}</span>
                            <span class="item-amount">{{formatCurrency(item.total)}}</span>
                          </div>
                          <div *ngIf="bill.items.length > 3" class="more-items">
                            +{{bill.items.length - 3}} more items
                          </div>
                        </div>
                        
                        <div class="bill-total">
                          <div class="total-row">
                            <span class="total-label">Total Amount:</span>
                            <span class="total-amount">{{formatCurrency(bill.totalAmount)}}</span>
                          </div>
                          <div class="payment-info" *ngIf="bill.status === 'PAID'">
                            Paid on {{formatDate(bill.paidAt!)}} via {{bill.paymentMethod}}
                          </div>
                          <div class="due-date" *ngIf="bill.status === 'PENDING'" [class.overdue]="isOverdue(bill)">
                            Due: {{formatDate(bill.dueDate)}}
                          </div>
                        </div>
                      </div>
                      
                      <mat-chip [color]="getStatusColor(bill.status)" selected class="status-chip">
                        {{bill.status | titlecase}}
                      </mat-chip>
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button *ngIf="bill.status === 'PENDING'" 
                              mat-raised-button color="primary" 
                              (click)="payBill(bill)">
                        <mat-icon>payment</mat-icon>
                        Pay Now
                      </button>
                      <button mat-button (click)="viewBillDetails(bill)">
                        <mat-icon>visibility</mat-icon>
                        View Details
                      </button>
                      <button mat-button (click)="downloadInvoice(bill)">
                        <mat-icon>download</mat-icon>
                        Download
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>
            </mat-tab>
            
          </mat-tab-group>
        </mat-card>

      </div>

      <!-- Bill Detail Modal -->
      <div *ngIf="selectedBill" class="bill-modal-overlay" (click)="closeBillView()">
        <div class="bill-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Bill Details</h2>
            <button mat-icon-button (click)="closeBillView()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <div class="modal-content">
            <div class="bill-details">
              
              <!-- Bill Info -->
              <div class="detail-section">
                <h3>Bill Information</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Bill ID:</span>
                    <span class="value">#{{selectedBill.id}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Date:</span>
                    <span class="value">{{formatDate(selectedBill.billDate)}}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Status:</span>
                    <mat-chip [color]="getStatusColor(selectedBill.status)" selected>
                      {{selectedBill.status | titlecase}}
                    </mat-chip>
                  </div>
                  <div class="info-item" *ngIf="selectedBill.status === 'PENDING'">
                    <span class="label">Due Date:</span>
                    <span class="value" [class.overdue]="isOverdue(selectedBill)">
                      {{formatDate(selectedBill.dueDate)}}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Bill Items -->
              <div class="detail-section">
                <h3>Bill Items</h3>
                <div class="items-table">
                  <div class="table-header">
                    <span>Description</span>
                    <span>Qty</span>
                    <span>Unit Price</span>
                    <span>Total</span>
                  </div>
                  <div *ngFor="let item of selectedBill.items" class="table-row">
                    <span class="item-desc">{{item.description}}</span>
                    <span class="item-qty">{{item.quantity}}</span>
                    <span class="item-price">{{formatCurrency(item.unitPrice)}}</span>
                    <span class="item-total">{{formatCurrency(item.total)}}</span>
                  </div>
                </div>
              </div>

              <!-- Bill Totals -->
              <div class="detail-section">
                <h3>Bill Summary</h3>
                <div class="totals-section">
                  <div class="total-row">
                    <span>Subtotal:</span>
                    <span>{{formatCurrency(selectedBill.subtotal)}}</span>
                  </div>
                  <div class="total-row" *ngIf="selectedBill.discount > 0">
                    <span>Discount:</span>
                    <span class="discount">-{{formatCurrency(selectedBill.discount)}}</span>
                  </div>
                  <div class="total-row" *ngIf="selectedBill.tax > 0">
                    <span>Tax:</span>
                    <span>{{formatCurrency(selectedBill.tax)}}</span>
                  </div>
                  <div class="total-row final-total">
                    <span>Total Amount:</span>
                    <span>{{formatCurrency(selectedBill.totalAmount)}}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          <div class="modal-actions">
            <button mat-button (click)="closeBillView()">Close</button>
            <button mat-button (click)="downloadInvoice(selectedBill)">
              <mat-icon>download</mat-icon>
              Download
            </button>
            <button *ngIf="selectedBill.status === 'PENDING'" 
                    mat-raised-button color="primary" 
                    (click)="payBill(selectedBill)">
              <mat-icon>payment</mat-icon>
              Pay Now
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styleUrls: ['./billing-payments.component.scss']
})
export class BillingPaymentsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  allBills: Bill[] = [];
  pendingBills: Bill[] = [];
  selectedTab = 0;
  selectedBill: Bill | null = null;
  billingSummary: any = null;

  constructor(
    private patientService: PatientService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadBills();
    this.checkForDirectPayment();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkForDirectPayment(): void {
    this.route.queryParams.subscribe(params => {
      if (params['billId'] && params['action'] === 'pay') {
        // Find and pay the specific bill
        setTimeout(() => {
          const bill = this.allBills.find(b => b.id === params['billId']);
          if (bill) {
            this.payBill(bill);
          }
        }, 1000);
      }
    });
  }

  private loadBills(): void {
    this.loading = true;
    
    this.patientService.getBills()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bills) => {
          this.allBills = bills.sort((a, b) => 
            new Date(b.billDate).getTime() - new Date(a.billDate).getTime()
          );
          this.pendingBills = bills.filter(b => b.status === 'PENDING');
          this.calculateBillingSummary();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading bills:', error);
          this.snackBar.open('Error loading bills', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private calculateBillingSummary(): void {
    this.billingSummary = {
      pendingAmount: this.allBills
        .filter(b => b.status === 'PENDING')
        .reduce((sum, b) => sum + b.totalAmount, 0),
      paidAmount: this.allBills
        .filter(b => b.status === 'PAID')
        .reduce((sum, b) => sum + b.totalAmount, 0),
      totalBills: this.allBills.length
    };
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
  }

  payBill(bill: Bill): void {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { bill }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBills(); // Refresh bills after payment
      }
    });
  }

  viewBillDetails(bill: Bill): void {
    this.selectedBill = bill;
  }

  closeBillView(): void {
    this.selectedBill = null;
  }

  downloadInvoice(bill: Bill): void {
    this.patientService.downloadInvoice(bill.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `invoice-${bill.id}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.snackBar.open('Invoice downloaded successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error downloading invoice:', error);
          this.snackBar.open('Error downloading invoice', 'Close', { duration: 3000 });
        }
      });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  isOverdue(bill: Bill): boolean {
    return new Date(bill.dueDate) < new Date() && bill.status === 'PENDING';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PAID':
        return 'primary';
      case 'PENDING':
        return 'warn';
      case 'OVERDUE':
        return 'warn';
      case 'CANCELLED':
        return 'accent';
      default:
        return 'primary';
    }
  }

  getBillIcon(status: string): string {
    switch (status) {
      case 'PAID':
        return 'done';
      case 'PENDING':
        return 'payment';
      case 'OVERDUE':
        return 'warning';
      case 'CANCELLED':
        return 'cancel';
      default:
        return 'receipt';
    }
  }
}