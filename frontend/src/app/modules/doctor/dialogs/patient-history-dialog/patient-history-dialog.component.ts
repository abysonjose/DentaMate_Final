import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-patient-history-dialog',
  template: `
    <h2 mat-dialog-title>Patient History</h2>
    <mat-dialog-content>
      <p>Dialog for viewing detailed patient medical history.</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onClose()">Close</button>
    </mat-dialog-actions>
  `
})
export class PatientHistoryDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<PatientHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}