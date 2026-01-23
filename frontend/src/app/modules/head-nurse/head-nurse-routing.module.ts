import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HeadNurseDashboardComponent } from './components/dashboard/head-nurse-dashboard.component';
import { NursingStaffManagementComponent } from './components/nursing-staff-management/nursing-staff-management.component';
import { PatientFlowMonitoringComponent } from './components/patient-flow-monitoring/patient-flow-monitoring.component';
import { TreatmentAssistanceComponent } from './components/treatment-assistance/treatment-assistance.component';
import { InventoryMonitoringComponent } from './components/inventory-monitoring/inventory-monitoring.component';
import { ComplianceTrackingComponent } from './components/compliance-tracking/compliance-tracking.component';
import { CommunicationCenterComponent } from './components/communication-center/communication-center.component';
import { ReportsAnalyticsComponent } from './components/reports-analytics/reports-analytics.component';

const routes: Routes = [
  {
    path: '',
    component: HeadNurseDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: HeadNurseDashboardComponent },
      { path: 'nursing-staff', component: NursingStaffManagementComponent },
      { path: 'patient-flow', component: PatientFlowMonitoringComponent },
      { path: 'treatment-assistance', component: TreatmentAssistanceComponent },
      { path: 'inventory', component: InventoryMonitoringComponent },
      { path: 'compliance', component: ComplianceTrackingComponent },
      { path: 'communication', component: CommunicationCenterComponent },
      { path: 'reports', component: ReportsAnalyticsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HeadNurseRoutingModule { }