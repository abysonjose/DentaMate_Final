import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthApiService, Tenant } from '../../services/auth-api.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  tenants: Tenant[] = [];
  roles = [
    { value: 'patient', label: 'Patient' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'receptionist', label: 'Receptionist' },
    { value: 'admin', label: 'Administrator' }
  ];
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private authApiService: AuthApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      tenantId: ['', Validators.required],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['patient', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadTenants();
    
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  loadTenants(): void {
    this.authApiService.getTenants().subscribe({
      next: (tenants) => {
        this.tenants = tenants.filter(t => t.isActive);
      },
      error: (error) => {
        console.error('Failed to load tenants:', error);
        // Fallback to mock data if API fails
        this.tenants = [
          { id: '1', name: 'Demo Dental Clinic', domain: 'demo', isActive: true },
          { id: '2', name: 'City Dental Care', domain: 'city', isActive: true },
          { id: '3', name: 'Smile Dental Center', domain: 'smile', isActive: true }
        ];
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else if (confirmPassword?.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }
    
    return null;
  }

  onRegister(): void {
    if (this.registerForm.valid && !this.isLoading) {
      this.isLoading = true;
      const userData = { ...this.registerForm.value };
      delete userData.confirmPassword; // Remove confirmPassword before sending

      this.authApiService.register(userData).subscribe({
        next: (response) => {
          if (response.success) {
            this.authService.setAuthData(response.user, response.tokens);
            this.showSuccess('Registration successful! Welcome to DentaMate.');
            this.router.navigate(['/dashboard']);
          } else {
            this.showError('Registration failed. Please try again.');
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Registration error:', error);
          this.showError(error.error?.message || 'Registration failed. Please try again.');
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength']?.requiredLength;
      return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters long`;
    }
    if (field?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      tenantId: 'Clinic/Organization',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      role: 'Role',
      password: 'Password',
      confirmPassword: 'Confirm password'
    };
    return labels[fieldName] || fieldName;
  }
}