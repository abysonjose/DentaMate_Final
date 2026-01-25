import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-communication-log-dialog',
  template: `
    <div class="communication-log-dialog">
      <h2 mat-dialog-title>Log Communication</h2>
      <mat-dialog-content>
        <p>Communication logging functionality - Implementation in progress</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary">Log</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .communication-log-dialog {
      min-width: 500px;
    }
  `]
})
export class CommunicationLogDialogComponent {
  constructor(private dialogRef: MatDialogRef<CommunicationLogDialogComponent>) {}
}