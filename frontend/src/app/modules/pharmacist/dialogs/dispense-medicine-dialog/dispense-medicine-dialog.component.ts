import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-dispense-medicine-dialog',
  template: `
    <div mat-dialog-title>Dispense Medicine</div>
    <div mat-dialog-content>
      <p>Medicine dispensing dialog will be implemented here.</p>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Dispense</button>
    </div>
  `
})
export class DispenseMedicineDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DispenseMedicineDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }
}