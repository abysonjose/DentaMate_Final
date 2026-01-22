import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-lab-request-dialog',
  template: `
    <h2 mat-dialog-title>Lab Request</h2>
    <mat-dialog-content>
      <p>Dialog for creating lab test requests.</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-button (click)="onSave()">Create Request</button>
    </mat-dialog-actions>
  `
})
export class LabRequestDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<LabRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close(true);
  }
}