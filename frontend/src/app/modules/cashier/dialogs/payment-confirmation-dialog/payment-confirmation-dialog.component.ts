import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { 
  CashierPaymentService, 
  PendingPayment, 
  PaymentRequest 
} from '../../services/cashier-payment.service';

export interface PaymentDialogData {
  payment: PendingPayment;
}

@Component({
  selector: 'app-payment-confirmation-dialog',
  templateUrl: './payment-confirmation-dialog.component.html',
  styleUrls: ['./payment-confirmation-dialog.component.scss']
})
export class PaymentConfirmationDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  paymentForm: FormGroup;
  isProcessing = false;
  isSimulating = false;
  error: string | null = null;
  
  payment: PendingPayment;
  currentStep = 1; // 1: Payment Details, 2: Confirmation, 3: Processing
  
  paymentMethods = [
    { value: 'cash', label: 'Cash', icon: 'payments', description: 'Cash payment' },
    { value: 'upi', label: 'UPI', icon: 'qr_code', description: 'UPI payment (PhonePe, GPay, etc.)' },
    { value: 'card', label: 'Card', icon: 'credit_card', description: 'Credit/Debit card' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: 'account_balance', description: 'Direct bank transfer' },
    { value: 'cheque', label: 'Cheque', icon: 'receipt', description: 'Cheque payment' }
  ];

  simulationResult: {
    success: boolean;
    transactionId?: string;
    message: string;
    processingTime: number;
  } | null = null;

  constructor(
    private dialogRef: MatDialogRef<PaymentConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentDialogData,
    private fb: FormBuilder,
    private paymentService: CashierPaymentService,
    private snackBar: MatSnackBar
  ) {
    this.payment = data.payment;
    this.paymentForm = this.createForm();
  }

  ngOnInit(): void {
    // Set default payment amount to balance amount
    this.paymentForm.patchValue({
      amount: this.payment.balanceAmount
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      amount: [0, [Validators.required, Validators.min(0.01), Validators.max(this.payment.balanceAmount)]],
      paymentMethod: ['cash', Validators.required],
      transactionId: [''],
      cardLast4: [''],
      upiId: [''],
      chequeNumber: [''],
      bankName: [''],
      reference: [''],
      notes: ['']
    });
  }

  onPaymentMethodChange(): void {
    const method = this.paymentForm.get('paymentMethod')?.value;
    
    // Clear method-specific fields
    this.paymentForm.patchValue({
      transactionId: '',
      cardLast4: '',
      upiId: '',
      chequeNumber: '',
      bankName: '',
      reference: ''
    });

    // Set validators based on payment method
    this.setMethodSpecificValidators(method);
  }

  private setMethodSpecificValidators(method: string): void {
    const transactionIdControl = this.paymentForm.get('transactionId');
    const cardLast4Control = this.paymentForm.get('cardLast4');
    const upiIdControl = this.paymentForm.get('upiId');
    const chequeNumberControl = this.paymentForm.get('chequeNumber');
    const bankNameControl = this.paymentForm.get('bankName');

    // Clear all validators first
    [transactionIdControl, cardLast4Control, upiIdControl, chequeNumberControl, bankNameControl]
      .forEach(control => {
        control?.clearValidators();
        control?.updateValueAndValidity();
      });

    // Set method-specific validators
    switch (method) {
      case 'upi':
        upiIdControl?.setValidators([Validators.required]);
        break;
      case 'card':
        cardLast4Control?.setValidators([Validators.required, Validators.pattern(/^\d{4}$/)]);
        break;
      case 'bank_transfer':
        bankNameControl?.setValidators([Validators.required]);
        transactionIdControl?.setValidators([Validators.required]);
        break;
      case 'cheque':
        chequeNumberControl?.setValidators([Validators.required]);
        bankNameControl?.setValidators([Validators.required]);
        break;
    }

    // Update validity
    [transactionIdControl, cardLast4Control, upiIdControl, chequeNumberControl, bankNameControl]
      .forEach(control => control?.updateValueAndValidity());
  }

  proceedToConfirmation(): void {
    if (this.paymentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }
    this.currentStep = 2;
  }

  backToDetails(): void {
    this.currentStep = 1;
  }

  simulatePayment(): void {
    const method = this.paymentForm.get('paymentMethod')?.value;
    const amount = this.paymentForm.get('amount')?.value;

    if (method === 'cash') {
      // Cash doesn't need simulation
      this.processPayment();
      return;
    }

    this.isSimulating = true;
    this.error = null;

    this.paymentService.simulatePayment(method, amount)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.simulationResult = result;
          this.isSimulating = false;
          
          if (result.success && result.transactionId) {
            this.paymentForm.patchValue({
              transactionId: result.transactionId
            });
            this.currentStep = 3;
          } else {
            this.error = result.message;
          }
        },
        error: (error) => {
          console.error('Error simulating payment:', error);
          this.error = 'Payment simulation failed. Please try again.';
          this.isSimulating = false;
        }
      });
  }

  processPayment(): void {
    if (this.paymentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isProcessing = true;
    this.error = null;

    const formValue = this.paymentForm.value;
    const paymentRequest: PaymentRequest = {
      invoiceId: this.payment.invoiceId,
      amount: formValue.amount,
      paymentMethod: formValue.paymentMethod,
      paymentDetails: {
        transactionId: formValue.transactionId,
        cardLast4: formValue.cardLast4,
        upiId: formValue.upiId,
        chequeNumber: formValue.chequeNumber,
        bankName: formValue.bankName,
        reference: formValue.reference
      },
      notes: formValue.notes
    };

    this.paymentService.processPayment(paymentRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isProcessing = false;
          this.snackBar.open('Payment processed successfully', 'Close', { duration: 3000 });
          this.dialogRef.close('paid');
        },
        error: (error) => {
          console.error('Error processing payment:', error);
          this.error = 'Failed to process payment. Please try again.';
          this.isProcessing = false;
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.paymentForm.controls).forEach(key => {
      const control = this.paymentForm.get(key);
      control?.markAsTouched();
    });
  }

  getSelectedPaymentMethod() {
    const methodValue = this.paymentForm.get('paymentMethod')?.value;
    return this.paymentMethods.find(m => m.value === methodValue);
  }

  isPartialPayment(): boolean {
    const amount = this.paymentForm.get('amount')?.value || 0;
    return amount < this.payment.balanceAmount;
  }

  getRemainingBalance(): number {
    const amount = this.paymentForm.get('amount')?.value || 0;
    return this.payment.balanceAmount - amount;
  }

  canProceedToConfirmation(): boolean {
    return this.paymentForm.valid && this.currentStep === 1;
  }

  canSimulatePayment(): boolean {
    const method = this.paymentForm.get('paymentMethod')?.value;
    return this.currentStep === 2 && 
           !this.isSimulating && 
           method !== 'cash';
  }

  canProcessPayment(): boolean {
    const method = this.paymentForm.get('paymentMethod')?.value;
    return (this.currentStep === 2 && method === 'cash') ||
           (this.currentStep === 3 && this.simulationResult?.success);
  }

  close(): void {
    this.dialogRef.close();
  }

  getStepTitle(): string {
    switch (this.currentStep) {
      case 1:
        return 'Payment Details';
      case 2:
        return 'Confirm Payment';
      case 3:
        return 'Process Payment';
      default:
        return 'Payment';
    }
  }
}