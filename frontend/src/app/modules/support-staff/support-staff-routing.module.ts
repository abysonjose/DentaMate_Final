import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupportStaffDashboardComponent } from './components/dashboard/support-staff-dashboard.component';
import { TaskManagementComponent } from './components/task-management/task-management.component';
import { RoomReadinessComponent } from './components/room-readiness/room-readiness.component';
import { PatientAssistanceComponent } from './components/patient-assistance/patient-assistance.component';
import { SafetySecurityComponent } from './components/safety-security/safety-security.component';
import { ActivityLogComponent } from './components/activity-log/activity-log.component';

const routes: Routes = [
  {
    path: '',
    component: SupportStaffDashboardComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: SupportStaffDashboardComponent },
      { path: 'tasks', component: TaskManagementComponent },
      { path: 'rooms', component: RoomReadinessComponent },
      { path: 'assistance', component: PatientAssistanceComponent },
      { path: 'security', component: SafetySecurityComponent },
      { path: 'activity', component: ActivityLogComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SupportStaffRoutingModule { }