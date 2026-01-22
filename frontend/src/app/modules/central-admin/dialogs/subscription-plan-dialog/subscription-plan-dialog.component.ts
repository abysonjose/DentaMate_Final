import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-subscription-plan-dialog',
  template: `
    <h2 mat-dialog-title>Subscription Plan</h2>
    <mat-dialog-content>
      <p>Subscription plan dialog functionality coming soon...</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary">Save</button>
    </mat-dialog-actions>
  `
})
export class SubscriptionPlanDialogComponent {
  constructor(private dialogRef: MatDialogRef<SubscriptionPlanDialogComponent>) {}
  
  onCancel(): void {
    this.dialogRef.close();
  }
}