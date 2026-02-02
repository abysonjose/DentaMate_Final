import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NurseDashboardComponent } from './components/dashboard/nurse-dashboard.component';
import { PatientCareComponent } from './components/patient-care/patient-care.component';

const routes: Routes = [
  {
    path: '',
    component: NurseDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: NurseDashboardComponent },
      { path: 'patient-care', component: PatientCareComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NurseRoutingModule { }