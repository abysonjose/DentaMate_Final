import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-receipt-dialog',
  template: `
    <div class="receipt-dialog">
      <h2 mat-dialog-title>Receipt</h2>
      <mat-dialog-content>
        <p>Receipt dialog - To be implemented</p>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button (click)="onClose()">Close</button>
      </mat-dialog-actions>
    </div>
  `
})
export class ReceiptDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ReceiptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}