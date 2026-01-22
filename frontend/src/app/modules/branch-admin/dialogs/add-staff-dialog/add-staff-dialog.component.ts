import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add-staff-dialog',
  template: `
    <h2 mat-dialog-title>Add New Staff Member</h2>
    <mat-dialog-content>
      <p>Add staff dialog functionality coming soon...</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Add Staff</button>
    </mat-dialog-actions>
  `
})
export class AddStaffDialogComponent {
  constructor(private dialogRef: MatDialogRef<AddStaffDialogComponent>) {}
  
  onCancel(): void {
    this.dialogRef.close();
  }
}