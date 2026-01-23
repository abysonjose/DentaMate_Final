import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-supply-report-dialog',
  template: `
    <h2 mat-dialog-title>Report Supply Issue</h2>
    <mat-dialog-content>
      <p>Supply report dialog will be implemented here.</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Report</button>
    </mat-dialog-actions>
  `
})
export class SupplyReportDialogComponent {
  constructor(private dialogRef: MatDialogRef<SupplyReportDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close();
  }
}