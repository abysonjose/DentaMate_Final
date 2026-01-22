import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CentralAdminDashboardComponent } from './components/dashboard/central-admin-dashboard.component';
import { ClinicManagementComponent } from './components/clinic-management/clinic-management.component';
import { BranchManagementComponent } from './components/branch-management/branch-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { SubscriptionManagementComponent } from './components/subscription-management/subscription-management.component';
import { AnalyticsOverviewComponent } from './components/analytics-overview/analytics-overview.component';
import { AiSystemMonitoringComponent } from './components/ai-system-monitoring/ai-system-monitoring.component';
import { FinancialAnalyticsComponent } from './components/financial-analytics/financial-analytics.component';
import { SystemConfigurationComponent } from './components/system-configuration/system-configuration.component';
import { AuditLogsComponent } from './components/audit-logs/audit-logs.component';
import { ReportsComponent } from './components/reports/reports.component';

const routes: Routes = [
  {
    path: '',
    component: CentralAdminDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: AnalyticsOverviewComponent },
      { path: 'clinics', component: ClinicManagementComponent },
      { path: 'branches', component: BranchManagementComponent },
      { path: 'users', component: UserManagementComponent },
      { path: 'subscriptions', component: SubscriptionManagementComponent },
      { path: 'ai-monitoring', component: AiSystemMonitoringComponent },
      { path: 'financial-analytics', component: FinancialAnalyticsComponent },
      { path: 'system-config', component: SystemConfigurationComponent },
      { path: 'audit-logs', component: AuditLogsComponent },
      { path: 'reports', component: ReportsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CentralAdminRoutingModule { }