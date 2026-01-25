import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HrDashboardComponent } from './components/dashboard/hr-dashboard.component';
import { EmployeeManagementComponent } from './components/employee-management/employee-management.component';
import { AttendanceManagementComponent } from './components/attendance-management/attendance-management.component';
import { ShiftManagementComponent } from './components/shift-management/shift-management.component';
import { LeaveManagementComponent } from './components/leave-management/leave-management.component';
import { DocumentManagementComponent } from './components/document-management/document-management.component';
import { ReportsComponent } from './components/reports/reports.component';
import { ComplianceTrackingComponent } from './components/compliance-tracking/compliance-tracking.component';

const routes: Routes = [
  {
    path: '',
    component: HrDashboardComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: HrDashboardComponent },
      { path: 'employees', component: EmployeeManagementComponent },
      { path: 'attendance', component: AttendanceManagementComponent },
      { path: 'shifts', component: ShiftManagementComponent },
      { path: 'leave', component: LeaveManagementComponent },
      { path: 'documents', component: DocumentManagementComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'compliance', component: ComplianceTrackingComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HrRoutingModule { }