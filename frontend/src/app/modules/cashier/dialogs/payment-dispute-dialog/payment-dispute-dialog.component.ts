import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-payment-dispute-dialog',
  template: `
    <div class="payment-dispute-dialog">
      <h2 mat-dialog-title>Payment Dispute</h2>
      <mat-dialog-content>
        <p>Payment dispute dialog - To be implemented</p>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button (click)="onClose()">Close</button>
      </mat-dialog-actions>
    </div>
  `
})
export class PaymentDisputeDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<PaymentDisputeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}