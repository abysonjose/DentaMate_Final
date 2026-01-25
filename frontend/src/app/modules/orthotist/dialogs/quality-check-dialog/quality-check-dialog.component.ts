import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-quality-check-dialog',
  template: `
    <h2 mat-dialog-title>Quality Check</h2>
    <div mat-dialog-content>
      <p>Quality check functionality will be implemented here.</p>
    </div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" mat-dialog-close>Save</button>
    </div>
  `
})
export class QualityCheckDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<QualityCheckDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}