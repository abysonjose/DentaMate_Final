import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PayrollOfficerService } from '../../services/payroll-officer.service';

@Component({
  selector: 'app-create-payroll-cycle-dialog',
  templateUrl: './create-payroll-cycle-dialog.component.html',
  styleUrls: ['./create-payroll-cycle-dialog.component.scss']
})
export class CreatePayrollCycleDialogComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  
  months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];
  
  currentYear = new Date().getFullYear();
  years = Array.from({ length: 5 }, (_, i) => this.currentYear - 2 + i);

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollOfficerService,
    private dialogRef: MatDialogRef<CreatePayrollCycleDialogComponent>,
    private snackBar: MatSnackBar
  ) {
    this.form = this.createForm();
  }

  ngOnInit(): void {
    this.setDefaultValues();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      month: ['', [Validators.required]],
      year: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      description: ['']
    });
  }

  private setDefaultValues(): void {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Set default to current month
    this.form.patchValue({
      month: currentMonth,
      year: currentYear
    });
    
    this.updateDateRange();
  }

  onMonthYearChange(): void {
    this.updateDateRange();
  }

  private updateDateRange(): void {
    const month = this.form.get('month')?.value;
    const year = this.form.get('year')?.value;
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      this.form.patchValue({
        startDate: startDate,
        endDate: endDate
      });
    }
  }

  onSubmit(): void {
    if (this.form.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const formValue = this.form.value;
      const cycleData = {
        month: formValue.month,
        year: formValue.year,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        status: 'draft' as const,
        description: formValue.description || `Payroll cycle for ${this.getMonthName(formValue.month)} ${formValue.year}`
      };

      this.payrollService.createPayrollCycle(cycleData).subscribe({
        next: (result) => {
          this.snackBar.open('Payroll cycle created successfully', 'OK', { duration: 3000 });
          this.dialogRef.close(result);
        },
        error: (error) => {
          console.error('Error creating payroll cycle:', error);
          const message = error.error?.message || 'Error creating payroll cycle';
          this.snackBar.open(message, 'Close', { duration: 5000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private getMonthName(monthNumber: number): string {
    const month = this.months.find(m => m.value === monthNumber);
    return month ? month.name : '';
  }

  // Validation helpers
  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName} is required`;
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}