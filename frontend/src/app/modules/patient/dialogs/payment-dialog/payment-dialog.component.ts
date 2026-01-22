import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PatientService, Bill } from '../../services/patient.service';

@Component({
  selector: 'app-payment-dialog',
  template: `
    <div class="payment-dialog">
      <h2 mat-dialog-title>Make Payment</h2>
      
      <mat-dialog-content>
        <!-- Bill Summary -->
        <div class="bill-summary">
          <h3>Bill Summary</h3>
          <div class="bill-details">
            <div class="bill-header">
              <span class="bill-id">Bill #{{bill.id}}</span>
              <span class="bill-date">{{formatDate(bill.billDate)}}</span>
            </div>
            
            <!-- Bill Items -->
            <div class="bill-items">
              <div *ngFor="let item of bill.items" class="bill-item">
                <div class="item-info">
                  <span class="item-description">{{item.description}}</span>
                  <span class="item-quantity">Qty: {{item.quantity}}</span>
                </div>
                <span class="item-total">{{formatCurrency(item.total)}}</span>
              </div>
            </div>
            
            <!-- Bill Totals -->
            <div class="bill-totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>{{formatCurrency(bill.subtotal)}}</span>
              </div>
              <div class="total-row" *ngIf="bill.discount > 0">
                <span>Discount:</span>
                <span class="discount">-{{formatCurrency(bill.discount)}}</span>
              </div>
              <div class="total-row" *ngIf="bill.tax > 0">
                <span>Tax:</span>
                <span>{{formatCurrency(bill.tax)}}</span>
              </div>
              <div class="total-row final-total">
                <span>Total Amount:</span>
                <span>{{formatCurrency(bill.totalAmount)}}</span>
              </div>
            </div>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Payment Form -->
        <form [formGroup]="paymentForm" class="payment-form">
          <h3>Payment Details</h3>
          
          <!-- Payment Method -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Payment Method</mat-label>
            <mat-select formControlName="paymentMethod" (selectionChange)="onPaymentMethodChange()">
              <mat-option value="UPI">UPI</mat-option>
              <mat-option value="CARD">Credit/Debit Card</mat-option>
              <mat-option value="NET_BANKING">Net Banking</mat-option>
              <mat-option value="WALLET">Digital Wallet</mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('paymentMethod')?.hasError('required')">
              Please select a payment method
            </mat-error>
          </mat-form-field>

          <!-- UPI ID (for UPI payments) -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="paymentForm.get('paymentMethod')?.value === 'UPI'">
            <mat-label>UPI ID</mat-label>
            <input matInput formControlName="upiId" placeholder="yourname@upi">
            <mat-error *ngIf="paymentForm.get('upiId')?.hasError('required')">
              Please enter your UPI ID
            </mat-error>
            <mat-error *ngIf="paymentForm.get('upiId')?.hasError('pattern')">
              Please enter a valid UPI ID
            </mat-error>
          </mat-form-field>

          <!-- Card Details (for Card payments) -->
          <div *ngIf="paymentForm.get('paymentMethod')?.value === 'CARD'" class="card-details">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Card Number</mat-label>
              <input matInput formControlName="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19">
              <mat-error *ngIf="paymentForm.get('cardNumber')?.hasError('required')">
                Please enter card number
              </mat-error>
            </mat-form-field>
            
            <div class="card-row">
              <mat-form-field appearance="outline">
                <mat-label>Expiry Date</mat-label>
                <input matInput formControlName="expiryDate" placeholder="MM/YY" maxlength="5">
                <mat-error *ngIf="paymentForm.get('expiryDate')?.hasError('required')">
                  Required
                </mat-error>
              </mat-form-field>
              
              <mat-form-field appearance="outline">
                <mat-label>CVV</mat-label>
                <input matInput formControlName="cvv" placeholder="123" maxlength="4" type="password">
                <mat-error *ngIf="paymentForm.get('cvv')?.hasError('required')">
                  Required
                </mat-error>
              </mat-form-field>
            </div>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Cardholder Name</mat-label>
              <input matInput formControlName="cardholderName" placeholder="Name as on card">
              <mat-error *ngIf="paymentForm.get('cardholderName')?.hasError('required')">
                Please enter cardholder name
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Bank Selection (for Net Banking) -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="paymentForm.get('paymentMethod')?.value === 'NET_BANKING'">
            <mat-label>Select Bank</mat-label>
            <mat-select formControlName="bankCode">
              <mat-option value="SBI">State Bank of India</mat-option>
              <mat-option value="HDFC">HDFC Bank</mat-option>
              <mat-option value="ICICI">ICICI Bank</mat-option>
              <mat-option value="AXIS">Axis Bank</mat-option>
              <mat-option value="PNB">Punjab National Bank</mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('bankCode')?.hasError('required')">
              Please select your bank
            </mat-error>
          </mat-form-field>

          <!-- Wallet Selection (for Digital Wallet) -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="paymentForm.get('paymentMethod')?.value === 'WALLET'">
            <mat-label>Select Wallet</mat-label>
            <mat-select formControlName="walletType">
              <mat-option value="PAYTM">Paytm</mat-option>
              <mat-option value="PHONEPE">PhonePe</mat-option>
              <mat-option value="GPAY">Google Pay</mat-option>
              <mat-option value="AMAZONPAY">Amazon Pay</mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('walletType')?.hasError('required')">
              Please select a wallet
            </mat-error>
          </mat-form-field>

        </form>

        <!-- Payment Security Notice -->
        <div class="security-notice">
          <mat-icon color="primary">security</mat-icon>
          <div class="notice-content">
            <h4>Secure Payment</h4>
            <p>Your payment information is encrypted and secure. We do not store your payment details.</p>
          </div>
        </div>

      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                (click)="onSubmit()" 
                [disabled]="paymentForm.invalid || processing">
          <mat-spinner *ngIf="processing" diameter="20"></mat-spinner>
          <span *ngIf="!processing">Pay {{formatCurrency(bill.totalAmount)}}</span>
          <span *ngIf="processing">Processing...</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .payment-dialog {
      width: 100%;
      max-width: 600px;
    }

    .bill-summary {
      margin-bottom: 20px;
      
      h3 {
        margin: 0 0 16px 0;
        color: #333;
        font-weight: 500;
      }
      
      .bill-details {
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid #2196f3;
        
        .bill-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e0e0e0;
          
          .bill-id {
            font-weight: 600;
            color: #333;
          }
          
          .bill-date {
            color: #666;
            font-size: 0.9rem;
          }
        }
        
        .bill-items {
          margin-bottom: 16px;
          
          .bill-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
            
            &:last-child {
              border-bottom: none;
            }
            
            .item-info {
              display: flex;
              flex-direction: column;
              
              .item-description {
                font-weight: 500;
                color: #333;
                margin-bottom: 2px;
              }
              
              .item-quantity {
                font-size: 0.8rem;
                color: #666;
              }
            }
            
            .item-total {
              font-weight: 600;
              color: #333;
            }
          }
        }
        
        .bill-totals {
          border-top: 1px solid #e0e0e0;
          padding-top: 12px;
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            
            &:last-child {
              margin-bottom: 0;
            }
            
            &.final-total {
              font-weight: 600;
              font-size: 1.1rem;
              color: #333;
              border-top: 1px solid #e0e0e0;
              padding-top: 8px;
              margin-top: 8px;
            }
            
            .discount {
              color: #4caf50;
            }
          }
        }
      }
    }

    .mat-divider {
      margin: 20px 0;
    }

    .payment-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
      
      h3 {
        margin: 0 0 8px 0;
        color: #333;
        font-weight: 500;
      }
    }

    .full-width {
      width: 100%;
    }

    .card-details {
      .card-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        
        @media (max-width: 480px) {
          grid-template-columns: 1fr;
        }
      }
    }

    .security-notice {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background-color: #e8f5e8;
      border-radius: 8px;
      border-left: 4px solid #4caf50;
      
      .mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        margin-top: 2px;
      }
      
      .notice-content {
        h4 {
          margin: 0 0 4px 0;
          color: #2e7d32;
          font-weight: 500;
        }
        
        p {
          margin: 0;
          color: #388e3c;
          font-size: 0.9rem;
        }
      }
    }

    .mat-dialog-actions {
      padding: 20px 0 0 0;
      
      button {
        margin-left: 8px;
      }
    }

    .mat-raised-button {
      min-width: 160px;
      
      .mat-spinner {
        margin-right: 8px;
      }
    }
  `]
})
export class PaymentDialogComponent implements OnInit {
  paymentForm: FormGroup;
  bill: Bill;
  processing = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PaymentDialogComponent>,
    private patientService: PatientService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { bill: Bill }
  ) {
    this.bill = data.bill;
    
    this.paymentForm = this.fb.group({
      paymentMethod: ['', Validators.required],
      upiId: [''],
      cardNumber: [''],
      expiryDate: [''],
      cvv: [''],
      cardholderName: [''],
      bankCode: [''],
      walletType: ['']
    });
  }

  ngOnInit(): void {
    // Set up conditional validators
    this.onPaymentMethodChange();
  }

  onPaymentMethodChange(): void {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    
    // Clear all conditional validators
    this.paymentForm.get('upiId')?.clearValidators();
    this.paymentForm.get('cardNumber')?.clearValidators();
    this.paymentForm.get('expiryDate')?.clearValidators();
    this.paymentForm.get('cvv')?.clearValidators();
    this.paymentForm.get('cardholderName')?.clearValidators();
    this.paymentForm.get('bankCode')?.clearValidators();
    this.paymentForm.get('walletType')?.clearValidators();
    
    // Set validators based on payment method
    switch (paymentMethod) {
      case 'UPI':
        this.paymentForm.get('upiId')?.setValidators([
          Validators.required,
          Validators.pattern(/^[\w.-]+@[\w.-]+$/)
        ]);
        break;
      case 'CARD':
        this.paymentForm.get('cardNumber')?.setValidators([Validators.required]);
        this.paymentForm.get('expiryDate')?.setValidators([Validators.required]);
        this.paymentForm.get('cvv')?.setValidators([Validators.required]);
        this.paymentForm.get('cardholderName')?.setValidators([Validators.required]);
        break;
      case 'NET_BANKING':
        this.paymentForm.get('bankCode')?.setValidators([Validators.required]);
        break;
      case 'WALLET':
        this.paymentForm.get('walletType')?.setValidators([Validators.required]);
        break;
    }
    
    // Update form validation
    this.paymentForm.updateValueAndValidity();
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

  onSubmit(): void {
    if (this.paymentForm.invalid) return;
    
    this.processing = true;
    const paymentData = {
      ...this.paymentForm.value,
      amount: this.bill.totalAmount
    };
    
    this.patientService.makePayment(this.bill.id, paymentData)
      .subscribe({
        next: (result) => {
          this.processing = false;
          this.dialogRef.close(result);
          this.snackBar.open('Payment successful!', 'Close', { 
            duration: 5000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Payment error:', error);
          this.processing = false;
          this.snackBar.open('Payment failed. Please try again.', 'Close', { duration: 3000 });
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}