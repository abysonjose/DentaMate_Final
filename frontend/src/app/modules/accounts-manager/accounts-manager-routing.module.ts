import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountsManagerDashboardComponent } from './components/dashboard/accounts-manager-dashboard.component';
import { FinancialOverviewComponent } from './components/financial-overview/financial-overview.component';
import { RevenueMonitoringComponent } from './components/revenue-monitoring/revenue-monitoring.component';
import { BillingOversightComponent } from './components/billing-oversight/billing-oversight.component';
import { RefundManagementComponent } from './components/refund-management/refund-management.component';
import { ReceivablesControlComponent } from './components/receivables-control/receivables-control.component';
import { ExpenseOversightComponent } from './components/expense-oversight/expense-oversight.component';
import { AccountantSupervisionComponent } from './components/accountant-supervision/accountant-supervision.component';
import { FinancialReportsComponent } from './components/financial-reports/financial-reports.component';
import { AuditComplianceComponent } from './components/audit-compliance/audit-compliance.component';
import { PolicyConfigurationComponent } from './components/policy-configuration/policy-configuration.component';

const routes: Routes = [
  {
    path: '',
    component: AccountsManagerDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: FinancialOverviewComponent },
      { path: 'revenue', component: RevenueMonitoringComponent },
      { path: 'billing', component: BillingOversightComponent },
      { path: 'refunds', component: RefundManagementComponent },
      { path: 'receivables', component: ReceivablesControlComponent },
      { path: 'expenses', component: ExpenseOversightComponent },
      { path: 'supervision', component: AccountantSupervisionComponent },
      { path: 'reports', component: FinancialReportsComponent },
      { path: 'audit', component: AuditComplianceComponent },
      { path: 'policies', component: PolicyConfigurationComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountsManagerRoutingModule { }