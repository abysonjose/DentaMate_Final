import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-create-branch-dialog',
  template: `
    <h2 mat-dialog-title>Create New Branch</h2>
    <mat-dialog-content>
      <p>Create branch dialog functionality coming soon...</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Create</button>
    </mat-dialog-actions>
  `
})
export class CreateBranchDialogComponent {
  constructor(private dialogRef: MatDialogRef<CreateBranchDialogComponent>) {}
  
  onCancel(): void {
    this.dialogRef.close();
  }
}