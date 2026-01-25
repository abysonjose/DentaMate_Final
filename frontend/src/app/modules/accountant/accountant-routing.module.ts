import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountantDashboardComponent } from './components/dashboard/accountant-dashboard.component';
import { BillingRecordsComponent } from './components/billing-records/billing-records.component';
import { PaymentVerificationComponent } from './components/payment-verification/payment-verification.component';
import { LedgerManagementComponent } from './components/ledger-management/ledger-management.component';
import { ReceivablesTrackingComponent } from './components/receivables-tracking/receivables-tracking.component';
import { ReportsComponent } from './components/reports/reports.component';
import { AuditSupportComponent } from './components/audit-support/audit-support.component';
import { TaxPreparationComponent } from './components/tax-preparation/tax-preparation.component';

const routes: Routes = [
  {
    path: '',
    component: AccountantDashboardComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AccountantDashboardComponent },
      { path: 'billing-records', component: BillingRecordsComponent },
      { path: 'payment-verification', component: PaymentVerificationComponent },
      { path: 'ledger-management', component: LedgerManagementComponent },
      { path: 'receivables-tracking', component: ReceivablesTrackingComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'audit-support', component: AuditSupportComponent },
      { path: 'tax-preparation', component: TaxPreparationComponent },
      { path: 'cashier-coordination', component: CashierCoordinationComponent },
      { path: 'billing-coordination', component: BillingCoordinationComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountantRoutingModule { }