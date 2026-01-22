import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-create-clinic-dialog',
  templateUrl: './create-clinic-dialog.component.html',
  styleUrls: ['./create-clinic-dialog.component.scss']
})
export class CreateClinicDialogComponent implements OnInit {
  clinicForm: FormGroup;
  
  subscriptionPlans = [
    { value: 'basic', label: 'Basic Plan - $99/month' },
    { value: 'professional', label: 'Professional Plan - $199/month' },
    { value: 'enterprise', label: 'Enterprise Plan - $399/month' },
    { value: 'custom', label: 'Custom Plan' }
  ];
  
  timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' }
  ];
  
  currencies = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' }
  ];
  
  languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' }
  ];
  
  availableFeatures = [
    { value: 'ai-diagnosis', label: 'AI Diagnosis', description: 'X-ray analysis and cavity detection' },
    { value: 'ocr-scanning', label: 'OCR Scanning', description: 'Prescription text recognition' },
    { value: 'realtime-queue', label: 'Real-time Queue', description: 'Live patient queue management' },
    { value: 'advanced-analytics', label: 'Advanced Analytics', description: 'Detailed reports and insights' },
    { value: 'multi-branch', label: 'Multi-branch Support', description: 'Manage multiple clinic locations' },
    { value: 'telemedicine', label: 'Telemedicine', description: 'Virtual consultations' },
    { value: 'inventory-management', label: 'Inventory Management', description: 'Stock and supply tracking' },
    { value: 'billing-integration', label: 'Billing Integration', description: 'Advanced billing features' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateClinicDialogComponent>
  ) {
    this.clinicForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      domain: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      address: this.fb.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
        country: ['USA', Validators.required]
      }),
      subscriptionPlan: ['professional', Validators.required],
      maxUsers: [50, [Validators.required, Validators.min(1), Validators.max(1000)]],
      maxBranches: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
      timezone: ['America/New_York', Validators.required],
      currency: ['USD', Validators.required],
      language: ['en', Validators.required],
      features: [['ai-diagnosis', 'ocr-scanning', 'realtime-queue']],
      branchAdminEmail: ['', Validators.email]
    });
  }

  ngOnInit(): void {
    // Auto-generate domain from clinic name
    this.clinicForm.get('name')?.valueChanges.subscribe(name => {
      if (name) {
        const domain = name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 30);
        this.clinicForm.get('domain')?.setValue(domain);
      }
    });
    
    // Update max users based on subscription plan
    this.clinicForm.get('subscriptionPlan')?.valueChanges.subscribe(plan => {
      switch (plan) {
        case 'basic':
          this.clinicForm.get('maxUsers')?.setValue(20);
          this.clinicForm.get('maxBranches')?.setValue(2);
          break;
        case 'professional':
          this.clinicForm.get('maxUsers')?.setValue(50);
          this.clinicForm.get('maxBranches')?.setValue(5);
          break;
        case 'enterprise':
          this.clinicForm.get('maxUsers')?.setValue(200);
          this.clinicForm.get('maxBranches')?.setValue(20);
          break;
      }
    });
  }

  onSubmit(): void {
    if (this.clinicForm.valid) {
      this.dialogRef.close(this.clinicForm.value);
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.clinicForm.controls).forEach(key => {
      const control = this.clinicForm.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(nestedKey => {
          control.get(nestedKey)?.markAsTouched();
        });
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.clinicForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field?.hasError('pattern')) {
      if (fieldName === 'domain') {
        return 'Domain can only contain lowercase letters, numbers, and hyphens';
      }
      if (fieldName === 'phone') {
        return 'Please enter a valid phone number';
      }
      if (fieldName === 'zipCode') {
        return 'Please enter a valid ZIP code';
      }
    }
    if (field?.hasError('minlength')) {
      return `${this.getFieldLabel(fieldName)} must be at least ${field.errors?.['minlength'].requiredLength} characters`;
    }
    if (field?.hasError('min')) {
      return `${this.getFieldLabel(fieldName)} must be at least ${field.errors?.['min'].min}`;
    }
    if (field?.hasError('max')) {
      return `${this.getFieldLabel(fieldName)} cannot exceed ${field.errors?.['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Clinic Name',
      domain: 'Domain',
      email: 'Email',
      phone: 'Phone',
      maxUsers: 'Max Users',
      maxBranches: 'Max Branches',
      branchAdminEmail: 'Branch Admin Email'
    };
    return labels[fieldName] || fieldName;
  }

  isFeatureSelected(feature: string): boolean {
    const features = this.clinicForm.get('features')?.value || [];
    return features.includes(feature);
  }

  toggleFeature(feature: string): void {
    const features = this.clinicForm.get('features')?.value || [];
    const index = features.indexOf(feature);
    
    if (index > -1) {
      features.splice(index, 1);
    } else {
      features.push(feature);
    }
    
    this.clinicForm.get('features')?.setValue(features);
  }
}