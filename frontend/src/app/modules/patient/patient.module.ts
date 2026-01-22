import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PatientRoutingModule } from './patient-routing.module';
import { PatientDashboardComponent } from './components/dashboard/patient-dashboard.component';
import { AppointmentManagementComponent } from './components/appointment-management/appointment-management.component';
import { TokenQueueStatusComponent } from './components/token-queue-status/token-queue-status.component';
import { MedicalRecordsComponent } from './components/medical-records/medical-records.component';
import { PrescriptionsComponent } from './components/prescriptions/prescriptions.component';
import { BillingPaymentsComponent } from './components/billing-payments/billing-payments.component';
import { ProfileManagementComponent } from './components/profile-management/profile-management.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { FollowUpsComponent } from './components/follow-ups/follow-ups.component';
import { SupportHelpComponent } from './components/support-help/support-help.component';

// Dialogs
import { BookAppointmentDialogComponent } from './dialogs/book-appointment-dialog/book-appointment-dialog.component';
import { RescheduleAppointmentDialogComponent } from './dialogs/reschedule-appointment-dialog/reschedule-appointment-dialog.component';
import { PaymentDialogComponent } from './dialogs/payment-dialog/payment-dialog.component';

@NgModule({
  declarations: [
    PatientDashboardComponent,
    AppointmentManagementComponent,
    TokenQueueStatusComponent,
    MedicalRecordsComponent,
    PrescriptionsComponent,
    BillingPaymentsComponent,
    ProfileManagementComponent,
    NotificationsComponent,
    FollowUpsComponent,
    SupportHelpComponent,
    BookAppointmentDialogComponent,
    RescheduleAppointmentDialogComponent,
    PaymentDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    PatientRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatListModule,
    MatDividerModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatTooltipModule
  ]
})
export class PatientModule { }