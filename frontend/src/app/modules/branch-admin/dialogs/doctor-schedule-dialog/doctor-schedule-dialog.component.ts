import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-doctor-schedule-dialog',
  template: `
    <h2 mat-dialog-title>Doctor Schedule</h2>
    <mat-dialog-content>
      <p>Doctor schedule dialog functionality coming soon...</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Save Schedule</button>
    </mat-dialog-actions>
  `
})
export class DoctorScheduleDialogComponent {
  constructor(private dialogRef: MatDialogRef<DoctorScheduleDialogComponent>) {}
  
  onCancel(): void {
    this.dialogRef.close();
  }
}