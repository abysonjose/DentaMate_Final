import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuditLog } from '../../services/accountant.service';

@Component({
  selector: 'app-audit-note-dialog',
  templateUrl: './audit-note-dialog.component.html',
  styleUrls: ['./audit-note-dialog.component.scss']
})
export class AuditNoteDialogComponent {
  noteForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<AuditNoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { log: AuditLog },
    private fb: FormBuilder
  ) {
    this.noteForm = this.fb.group({
      note: [data.log.notes || '', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.noteForm.valid) {
      this.dialogRef.close(this.noteForm.value);
    }
  }

  getActionIcon(action: string): string {
    const actionIcons: { [key: string]: string } = {
      'CREATE': 'add_circle',
      'UPDATE': 'edit',
      'DELETE': 'delete',
      'VIEW': 'visibility',
      'EXPORT': 'download',
      'LOGIN': 'login',
      'LOGOUT': 'logout'
    };
    return actionIcons[action] || 'info';
  }

  getActionColor(action: string): string {
    const actionColors: { [key: string]: string } = {
      'CREATE': 'success',
      'UPDATE': 'primary',
      'DELETE': 'warn',
      'VIEW': 'accent',
      'EXPORT': 'primary',
      'LOGIN': 'success',
      'LOGOUT': 'warn'
    };
    return actionColors[action] || 'default';
  }
}