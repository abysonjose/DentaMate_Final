import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PayrollOfficerDashboardComponent } from './components/dashboard/payroll-officer-dashboard.component';
import { PayrollOverviewComponent } from './components/overview/payroll-overview.component';
import { PayrollCyclesComponent } from './components/payroll-cycles/payroll-cycles.component';
import { EmployeePayrollComponent } from './components/employee-payroll/employee-payroll.component';
import { SalaryStructuresComponent } from './components/salary-structures/salary-structures.component';
import { PayslipsComponent } from './components/payslips/payslips.component';
import { PayrollReportsComponent } from './components/reports/payroll-reports.component';
import { PayrollFinalizationComponent } from './components/finalization/payroll-finalization.component';
import { AttendanceIntegrationComponent } from './components/attendance-integration/attendance-integration.component';
import { DeductionsManagementComponent } from './components/deductions-management/deductions-management.component';

const routes: Routes = [
  {
    path: '',
    component: PayrollOfficerDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: PayrollOverviewComponent },
      { path: 'payroll-cycles', component: PayrollCyclesComponent },
      { path: 'employee-payroll', component: EmployeePayrollComponent },
      { path: 'salary-structures', component: SalaryStructuresComponent },
      { path: 'payslips', component: PayslipsComponent },
      { path: 'reports', component: PayrollReportsComponent },
      { path: 'finalization', component: PayrollFinalizationComponent },
      { path: 'attendance-integration', component: AttendanceIntegrationComponent },
      { path: 'deductions-management', component: DeductionsManagementComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PayrollOfficerRoutingModule { }