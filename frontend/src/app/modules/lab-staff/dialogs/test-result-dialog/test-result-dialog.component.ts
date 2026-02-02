import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LabStaffService } from '../../services/lab-staff.service';

@Component({
  selector: 'app-test-result-dialog',
  templateUrl: './test-result-dialog.component.html',
  styleUrls: ['./test-result-dialog.component.scss']
})
export class TestResultDialogComponent implements OnInit {
  resultForm: FormGroup;
  isSubmitting = false;
  testTemplate: any = null;

  constructor(
    private fb: FormBuilder,
    private labStaffService: LabStaffService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<TestResultDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { testId: string; testName: string; patientName: string }
  ) {
    this.resultForm = this.fb.group({
      results: this.fb.group({}),
      notes: [''],
      abnormalFindings: [''],
      recommendations: [''],
      status: ['completed', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTestDetails();
  }

  private loadTestDetails(): void {
    this.labStaffService.getTestDetails(this.data.testId).subscribe({
      next: (response) => {
        if (response.success && response.data.template) {
          this.testTemplate = response.data.template;
          this.buildResultForm();
        }
      },
      error: (error) => {
        console.error('Error loading test details:', error);
        // Use default form if template loading fails
        this.buildDefaultForm();
      }
    });
  }

  private buildResultForm(): void {
    const resultsGroup = this.fb.group({});
    
    if (this.testTemplate && this.testTemplate.parameters) {
      this.testTemplate.parameters.forEach((param: any) => {
        const validators = [];
        if (param.required) validators.push(Validators.required);
        if (param.min !== undefined) validators.push(Validators.min(param.min));
        if (param.max !== undefined) validators.push(Validators.max(param.max));
        
        resultsGroup.addControl(param.name, this.fb.control('', validators));
      });
    }

    this.resultForm.setControl('results', resultsGroup);
  }

  private buildDefaultForm(): void {
    // Default form for common lab tests
    const resultsGroup = this.fb.group({
      value: ['', Validators.required],
      unit: [''],
      referenceRange: [''],
      interpretation: ['']
    });

    this.resultForm.setControl('results', resultsGroup);
  }

  onSubmit(): void {
    if (this.resultForm.valid) {
      this.isSubmitting = true;
      
      const testResult = {
        testId: this.data.testId,
        results: this.resultForm.get('results')?.value,
        notes: this.resultForm.get('notes')?.value,
        abnormalFindings: this.resultForm.get('abnormalFindings')?.value,
        recommendations: this.resultForm.get('recommendations')?.value
      };

      this.labStaffService.submitTestResults(testResult).subscribe({
        next: (response) => {
          if (response.success) {
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Error submitting test results', 'Close', { duration: 3000 });
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error submitting test results:', error);
          this.snackBar.open('Error submitting test results', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getParameterType(param: any): string {
    return param.type || 'text';
  }

  getParameterValidationError(paramName: string): string {
    const control = this.resultForm.get('results')?.get(paramName);
    if (control?.errors?.['required']) return 'This field is required';
    if (control?.errors?.['min']) return `Value must be at least ${control.errors['min'].min}`;
    if (control?.errors?.['max']) return `Value must be at most ${control.errors['max'].max}`;
    return '';
  }
}