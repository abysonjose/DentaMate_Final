import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LabStaffDashboardComponent } from './components/dashboard/lab-staff-dashboard.component';
import { TestManagementComponent } from './components/test-management/test-management.component';

const routes: Routes = [
  {
    path: '',
    component: LabStaffDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: LabStaffDashboardComponent },
      { path: 'tests', component: TestManagementComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LabStaffRoutingModule { }