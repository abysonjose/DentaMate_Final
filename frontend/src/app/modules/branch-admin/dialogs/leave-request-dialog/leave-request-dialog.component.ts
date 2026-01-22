import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-leave-request-dialog',
  template: `
    <h2 mat-dialog-title>Leave Request</h2>
    <mat-dialog-content>
      <p>Leave request dialog functionality coming soon...</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Process Request</button>
    </mat-dialog-actions>
  `
})
export class LeaveRequestDialogComponent {
  constructor(private dialogRef: MatDialogRef<LeaveRequestDialogComponent>) {}
  
  onCancel(): void {
    this.dialogRef.close();
  }
}