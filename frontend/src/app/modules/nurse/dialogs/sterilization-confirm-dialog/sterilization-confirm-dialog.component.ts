import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-sterilization-confirm-dialog',
  template: `
    <h2 mat-dialog-title>Confirm Sterilization</h2>
    <mat-dialog-content>
      <p>Sterilization confirmation dialog will be implemented here.</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Confirm</button>
    </mat-dialog-actions>
  `
})
export class SterilizationConfirmDialogComponent {
  constructor(private dialogRef: MatDialogRef<SterilizationConfirmDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close();
  }
}