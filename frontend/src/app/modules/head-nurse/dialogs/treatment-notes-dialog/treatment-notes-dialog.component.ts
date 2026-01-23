import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TreatmentAssistance } from '../../services/head-nurse.service';

@Component({
  selector: 'app-treatment-notes-dialog',
  templateUrl: './treatment-notes-dialog.component.html',
  styleUrls: ['./treatment-notes-dialog.component.scss']
})
export class TreatmentNotesDialogComponent implements OnInit {
  notesForm: FormGroup;
  
  statusOptions = [
    { value: 'pending', label: 'Pending', description: 'Assistance not yet started' },
    { value: 'in_progress', label: 'In Progress', description: 'Currently providing assistance' },
    { value: 'completed', label: 'Completed', description: 'Assistance completed successfully' }
  ];

  assistanceCategories = [
    { value: 'chairside_assistance', label: 'Chairside Assistance' },
    { value: 'patient_preparation', label: 'Patient Preparation' },
    { value: 'sterilization_confirmation', label: 'Sterilization Confirmation' },
    { value: 'post_procedure_care', label: 'Post-Procedure Care' },
    { value: 'equipment_setup', label: 'Equipment Setup' },
    { value: 'patient_comfort', label: 'Patient Comfort' },
    { value: 'emergency_assistance', label: 'Emergency Assistance' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TreatmentNotesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { record: TreatmentAssistance }
  ) {
    this.notesForm = this.fb.group({
      assistanceProvided: ['', Validators.required],
      patientResponse: [''],
      complications: [''],
      recommendations: [''],
      status: [this.data.record.status, Validators.required],
      timestamp: [new Date()],
      notes: [this.data.record.notes || '']
    });
  }

  ngOnInit(): void {
    // Pre-fill form if editing existing notes
    if (this.data.record.notes) {
      // Parse existing notes if they're in a structured format
      this.parseExistingNotes();
    }
  }

  private parseExistingNotes(): void {
    // If notes are in a structured format, parse them
    // For now, just put them in the general notes field
    this.notesForm.patchValue({
      notes: this.data.record.notes
    });
  }

  onSubmit(): void {
    if (this.notesForm.valid) {
      const formValue = this.notesForm.value;
      
      // Combine all fields into structured notes
      const structuredNotes = this.buildStructuredNotes(formValue);
      
      const result = {
        notes: structuredNotes,
        status: formValue.status,
        timestamp: formValue.timestamp
      };
      
      this.dialogRef.close(result);
    }
  }

  private buildStructuredNotes(formValue: any): string {
    let notes = '';
    
    if (formValue.assistanceProvided) {
      notes += `Assistance Provided: ${formValue.assistanceProvided}\n\n`;
    }
    
    if (formValue.patientResponse) {
      notes += `Patient Response: ${formValue.patientResponse}\n\n`;
    }
    
    if (formValue.complications) {
      notes += `Complications/Issues: ${formValue.complications}\n\n`;
    }
    
    if (formValue.recommendations) {
      notes += `Recommendations: ${formValue.recommendations}\n\n`;
    }
    
    if (formValue.notes) {
      notes += `Additional Notes: ${formValue.notes}\n\n`;
    }
    
    notes += `Updated: ${new Date().toLocaleString()}`;
    
    return notes.trim();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getStatusColor(status: string): string {
    const colors = {
      'pending': 'accent',
      'in_progress': 'primary',
      'completed': 'primary'
    };
    return colors[status] || 'basic';
  }

  getAssistanceTypeIcon(type: string): string {
    const icons = {
      'chairside_assistance': 'medical_services',
      'patient_preparation': 'person_pin',
      'sterilization_confirmation': 'cleaning_services',
      'post_procedure_care': 'healing',
      'equipment_setup': 'build',
      'patient_comfort': 'favorite',
      'emergency_assistance': 'emergency'
    };
    return icons[type] || 'help_outline';
  }
}