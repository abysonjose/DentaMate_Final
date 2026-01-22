import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthApiService, Tenant } from '../../services/auth-api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  tenants: Tenant[] = [];
  isLoading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private authApiService: AuthApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      tenantId: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadTenants();
    
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  loadTenants(): void {
    // For now, use mock data. Later connect to real API
    this.tenants = [
      { id: '1', name: 'Demo Dental Clinic', domain: 'demo', isActive: true },
      { id: '2', name: 'City Dental Care', domain: 'city', isActive: true },
      { id: '3', name: 'Smile Dental Center', domain: 'smile', isActive: true }
    ];
    
    // Uncomment when tenant API is ready
    // this.authApiService.getTenants().subscribe({
    //   next: (tenants) => {
    //     this.tenants = tenants.filter(t => t.isActive);
    //   },
    //   error: (error) => {
    //     console.error('Failed to load tenants:', error);
    //     this.showError('Failed to load clinic list');
    //   }
    // });
  }

  onLogin(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      const credentials = this.loginForm.value;

      this.authApiService.login(credentials).subscribe({
        next: (response) => {
          if (response.success) {
            this.authService.setAuthData(response.user, response.tokens);
            this.showSuccess('Login successful!');
            this.router.navigate(['/dashboard']);
          } else {
            this.showError('Login failed. Please try again.');
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Login error:', error);
          this.showError(error.error?.message || 'Login failed. Please check your credentials.');
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field?.hasError('minlength')) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  }
}