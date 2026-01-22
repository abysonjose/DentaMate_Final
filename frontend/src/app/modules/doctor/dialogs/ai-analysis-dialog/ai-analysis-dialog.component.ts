import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-ai-analysis-dialog',
  template: `
    <h2 mat-dialog-title>AI Analysis Results</h2>
    <mat-dialog-content>
      <p>Dialog for displaying AI diagnostic analysis results.</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onClose()">Close</button>
      <button mat-button (click)="onAccept()">Accept Analysis</button>
    </mat-dialog-actions>
  `
})
export class AiAnalysisDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<AiAnalysisDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  onAccept(): void {
    this.dialogRef.close(true);
  }
}