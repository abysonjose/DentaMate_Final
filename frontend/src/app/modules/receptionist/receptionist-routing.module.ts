import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReceptionistDashboardComponent } from './components/dashboard/receptionist-dashboard.component';
import { AppointmentSchedulingComponent } from './components/appointment-scheduling/appointment-scheduling.component';

const routes: Routes = [
  {
    path: '',
    component: ReceptionistDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: ReceptionistDashboardComponent },
      { path: 'appointments', component: AppointmentSchedulingComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReceptionistRoutingModule { }