import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-compliance-checklist-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon>checklist</mat-icon>
      Compliance Checklist
    </h2>
    <mat-dialog-content>
      <div class="coming-soon">
        <mat-icon>construction</mat-icon>
        <p>Compliance checklist features will be available soon.</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; }
    .coming-soon { text-align: center; padding: 40px 20px; color: #666; }
    .coming-soon .mat-icon { font-size: 48px; color: #ff9800; margin-bottom: 16px; }
  `]
})
export class ComplianceChecklistDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ComplianceChecklistDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }
}