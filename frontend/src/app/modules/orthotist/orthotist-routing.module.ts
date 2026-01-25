import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrthotistDashboardComponent } from './components/dashboard/orthotist-dashboard.component';
import { CaseManagementComponent } from './components/case-management/case-management.component';
import { MeasurementReviewComponent } from './components/measurement-review/measurement-review.component';
import { FabricationTrackingComponent } from './components/fabrication-tracking/fabrication-tracking.component';
import { DeliveryManagementComponent } from './components/delivery-management/delivery-management.component';
import { CaseHistoryComponent } from './components/case-history/case-history.component';
import { CommunicationCenterComponent } from './components/communication-center/communication-center.component';
import { QualityComplianceComponent } from './components/quality-compliance/quality-compliance.component';

const routes: Routes = [
  {
    path: '',
    component: OrthotistDashboardComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: OrthotistDashboardComponent },
      { path: 'cases', component: CaseManagementComponent },
      { path: 'measurements', component: MeasurementReviewComponent },
      { path: 'fabrication', component: FabricationTrackingComponent },
      { path: 'delivery', component: DeliveryManagementComponent },
      { path: 'history', component: CaseHistoryComponent },
      { path: 'communication', component: CommunicationCenterComponent },
      { path: 'quality', component: QualityComplianceComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrthotistRoutingModule { }