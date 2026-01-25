import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delay-report-dialog',
  template: `
    <h2 mat-dialog-title>Report Delay</h2>
    <div mat-dialog-content>
      <p>Delay reporting functionality will be implemented here.</p>
    </div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" mat-dialog-close>Report</button>
    </div>
  `
})
export class DelayReportDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DelayReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}