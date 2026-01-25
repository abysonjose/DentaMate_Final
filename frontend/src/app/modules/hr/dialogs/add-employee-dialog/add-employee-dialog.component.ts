import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmployeeService, CreateEmployeeRequest } from '../../services/employee.service';

export interface AddEmployeeDialogData {
  roles: string[];
  departments: string[];
  branches: any[];
}

@Component({
  selector: 'app-add-employee-dialog',
  templateUrl: './add-employee-dialog.component.html',
  styleUrls: ['./add-employee-dialog.component.scss']
})
export class AddEmployeeDialogComponent implements OnInit {
  employeeForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<AddEmployeeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddEmployeeDialogData
  ) {
    this.employeeForm = this.createForm();
  }

  ngOnInit(): void {}

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s-()]+$/)]],
      role: ['', Validators.required],
      department: ['', Validators.required],
      branch: ['', Validators.required],
      joiningDate: [new Date(), Validators.required],
      emergencyContact: this.fb.group({
        name: [''],
        phone: [''],
        relationship: ['']
      })
    });
  }

  onSubmit(): void {
    if (this.employeeForm.valid) {
      this.loading = true;
      const formValue = this.employeeForm.value;
      
      const employeeData: CreateEmployeeRequest = {
        name: formValue.name,
        email: formValue.email,
        phone: formValue.phone,
        role: formValue.role,
        department: formValue.department,
        branch: formValue.branch,
        joiningDate: formValue.joiningDate,
        emergencyContact: formValue.emergencyContact.name ? formValue.emergencyContact : undefined
      };

      this.employeeService.createEmployee(employeeData).subscribe({
        next: (employee) => {
          this.loading = false;
          this.snackBar.open('Employee added successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(employee);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error creating employee:', error);
          this.snackBar.open('Error adding employee', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.employeeForm.controls).forEach(key => {
      const control = this.employeeForm.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(nestedKey => {
          control.get(nestedKey)?.markAsTouched();
        });
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.employeeForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email';
    }
    if (control?.hasError('minlength')) {
      return `${fieldName} must be at least ${control.errors?.['minlength'].requiredLength} characters`;
    }
    if (control?.hasError('pattern')) {
      return 'Please enter a valid phone number';
    }
    return '';
  }
}