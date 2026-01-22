import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DoctorDashboardComponent } from './components/dashboard/doctor-dashboard.component';
import { AppointmentManagementComponent } from './components/appointment-management/appointment-management.component';
import { QueueControlComponent } from './components/queue-control/queue-control.component';
import { ConsultationWorkspaceComponent } from './components/consultation-workspace/consultation-workspace.component';
import { PatientProfileComponent } from './components/patient-profile/patient-profile.component';
import { PrescriptionManagementComponent } from './components/prescription-management/prescription-management.component';
import { AiDiagnosisComponent } from './components/ai-diagnosis/ai-diagnosis.component';
import { LabRequestsComponent } from './components/lab-requests/lab-requests.component';

const routes: Routes = [
  {
    path: '',
    component: DoctorDashboardComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DoctorDashboardComponent },
      { path: 'appointments', component: AppointmentManagementComponent },
      { path: 'queue', component: QueueControlComponent },
      { path: 'consultation/:patientId', component: ConsultationWorkspaceComponent },
      { path: 'patient/:patientId', component: PatientProfileComponent },
      { path: 'prescriptions', component: PrescriptionManagementComponent },
      { path: 'ai-diagnosis', component: AiDiagnosisComponent },
      { path: 'lab-requests', component: LabRequestsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DoctorRoutingModule { }