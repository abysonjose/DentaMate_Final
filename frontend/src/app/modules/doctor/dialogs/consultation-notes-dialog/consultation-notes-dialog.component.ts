import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-consultation-notes-dialog',
  template: `
    <h2 mat-dialog-title>Consultation Notes</h2>
    <mat-dialog-content>
      <p>Dialog for managing consultation notes.</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-button (click)="onSave()">Save</button>
    </mat-dialog-actions>
  `
})
export class ConsultationNotesDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConsultationNotesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close(true);
  }
}