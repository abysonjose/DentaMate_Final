import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

import { SaasAdminDashboardComponent } from './components/dashboard/saas-admin-dashboard.component';
import { PlatformOverviewComponent } from './components/platform-overview/platform-overview.component';
import { LicenseManagementComponent } from './components/license-management/license-management.component';
import { SubscriptionPlansComponent } from './components/subscription-plans/subscription-plans.component';
import { TenantOnboardingComponent } from './components/tenant-onboarding/tenant-onboarding.component';
import { RevenueAnalyticsComponent } from './components/revenue-analytics/revenue-analytics.component';
import { SystemMonitoringComponent } from './components/system-monitoring/system-monitoring.component';
import { FeatureControlComponent } from './components/feature-control/feature-control.component';
import { AuditLogsComponent } from './components/audit-logs/audit-logs.component';
import { MaintenanceControlComponent } from './components/maintenance-control/maintenance-control.component';

const routes: Routes = [
  {
    path: '',
    component: SaasAdminDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['SAAS_ADMIN'] },
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      {
        path: 'overview',
        component: PlatformOverviewComponent,
        data: { title: 'Platform Overview' }
      },
      {
        path: 'licenses',
        component: LicenseManagementComponent,
        data: { title: 'License Management' }
      },
      {
        path: 'subscription-plans',
        component: SubscriptionPlansComponent,
        data: { title: 'Subscription Plans' }
      },
      {
        path: 'tenant-onboarding',
        component: TenantOnboardingComponent,
        data: { title: 'Tenant Onboarding' }
      },
      {
        path: 'revenue-analytics',
        component: RevenueAnalyticsComponent,
        data: { title: 'Revenue Analytics' }
      },
      {
        path: 'system-monitoring',
        component: SystemMonitoringComponent,
        data: { title: 'System Monitoring' }
      },
      {
        path: 'feature-control',
        component: FeatureControlComponent,
        data: { title: 'Feature Control' }
      },
      {
        path: 'audit-logs',
        component: AuditLogsComponent,
        data: { title: 'Audit Logs' }
      },
      {
        path: 'maintenance',
        component: MaintenanceControlComponent,
        data: { title: 'Maintenance Control' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SaasAdminRoutingModule { }