import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LabStaffDashboardComponent } from './components/dashboard/lab-staff-dashboard.component';
import { DiagnosticRequestsComponent } from './components/diagnostic-requests/diagnostic-requests.component';
import { ReportUploadComponent } from './components/report-upload/report-upload.component';
import { DiagnosticHistoryComponent } from './components/diagnostic-history/diagnostic-history.component';
import { ComplianceAuditComponent } from './components/compliance-audit/compliance-audit.component';

const routes: Routes = [
  {
    path: '',
    component: LabStaffDashboardComponent,
    children: [
      { path: '', redirectTo: 'worklist', pathMatch: 'full' },
      { path: 'worklist', component: DiagnosticRequestsComponent },
      { path: 'upload', component: ReportUploadComponent },
      { path: 'history', component: DiagnosticHistoryComponent },
      { path: 'compliance', component: ComplianceAuditComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LabStaffRoutingModule { }