import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-incident-report-dialog',
  template: `
    <h2 mat-dialog-title>Report Incident</h2>
    <mat-dialog-content>
      <p>Incident report dialog functionality coming soon...</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Submit Report</button>
    </mat-dialog-actions>
  `
})
export class IncidentReportDialogComponent {
  constructor(private dialogRef: MatDialogRef<IncidentReportDialogComponent>) {}
  
  onCancel(): void {
    this.dialogRef.close();
  }
}