import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BillingDashboardComponent } from './components/dashboard/billing-dashboard.component';
import { BillGenerationComponent } from './components/bill-generation/bill-generation.component';
import { InvoiceManagementComponent } from './components/invoice-management/invoice-management.component';
import { PaymentProcessingComponent } from './components/payment-processing/payment-processing.component';
import { PaymentStatusTrackingComponent } from './components/payment-status-tracking/payment-status-tracking.component';
import { PatientBillingHistoryComponent } from './components/patient-billing-history/patient-billing-history.component';
import { PharmacyCoordinationComponent } from './components/pharmacy-coordination/pharmacy-coordination.component';
import { BillingReportsComponent } from './components/billing-reports/billing-reports.component';

const routes: Routes = [
  {
    path: '',
    component: BillingDashboardComponent,
    data: { title: 'Billing Dashboard' }
  },
  {
    path: 'dashboard',
    component: BillingDashboardComponent,
    data: { title: 'Billing Dashboard' }
  },
  {
    path: 'bill-generation',
    component: BillGenerationComponent,
    data: { title: 'Bill Generation' }
  },
  {
    path: 'invoice-management',
    component: InvoiceManagementComponent,
    data: { title: 'Invoice Management' }
  },
  {
    path: 'payment-processing',
    component: PaymentProcessingComponent,
    data: { title: 'Payment Processing' }
  },
  {
    path: 'payment-tracking',
    component: PaymentStatusTrackingComponent,
    data: { title: 'Payment Status Tracking' }
  },
  {
    path: 'patient-history',
    component: PatientBillingHistoryComponent,
    data: { title: 'Patient Billing History' }
  },
  {
    path: 'pharmacy-coordination',
    component: PharmacyCoordinationComponent,
    data: { title: 'Pharmacy Coordination' }
  },
  {
    path: 'reports',
    component: BillingReportsComponent,
    data: { title: 'Billing Reports' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BillingStaffRoutingModule { }