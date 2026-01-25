import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delivery-schedule-dialog',
  template: `
    <h2 mat-dialog-title>Schedule Delivery</h2>
    <div mat-dialog-content>
      <p>Delivery scheduling functionality will be implemented here.</p>
    </div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" mat-dialog-close>Save</button>
    </div>
  `
})
export class DeliveryScheduleDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeliveryScheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}