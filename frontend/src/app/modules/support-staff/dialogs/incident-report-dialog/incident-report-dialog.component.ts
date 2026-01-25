import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-incident-report-dialog',
  template: `
    <h2 mat-dialog-title>Report Incident</h2>
    <mat-dialog-content>
      <div class="coming-soon">
        <mat-icon>construction</mat-icon>
        <p>Incident reporting features will be available soon.</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .coming-soon { text-align: center; padding: 40px 20px; color: #666; }
    .coming-soon .mat-icon { font-size: 48px; color: #ff9800; margin-bottom: 16px; }
  `]
})
export class IncidentReportDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<IncidentReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }
}