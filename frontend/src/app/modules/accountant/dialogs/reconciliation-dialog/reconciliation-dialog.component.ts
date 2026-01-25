import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentRecord } from '../../services/accountant.service';

@Component({
  selector: 'app-reconciliation-dialog',
  templateUrl: './reconciliation-dialog.component.html',
  styleUrls: ['./reconciliation-dialog.component.scss']
})
export class ReconciliationDialogComponent {
  reconciliationForm: FormGroup;

  statusOptions = [
    { value: 'MATCHED', label: 'Matched', icon: 'check_circle', color: 'success' },
    { value: 'PENDING', label: 'Pending', icon: 'schedule', color: 'warning' },
    { value: 'FLAGGED', label: 'Flagged', icon: 'flag', color: 'danger' }
  ];

  constructor(
    public dialogRef: MatDialogRef<ReconciliationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { record: PaymentRecord },
    private fb: FormBuilder
  ) {
    this.reconciliationForm = this.fb.group({
      status: [data.record.reconciliationStatus, Validators.required],
      notes: [data.record.notes || '']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.reconciliationForm.valid) {
      this.dialogRef.close(this.reconciliationForm.value);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
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