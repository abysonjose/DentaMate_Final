import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NurseService } from '../../services/nurse.service';

@Component({
  selector: 'app-care-notes-dialog',
  templateUrl: './care-notes-dialog.component.html',
  styleUrls: ['./care-notes-dialog.component.scss']
})
export class CareNotesDialogComponent implements OnInit {
  careNotesForm: FormGroup;
  isSubmitting = false;

  noteTypes = [
    { value: 'observation', label: 'General Observation' },
    { value: 'medication', label: 'Medication Administration' },
    { value: 'procedure', label: 'Procedure/Treatment' },
    { value: 'assessment', label: 'Patient Assessment' },
    { value: 'education', label: 'Patient Education' },
    { value: 'discharge', label: 'Discharge Planning' },
    { value: 'incident', label: 'Incident Report' },
    { value: 'other', label: 'Other' }
  ];

  priorities = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  constructor(
    private fb: FormBuilder,
    private nurseService: NurseService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CareNotesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { patientId: string; patientName: string }
  ) {
    this.careNotesForm = this.fb.group({
      type: ['observation', Validators.required],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      priority: ['normal', Validators.required]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.careNotesForm.valid) {
      this.isSubmitting = true;
      
      const careNoteData = {
        patientId: this.data.patientId,
        ...this.careNotesForm.value
      };

      this.nurseService.addCareNote(careNoteData).subscribe({
        next: (response) => {
          if (response.success) {
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Error adding care note', 'Close', { duration: 3000 });
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error adding care note:', error);
          this.snackBar.open('Error adding care note', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getDescriptionCharacterCount(): number {
    return this.careNotesForm.get('description')?.value?.length || 0;
  }

  getTitleCharacterCount(): number {
    return this.careNotesForm.get('title')?.value?.length || 0;
  }
}