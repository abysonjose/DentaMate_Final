import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthApiService, Tenant } from '../../services/auth-api.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  tenants: Tenant[] = [];
  isLoading = false;
  emailSent = false;

  constructor(
    private fb: FormBuilder,
    private authApiService: AuthApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.forgotPasswordForm = this.fb.group({
      tenantId: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadTenants();
  }

  loadTenants(): void {
    this.authApiService.getTenants().subscribe({
      next: (tenants) => {
        this.tenants = tenants.filter(t => t.isActive);
      },
      error: (error) => {
        console.error('Failed to load tenants:', error);
        // Fallback to mock data
        this.tenants = [
          { id: '1', name: 'Demo Dental Clinic', domain: 'demo', isActive: true },
          { id: '2', name: 'City Dental Care', domain: 'city', isActive: true },
          { id: '3', name: 'Smile Dental Center', domain: 'smile', isActive: true }
        ];
      }
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid && !this.isLoading) {
      this.isLoading = true;
      const { email, tenantId } = this.forgotPasswordForm.value;

      this.authApiService.requestPasswordReset(email, tenantId).subscribe({
        next: (response) => {
          this.emailSent = true;
          this.showSuccess('Password reset instructions have been sent to your email.');
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Password reset error:', error);
          this.showError(error.error?.message || 'Failed to send password reset email. Please try again.');
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onBackToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      this.forgotPasswordForm.get(key)?.markAsTouched();
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}