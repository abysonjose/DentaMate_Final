import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NurseDashboardComponent } from './components/dashboard/nurse-dashboard.component';
import { ShiftOverviewComponent } from './components/shift-overview/shift-overview.component';
import { PatientPreparationComponent } from './components/patient-preparation/patient-preparation.component';
import { QueueAwarenessComponent } from './components/queue-awareness/queue-awareness.component';
import { ChairmateAssistanceComponent } from './components/chairmate-assistance/chairmate-assistance.component';
import { NursingNotesComponent } from './components/nursing-notes/nursing-notes.component';
import { MedicalRecordsViewComponent } from './components/medical-records-view/medical-records-view.component';
import { SupplyUsageComponent } from './components/supply-usage/supply-usage.component';
import { SterilizationChecklistComponent } from './components/sterilization-checklist/sterilization-checklist.component';
import { CommunicationCenterComponent } from './components/communication-center/communication-center.component';
import { ClinicalCommunicationComponent } from './components/clinical-communication/clinical-communication.component';

const routes: Routes = [
  {
    path: '',
    component: NurseDashboardComponent,
    children: [
      { path: '', redirectTo: 'shift-overview', pathMatch: 'full' },
      { path: 'shift-overview', component: ShiftOverviewComponent },
      { path: 'patient-preparation', component: PatientPreparationComponent },
      { path: 'queue-awareness', component: QueueAwarenessComponent },
      { path: 'chairmate-assistance', component: ChairmateAssistanceComponent },
      { path: 'nursing-notes', component: NursingNotesComponent },
      { path: 'medical-records', component: MedicalRecordsViewComponent },
      { path: 'supply-usage', component: SupplyUsageComponent },
      { path: 'sterilization', component: SterilizationChecklistComponent },
      { path: 'communication', component: CommunicationCenterComponent },
      { path: 'clinical-communication', component: ClinicalCommunicationComponent },
      { path: 'tasks', component: TaskAccountabilityComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NurseRoutingModule { }