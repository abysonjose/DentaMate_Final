import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { PatientService, PatientProfile } from '../../services/patient.service';

@Component({
  selector: 'app-profile-management',
  template: `
    <div class="profile-management">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>My Profile</h1>
          <p class="subtitle">Manage your personal information</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading your profile...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading" class="profile-content">
        
        <!-- Profile Form -->
        <mat-card class="profile-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>person</mat-icon>
            <mat-card-title>Personal Information</mat-card-title>
            <mat-card-subtitle>Update your personal details</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <form [formGroup]="profileForm" class="profile-form">
              
              <!-- Patient ID (Read-only) -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Patient ID</mat-label>
                <input matInput [value]="profile?.patientId" readonly>
                <mat-icon matSuffix>badge</mat-icon>
              </mat-form-field>

              <!-- Name -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter your full name">
                <mat-icon matSuffix>person</mat-icon>
                <mat-error *ngIf="profileForm.get('name')?.hasError('required')">
                  Name is required
                </mat-error>
              </mat-form-field>

              <!-- Email -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email Address</mat-label>
                <input matInput formControlName="email" type="email" placeholder="Enter your email">
                <mat-icon matSuffix>email</mat-icon>
                <mat-error *ngIf="profileForm.get('email')?.hasError('required')">
                  Email is required
                </mat-error>
                <mat-error *ngIf="profileForm.get('email')?.hasError('email')">
                  Please enter a valid email
                </mat-error>
              </mat-form-field>

              <!-- Phone -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Phone Number</mat-label>
                <input matInput formControlName="phone" placeholder="Enter your phone number">
                <mat-icon matSuffix>phone</mat-icon>
                <mat-error *ngIf="profileForm.get('phone')?.hasError('required')">
                  Phone number is required
                </mat-error>
                <mat-error *ngIf="profileForm.get('phone')?.hasError('pattern')">
                  Please enter a valid phone number
                </mat-error>
              </mat-form-field>

              <!-- Date of Birth -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Date of Birth</mat-label>
                <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" [max]="maxDate">
                <mat-datepicker-toggle matSuffix [for]="dobPicker"></mat-datepicker-toggle>
                <mat-datepicker #dobPicker></mat-datepicker>
                <mat-error *ngIf="profileForm.get('dateOfBirth')?.hasError('required')">
                  Date of birth is required
                </mat-error>
              </mat-form-field>

              <!-- Address -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Address</mat-label>
                <textarea matInput formControlName="address" rows="3" placeholder="Enter your complete address"></textarea>
                <mat-icon matSuffix>location_on</mat-icon>
                <mat-error *ngIf="profileForm.get('address')?.hasError('required')">
                  Address is required
                </mat-error>
              </mat-form-field>

            </form>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-button (click)="resetForm()" [disabled]="!profileForm.dirty">
              <mat-icon>refresh</mat-icon>
              Reset
            </button>
            <button mat-raised-button color="primary" 
                    (click)="saveProfile()" 
                    [disabled]="profileForm.invalid || saving">
              <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
              <mat-icon *ngIf="!saving">save</mat-icon>
              <span *ngIf="!saving">Save Changes</span>
              <span *ngIf="saving">Saving...</span>
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Emergency Contact -->
        <mat-card class="emergency-contact-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">emergency</mat-icon>
            <mat-card-title>Emergency Contact</mat-card-title>
            <mat-card-subtitle>Person to contact in case of emergency</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <form [formGroup]="emergencyForm" class="emergency-form">
              
              <!-- Emergency Contact Name -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Contact Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter contact person's name">
                <mat-icon matSuffix>person</mat-icon>
                <mat-error *ngIf="emergencyForm.get('name')?.hasError('required')">
                  Contact name is required
                </mat-error>
              </mat-form-field>

              <!-- Emergency Contact Phone -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Contact Phone</mat-label>
                <input matInput formControlName="phone" placeholder="Enter contact person's phone">
                <mat-icon matSuffix>phone</mat-icon>
                <mat-error *ngIf="emergencyForm.get('phone')?.hasError('required')">
                  Contact phone is required
                </mat-error>
                <mat-error *ngIf="emergencyForm.get('phone')?.hasError('pattern')">
                  Please enter a valid phone number
                </mat-error>
              </mat-form-field>

              <!-- Relationship -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Relationship</mat-label>
                <mat-select formControlName="relationship">
                  <mat-option value="SPOUSE">Spouse</mat-option>
                  <mat-option value="PARENT">Parent</mat-option>
                  <mat-option value="CHILD">Child</mat-option>
                  <mat-option value="SIBLING">Sibling</mat-option>
                  <mat-option value="FRIEND">Friend</mat-option>
                  <mat-option value="OTHER">Other</mat-option>
                </mat-select>
                <mat-icon matSuffix>family_restroom</mat-icon>
                <mat-error *ngIf="emergencyForm.get('relationship')?.hasError('required')">
                  Relationship is required
                </mat-error>
              </mat-form-field>

            </form>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-button (click)="resetEmergencyForm()" [disabled]="!emergencyForm.dirty">
              <mat-icon>refresh</mat-icon>
              Reset
            </button>
            <button mat-raised-button color="accent" 
                    (click)="saveEmergencyContact()" 
                    [disabled]="emergencyForm.invalid || savingEmergency">
              <mat-spinner *ngIf="savingEmergency" diameter="20"></mat-spinner>
              <mat-icon *ngIf="!savingEmergency">save</mat-icon>
              <span *ngIf="!savingEmergency">Save Emergency Contact</span>
              <span *ngIf="savingEmergency">Saving...</span>
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Account Information -->
        <mat-card class="account-info-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">info</mat-icon>
            <mat-card-title>Account Information</mat-card-title>
            <mat-card-subtitle>Read-only account details</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="account-info" *ngIf="profile">
              <div class="info-row">
                <span class="label">Registration Date:</span>
                <span class="value">{{formatDate(profile.registrationDate)}}</span>
              </div>
              <div class="info-row">
                <span class="label">Patient ID:</span>
                <span class="value">{{profile.patientId}}</span>
              </div>
              <div class="info-row">
                <span class="label">Account Status:</span>
                <mat-chip color="primary" selected>Active</mat-chip>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Privacy Settings -->
        <mat-card class="privacy-settings-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">privacy_tip</mat-icon>
            <mat-card-title>Privacy & Consent</mat-card-title>
            <mat-card-subtitle>Manage your privacy preferences</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="privacy-options">
              <mat-checkbox [(ngModel)]="privacySettings.allowSmsNotifications">
                Allow SMS notifications for appointments and reminders
              </mat-checkbox>
              
              <mat-checkbox [(ngModel)]="privacySettings.allowEmailNotifications">
                Allow email notifications for health updates and promotions
              </mat-checkbox>
              
              <mat-checkbox [(ngModel)]="privacySettings.shareDataForResearch">
                Allow anonymized data sharing for medical research (optional)
              </mat-checkbox>
              
              <mat-checkbox [(ngModel)]="privacySettings.allowDataExport">
                Allow data export for personal health records
              </mat-checkbox>
            </div>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-raised-button color="accent" (click)="savePrivacySettings()">
              <mat-icon>save</mat-icon>
              Save Privacy Settings
            </button>
          </mat-card-actions>
        </mat-card>

      </div>
    </div>
  `,
  styleUrls: ['./profile-management.component.scss']
})
export class ProfileManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  saving = false;
  savingEmergency = false;
  profile: PatientProfile | null = null;
  profileForm: FormGroup;
  emergencyForm: FormGroup;
  maxDate = new Date();
  
  privacySettings = {
    allowSmsNotifications: true,
    allowEmailNotifications: true,
    shareDataForResearch: false,
    allowDataExport: true
  };

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      dateOfBirth: ['', Validators.required],
      address: ['', Validators.required]
    });

    this.emergencyForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      relationship: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProfile(): void {
    this.loading = true;
    
    this.patientService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.populateForm();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          this.snackBar.open('Error loading profile', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private populateForm(): void {
    if (!this.profile) return;

    this.profileForm.patchValue({
      name: this.profile.name,
      email: this.profile.email,
      phone: this.profile.phone,
      dateOfBirth: new Date(this.profile.dateOfBirth),
      address: this.profile.address
    });

    if (this.profile.emergencyContact) {
      this.emergencyForm.patchValue({
        name: this.profile.emergencyContact.name,
        phone: this.profile.emergencyContact.phone,
        relationship: this.profile.emergencyContact.relationship
      });
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;

    this.saving = true;
    const formValue = this.profileForm.value;
    
    const profileData = {
      ...formValue,
      dateOfBirth: formValue.dateOfBirth.toISOString().split('T')[0]
    };

    this.patientService.updateProfile(profileData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProfile) => {
          this.profile = updatedProfile;
          this.saving = false;
          this.profileForm.markAsPristine();
          this.snackBar.open('Profile updated successfully!', 'Close', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.saving = false;
          this.snackBar.open('Error updating profile. Please try again.', 'Close', { duration: 3000 });
        }
      });
  }

  saveEmergencyContact(): void {
    if (this.emergencyForm.invalid) return;

    this.savingEmergency = true;
    const emergencyContactData = {
      emergencyContact: this.emergencyForm.value
    };

    this.patientService.updateProfile(emergencyContactData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProfile) => {
          this.profile = updatedProfile;
          this.savingEmergency = false;
          this.emergencyForm.markAsPristine();
          this.snackBar.open('Emergency contact updated successfully!', 'Close', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Error updating emergency contact:', error);
          this.savingEmergency = false;
          this.snackBar.open('Error updating emergency contact. Please try again.', 'Close', { duration: 3000 });
        }
      });
  }

  savePrivacySettings(): void {
    // In a real app, this would call an API to save privacy settings
    this.snackBar.open('Privacy settings saved successfully!', 'Close', { 
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  resetForm(): void {
    this.populateForm();
    this.profileForm.markAsPristine();
  }

  resetEmergencyForm(): void {
    if (this.profile?.emergencyContact) {
      this.emergencyForm.patchValue({
        name: this.profile.emergencyContact.name,
        phone: this.profile.emergencyContact.phone,
        relationship: this.profile.emergencyContact.relationship
      });
    } else {
      this.emergencyForm.reset();
    }
    this.emergencyForm.markAsPristine();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}