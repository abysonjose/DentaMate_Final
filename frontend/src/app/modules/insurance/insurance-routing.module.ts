import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InsuranceDashboardComponent } from './components/dashboard/insurance-dashboard.component';
import { ClaimsOverviewComponent } from './components/claims-overview/claims-overview.component';
import { PatientInsuranceComponent } from './components/patient-insurance/patient-insurance.component';
import { ClaimSubmissionComponent } from './components/claim-submission/claim-submission.component';
import { ClaimTrackingComponent } from './components/claim-tracking/claim-tracking.component';
import { DocumentManagementComponent } from './components/document-management/document-management.component';
import { InsurerCommunicationComponent } from './components/insurer-communication/insurer-communication.component';
import { SettlementVerificationComponent } from './components/settlement-verification/settlement-verification.component';
import { ReportsAnalyticsComponent } from './components/reports-analytics/reports-analytics.component';

const routes: Routes = [
  {
    path: '',
    component: InsuranceDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: ClaimsOverviewComponent },
      { path: 'patient-insurance', component: PatientInsuranceComponent },
      { path: 'claim-submission', component: ClaimSubmissionComponent },
      { path: 'claim-tracking', component: ClaimTrackingComponent },
      { path: 'documents', component: DocumentManagementComponent },
      { path: 'communication', component: InsurerCommunicationComponent },
      { path: 'settlement', component: SettlementVerificationComponent },
      { path: 'reports', component: ReportsAnalyticsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InsuranceRoutingModule { }