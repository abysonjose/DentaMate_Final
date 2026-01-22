import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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

const routes: Routes = [
  {
    path: '',
    component: PatientDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: PatientDashboardComponent },
      { path: 'appointments', component: AppointmentManagementComponent },
      { path: 'queue-status', component: TokenQueueStatusComponent },
      { path: 'medical-records', component: MedicalRecordsComponent },
      { path: 'prescriptions', component: PrescriptionsComponent },
      { path: 'billing', component: BillingPaymentsComponent },
      { path: 'profile', component: ProfileManagementComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'follow-ups', component: FollowUpsComponent },
      { path: 'support', component: SupportHelpComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PatientRoutingModule { }