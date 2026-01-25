import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-document-upload-dialog',
  template: `
    <div class="document-upload-dialog">
      <h2 mat-dialog-title>Upload Document</h2>
      <mat-dialog-content>
        <p>Document upload functionality - Implementation in progress</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary">Upload</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .document-upload-dialog {
      min-width: 400px;
    }
  `]
})
export class DocumentUploadDialogComponent {
  constructor(private dialogRef: MatDialogRef<DocumentUploadDialogComponent>) {}
}