import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReceptionistDashboardComponent } from './components/dashboard/receptionist-dashboard.component';
import { PatientRegistrationComponent } from './components/patient-registration/patient-registration.component';
import { AppointmentManagementComponent } from './components/appointment-management/appointment-management.component';
import { CheckInComponent } from './components/check-in/check-in.component';
import { QueueMonitoringComponent } from './components/queue-monitoring/queue-monitoring.component';
import { WalkInHandlingComponent } from './components/walk-in-handling/walk-in-handling.component';

const routes: Routes = [
  {
    path: '',
    component: ReceptionistDashboardComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ReceptionistDashboardComponent },
      { path: 'patient-registration', component: PatientRegistrationComponent },
      { path: 'appointments', component: AppointmentManagementComponent },
      { path: 'check-in', component: CheckInComponent },
      { path: 'queue-monitoring', component: QueueMonitoringComponent },
      { path: 'walk-in', component: WalkInHandlingComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReceptionistRoutingModule { }