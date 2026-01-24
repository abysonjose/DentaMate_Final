import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaymentService, PaymentRequest } from '../../services/payment.service';
import { ReceiptService } from '../../services/receipt.service';
import { Invoice } from '../../services/cashier.service';

@Component({
  selector: 'app-payment-dialog',
  template: `
    <div class="payment-dialog">
      <h2 mat-dialog-title>
        <mat-icon>payment</mat-icon>
        Collect Payment
      </h2>

      <mat-dialog-content>
        <!-- Invoice Details -->
        <mat-card class="invoice-card" *ngIf="invoice">
          <mat-card-header>
            <mat-card-title>Invoice Details</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="invoice-info">
              <div class="info-row">
                <span class="label">Invoice Number:</span>
                <span class="value">{{ invoice.invoiceNumber }}</span>
              </div>
              <div class="info-row">
                <span class="label">Patient:</span>
                <span class="value">{{ invoice.patientName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Total Amount:</span>
                <span class="value amount">₹{{ invoice.totalAmount | number:'1.2-2' }}</span>
              </div>
              <div class="info-row" *ngIf="invoice.paidAmount > 0">
                <span class="label">Paid Amount:</span>
                <span class="value paid">₹{{ invoice.paidAmount | number:'1.2-2' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Pending Amount:</span>
                <span class="value pending">₹{{ invoice.pendingAmount | number:'1.2-2' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Payment Form -->
        <form [formGroup]="paymentForm" class="payment-form">
          <div class="form-row">
            <mat-form-field appearance="outline" class="amount-field">
              <mat-label>Payment Amount</mat-label>
              <input matInput type="number" formControlName="amount" 
                     [max]="maxPaymentAmount" min="0.01" step="0.01">
              <span matPrefix>₹</span>
              <mat-error *ngIf="paymentForm.get('amount')?.hasError('required')">
                Amount is required
              </mat-error>
              <mat-error *ngIf="paymentForm.get('amount')?.hasError('max')">
                Amount cannot exceed pending amount
              </mat-error>
              <mat-error *ngIf="paymentForm.get('amount')?.hasError('min')">
                Amount must be greater than 0
              </mat-error>
            </mat-form-field>

            <div class="amount-buttons">
              <button type="button" mat-button (click)="setFullAmount()" 
                      [disabled]="!invoice">
                Full Amount
              </button>
              <button type="button" mat-button (click)="setPartialAmount()" 
                      [disabled]="!invoice">
                50%
              </button>
            </div>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Payment Mode</mat-label>
            <mat-select formControlName="paymentMode" (selectionChange)="onPaymentModeChange()">
              <mat-option value="CASH">Cash</mat-option>
              <mat-option value="UPI">UPI</mat-option>
              <mat-option value="CARD">Card</mat-option>
              <mat-option value="WALLET">Wallet</mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('paymentMode')?.hasError('required')">
              Payment mode is required
            </mat-error>
          </mat-form-field>

          <!-- Payment Details based on mode -->
          <div class="payment-details" *ngIf="showPaymentDetails">
            <mat-form-field appearance="outline" *ngIf="paymentForm.get('paymentMode')?.value === 'UPI'">
              <mat-label>UPI Transaction ID</mat-label>
              <input matInput formControlName="transactionId">
            </mat-form-field>

            <mat-form-field appearance="outline" *ngIf="paymentForm.get('paymentMode')?.value === 'CARD'">
              <mat-label>Card Last 4 Digits</mat-label>
              <input matInput formControlName="cardLast4" maxlength="4" pattern="[0-9]{4}">
            </mat-form-field>

            <mat-form-field appearance="outline" *ngIf="paymentForm.get('paymentMode')?.value === 'WALLET'">
              <mat-label>Wallet Provider</mat-label>
              <mat-select formControlName="walletProvider">
                <mat-option value="PAYTM">Paytm</mat-option>
                <mat-option value="PHONEPE">PhonePe</mat-option>
                <mat-option value="GOOGLEPAY">Google Pay</mat-option>
                <mat-option value="AMAZONPAY">Amazon Pay</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Notes (Optional)</mat-label>
            <textarea matInput formControlName="notes" rows="2"></textarea>
          </mat-form-field>
        </form>

        <!-- Payment Summary -->
        <mat-card class="payment-summary" *ngIf="paymentForm.get('amount')?.value > 0">
          <mat-card-content>
            <div class="summary-row">
              <span>Payment Amount:</span>
              <span class="amount">₹{{ paymentForm.get('amount')?.value | number:'1.2-2' }}</span>
            </div>
            <div class="summary-row">
              <span>Payment Mode:</span>
              <span>{{ paymentForm.get('paymentMode')?.value }}</span>
            </div>
            <div class="summary-row" *ngIf="invoice">
              <span>Remaining Balance:</span>
              <span class="remaining">₹{{ getRemainingBalance() | number:'1.2-2' }}</span>
            </div>
          </mat-card-content>
        </mat-card>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                (click)="processPayment()" 
                [disabled]="paymentForm.invalid || processing">
          <mat-icon *ngIf="processing">
            <mat-spinner diameter="20"></mat-spinner>
          </mat-icon>
          <mat-icon *ngIf="!processing">payment</mat-icon>
          {{ processing ? 'Processing...' : 'Process Payment' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrls: ['./payment-dialog.component.scss']
})
export class PaymentDialogComponent implements OnInit {
  paymentForm: FormGroup;
  invoice: Invoice | null = null;
  processing = false;
  showPaymentDetails = false;
  maxPaymentAmount = 0;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private paymentService: PaymentService,
    private receiptService: ReceiptService,
    private snackBar: MatSnackBar
  ) {
    this.invoice = data?.invoice;
    this.maxPaymentAmount = this.invoice?.pendingAmount || 999999;
    
    this.paymentForm = this.fb.group({
      amount: [this.invoice?.pendingAmount || '', [
        Validators.required,
        Validators.min(0.01),
        Validators.max(this.maxPaymentAmount)
      ]],
      paymentMode: ['CASH', Validators.required],
      transactionId: [''],
      cardLast4: [''],
      walletProvider: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Update validators when amount changes
    this.paymentForm.get('amount')?.valueChanges.subscribe(() => {
      this.updateAmountValidators();
    });
  }

  onPaymentModeChange(): void {
    const paymentMode = this.paymentForm.get('paymentMode')?.value;
    this.showPaymentDetails = paymentMode !== 'CASH';
    
    // Reset payment details
    this.paymentForm.patchValue({
      transactionId: '',
      cardLast4: '',
      walletProvider: ''
    });
  }

  setFullAmount(): void {
    if (this.invoice) {
      this.paymentForm.patchValue({ amount: this.invoice.pendingAmount });
    }
  }

  setPartialAmount(): void {
    if (this.invoice) {
      const halfAmount = this.invoice.pendingAmount / 2;
      this.paymentForm.patchValue({ amount: halfAmount });
    }
  }

  getRemainingBalance(): number {
    if (!this.invoice) return 0;
    const paymentAmount = this.paymentForm.get('amount')?.value || 0;
    return this.invoice.pendingAmount - paymentAmount;
  }

  private updateAmountValidators(): void {
    const amountControl = this.paymentForm.get('amount');
    if (amountControl) {
      amountControl.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(this.maxPaymentAmount)
      ]);
      amountControl.updateValueAndValidity();
    }
  }

  processPayment(): void {
    if (this.paymentForm.invalid || !this.invoice) return;

    this.processing = true;
    const formValue = this.paymentForm.value;

    const paymentRequest: PaymentRequest = {
      invoiceId: this.invoice.id,
      amount: formValue.amount,
      paymentMode: formValue.paymentMode,
      notes: formValue.notes,
      paymentDetails: this.buildPaymentDetails(formValue)
    };

    this.paymentService.processPayment(paymentRequest).subscribe({
      next: (response) => {
        this.snackBar.open('Payment processed successfully', 'Close', { duration: 3000 });
        
        // Generate receipt
        this.receiptService.generateReceipt(response.id).subscribe({
          next: (receipt) => {
            this.dialogRef.close({ payment: response, receipt });
          },
          error: (error) => {
            console.error('Receipt generation failed:', error);
            this.dialogRef.close({ payment: response });
          }
        });
      },
      error: (error) => {
        this.processing = false;
        this.snackBar.open('Payment processing failed: ' + error.message, 'Close', { duration: 5000 });
      }
    });
  }

  private buildPaymentDetails(formValue: any): any {
    const details: any = {};
    
    switch (formValue.paymentMode) {
      case 'UPI':
        if (formValue.transactionId) {
          details.transactionId = formValue.transactionId;
        }
        break;
      case 'CARD':
        if (formValue.cardLast4) {
          details.cardLast4 = formValue.cardLast4;
        }
        break;
      case 'WALLET':
        if (formValue.walletProvider) {
          details.walletProvider = formValue.walletProvider;
        }
        break;
    }
    
    return Object.keys(details).length > 0 ? details : undefined;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}