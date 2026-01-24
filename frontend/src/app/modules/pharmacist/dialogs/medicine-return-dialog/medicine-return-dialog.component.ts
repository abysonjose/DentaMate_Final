import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-medicine-return-dialog',
  template: `
    <div mat-dialog-title>Medicine Return</div>
    <div mat-dialog-content>
      <p>Medicine return dialog will be implemented here.</p>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Process Return</button>
    </div>
  `
})
export class MedicineReturnDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MedicineReturnDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }
}