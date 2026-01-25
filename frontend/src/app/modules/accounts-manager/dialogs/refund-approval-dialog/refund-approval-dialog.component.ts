import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RefundData } from '../../services/accounts-manager.service';

export interface RefundApprovalDialogData {
  refund: RefundData;
  action: 'approve' | 'reject';
}

@Component({
  selector: 'app-refund-approval-dialog',
  templateUrl: './refund-approval-dialog.component.html',
  styleUrls: ['./refund-approval-dialog.component.scss']
})
export class RefundApprovalDialogComponent {
  approvalForm: FormGroup;
  isApproval: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RefundApprovalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RefundApprovalDialogData
  ) {
    this.isApproval = data.action === 'approve';
    
    this.approvalForm = this.fb.group({
      notes: ['', this.isApproval ? [] : [Validators.required]],
      reason: ['', this.isApproval ? [] : [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.approvalForm.valid) {
      const result = this.isApproval 
        ? { notes: this.approvalForm.value.notes }
        : { reason: this.approvalForm.value.reason, notes: this.approvalForm.value.notes };
      
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}