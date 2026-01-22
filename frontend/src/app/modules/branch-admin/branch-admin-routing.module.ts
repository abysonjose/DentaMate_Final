import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BranchAdminDashboardComponent } from './components/dashboard/branch-admin-dashboard.component';
import { BranchOverviewComponent } from './components/branch-overview/branch-overview.component';
import { StaffManagementComponent } from './components/staff-management/staff-management.component';
import { DoctorSchedulingComponent } from './components/doctor-scheduling/doctor-scheduling.component';
import { AppointmentSupervisionComponent } from './components/appointment-supervision/appointment-supervision.component';
import { QueueMonitoringComponent } from './components/queue-monitoring/queue-monitoring.component';
import { PatientRecordsComponent } from './components/patient-records/patient-records.component';
import { BillingMonitoringComponent } from './components/billing-monitoring/billing-monitoring.component';
import { InventoryMonitoringComponent } from './components/inventory-monitoring/inventory-monitoring.component';
import { ReportsAnalyticsComponent } from './components/reports-analytics/reports-analytics.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { BranchSettingsComponent } from './components/branch-settings/branch-settings.component';
import { AuditLogsComponent } from './components/audit-logs/audit-logs.component';

const routes: Routes = [
  {
    path: '',
    component: BranchAdminDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: BranchOverviewComponent },
      { path: 'staff', component: StaffManagementComponent },
      { path: 'doctors', component: DoctorSchedulingComponent },
      { path: 'appointments', component: AppointmentSupervisionComponent },
      { path: 'queue', component: QueueMonitoringComponent },
      { path: 'patients', component: PatientRecordsComponent },
      { path: 'billing', component: BillingMonitoringComponent },
      { path: 'inventory', component: InventoryMonitoringComponent },
      { path: 'reports', component: ReportsAnalyticsComponent },
      { path: 'notifications', component: NotificationCenterComponent },
      { path: 'settings', component: BranchSettingsComponent },
      { path: 'audit', component: AuditLogsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BranchAdminRoutingModule { }