import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-edit-user-dialog',
  template: `
    <h2 mat-dialog-title>Edit User</h2>
    <mat-dialog-content>
      <p>Edit user dialog functionality coming soon...</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Save</button>
    </mat-dialog-actions>
  `
})
export class EditUserDialogComponent {
  constructor(private dialogRef: MatDialogRef<EditUserDialogComponent>) {}
  
  onCancel(): void {
    this.dialogRef.close();
  }
}